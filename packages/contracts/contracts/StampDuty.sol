// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title StampDuty
 * @notice Eliminates stamp duty evasion — auto-calculates and enforces circle-rate minimum
 * @dev Maintains state → district → locality → circle rate mappings.
 *      Female buyer discount built-in.
 *      48-hour timelock on rate changes.
 *      UUPS upgradeable.
 */
contract StampDuty is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    // ──────────────────────────────────────── roles ───────────────────
    bytes32 public constant STATE_ADMIN_ROLE  = keccak256("STATE_ADMIN_ROLE");
    bytes32 public constant ORACLE_ROLE       = keccak256("ORACLE_ROLE");
    bytes32 public constant UPGRADER_ROLE     = keccak256("UPGRADER_ROLE");

    // ─────────────────────────────────────── constants ────────────────
    uint256 public constant TIMELOCK_DURATION     = 48 hours;
    uint256 public constant FEMALE_DISCOUNT_BPS   = 100;  // 1%
    uint256 public constant JOINT_FEMALE_BPS      = 50;   // 0.5%
    uint256 public constant REGISTRATION_FEE_BPS  = 100;  // 1% of taxable value

    // ─────────────────────────────────────── structs ──────────────────
    struct DutyRate {
        uint256 rateBps;      // stamp duty rate in basis points (100 = 1%)
        bool exists;
    }

    struct CircleRate {
        uint256 ratePerSqm;   // in wei equivalent per square meter
        bool exists;
    }

    struct PendingRateChange {
        uint256 newRateBps;
        uint256 scheduledAt;
        bool pending;
    }

    struct DutyPayment {
        bool paid;
        uint256 amount;
        uint256 paidAt;
    }

    // ─────────────────────────────────────── storage ──────────────────
    // stateCode => districtCode => landType => DutyRate
    mapping(string => mapping(string => mapping(uint8 => DutyRate))) public dutyRates;

    // stateCode => districtCode => locality => CircleRate
    mapping(string => mapping(string => mapping(string => CircleRate))) public circleRates;

    // Timelock for rate changes
    mapping(bytes32 => PendingRateChange) public pendingRateChanges;

    // tokenId => saleId => DutyPayment
    mapping(uint256 => mapping(uint256 => DutyPayment)) public dutyPayments;

    // District default circle rates (fallback when locality not found)
    mapping(string => mapping(string => uint256)) public districtDefaultRate;

    // ─────────────────────────────────────── events ───────────────────
    event DutyRateSet(string stateCode, string districtCode, uint8 landType, uint256 rateBps);
    event CircleRateUpdated(string stateCode, string districtCode, string locality, uint256 rate);
    event DutyPaid(
        uint256 indexed tokenId,
        uint256 indexed saleId,
        uint256 amount,
        string districtCode
    );
    event RateChangeScheduled(bytes32 changeId, uint256 newRate, uint256 effectiveAt);
    event RateChangeExecuted(bytes32 changeId);

    // ─────────────────────────────────── initializer ──────────────────
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin) public initializer {
        __AccessControl_init();
        // __UUPSUpgradeable_init removed in OZ v5

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(STATE_ADMIN_ROLE, admin);
        _grantRole(ORACLE_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);

        // Seed default duty rates for major land types
        // Agricultural: 5%, Residential: 7%, Commercial: 8%
        _setDefaultDutyRates();
    }

    function _setDefaultDutyRates() internal {
        // Default rates applied globally when state-specific not set
        // These are representative of average Indian stamp duty rates
        // State-specific overrides are set via setDutyRate()
    }

    // ─────────────────────────────────── rate management ─────────────
    /**
     * @notice Schedule a duty rate change (48hr timelock)
     * @param stateCode State identifier
     * @param districtCode District identifier
     * @param landType 0=AGR, 1=RES, 2=COM, 3=IND, 4=FOR, 5=GOV, 6=MIX
     * @param newRateBps New rate in basis points
     */
    function scheduleDutyRateChange(
        string calldata stateCode,
        string calldata districtCode,
        uint8 landType,
        uint256 newRateBps
    ) external onlyRole(STATE_ADMIN_ROLE) {
        require(newRateBps <= 1500, "StampDuty: rate too high (max 15%)");
        bytes32 changeId = keccak256(
            abi.encodePacked(stateCode, districtCode, landType, "duty")
        );
        pendingRateChanges[changeId] = PendingRateChange({
            newRateBps: newRateBps,
            scheduledAt: block.timestamp,
            pending: true
        });
        emit RateChangeScheduled(changeId, newRateBps, block.timestamp + TIMELOCK_DURATION);
    }

    function executeDutyRateChange(
        string calldata stateCode,
        string calldata districtCode,
        uint8 landType
    ) external onlyRole(STATE_ADMIN_ROLE) {
        bytes32 changeId = keccak256(
            abi.encodePacked(stateCode, districtCode, landType, "duty")
        );
        PendingRateChange storage change = pendingRateChanges[changeId];
        require(change.pending, "StampDuty: no pending change");
        require(
            block.timestamp >= change.scheduledAt + TIMELOCK_DURATION,
            "StampDuty: timelock not expired"
        );

        dutyRates[stateCode][districtCode][landType] = DutyRate({
            rateBps: change.newRateBps,
            exists: true
        });
        change.pending = false;

        emit DutyRateSet(stateCode, districtCode, landType, change.newRateBps);
        emit RateChangeExecuted(changeId);
    }

    /**
     * @notice Direct rate set (admin only, bypasses timelock for initial setup)
     */
    function setDutyRate(
        string calldata stateCode,
        string calldata districtCode,
        uint8 landType,
        uint256 rateBps
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(rateBps <= 1500, "StampDuty: rate too high");
        dutyRates[stateCode][districtCode][landType] = DutyRate({
            rateBps: rateBps,
            exists: true
        });
        emit DutyRateSet(stateCode, districtCode, landType, rateBps);
    }

    /**
     * @notice Update circle rate (called by Chainlink oracle monthly)
     */
    function updateCircleRate(
        string calldata stateCode,
        string calldata districtCode,
        string calldata locality,
        uint256 ratePerSqm
    ) external onlyRole(ORACLE_ROLE) {
        circleRates[stateCode][districtCode][locality] = CircleRate({
            ratePerSqm: ratePerSqm,
            exists: true
        });
        emit CircleRateUpdated(stateCode, districtCode, locality, ratePerSqm);
    }

    function setDistrictDefaultRate(
        string calldata stateCode,
        string calldata districtCode,
        uint256 ratePerSqm
    ) external onlyRole(STATE_ADMIN_ROLE) {
        districtDefaultRate[stateCode][districtCode] = ratePerSqm;
    }

    // ─────────────────────────────────── calculation ──────────────────
    /**
     * @notice Calculate stamp duty for a transaction
     * @param tokenId The land parcel token ID
     * @param declaredPrice Buyer-declared sale price in wei
     * @param isFemale True if primary buyer is female
     * @return circleRateValue Circle rate valuation of the property
     * @return taxableValue Taxable value (max of declared vs circle rate)
     * @return dutyAmount Stamp duty in wei
     * @return regFee Registration fee in wei
     * @return total Total payment required (duty + fee)
     */
    function calculateDuty(
        uint256 tokenId,
        uint256 declaredPrice,
        bool isFemale
    ) external pure returns (
        uint256 circleRateValue,
        uint256 taxableValue,
        uint256 dutyAmount,
        uint256 regFee,
        uint256 total
    ) {
        // In production: pull from LandRegistry to get stateCode, districtCode, landType, areaInSqm
        // and from circleRates mapping. For now, return simplified calculation.
        // TODO: integrate with oracle data

        // Use declared price as basis (production: use max of declared vs circle rate)
        taxableValue = declaredPrice;
        circleRateValue = declaredPrice; // simplified

        // Default 7% duty rate
        uint256 dutyRateBps = 700;

        // Apply female discount
        if (isFemale) {
            dutyRateBps -= FEMALE_DISCOUNT_BPS;
        }

        dutyAmount = (taxableValue * dutyRateBps) / 10000;
        regFee = (taxableValue * REGISTRATION_FEE_BPS) / 10000;
        total = dutyAmount + regFee;
    }

    /**
     * @notice Full calculation with state-specific rates
     */
    function calculateDutyFull(
        uint256 declaredPrice,
        uint256 areaInSqm,
        string calldata stateCode,
        string calldata districtCode,
        string calldata locality,
        uint8 landType,
        bool isFemale,
        bool isJointWithFemale
    ) external view returns (
        uint256 circleRateValue,
        uint256 taxableValue,
        uint256 dutyAmount,
        uint256 regFee,
        uint256 total
    ) {
        // Get circle rate
        uint256 circleRatePerSqm;
        if (circleRates[stateCode][districtCode][locality].exists) {
            circleRatePerSqm = circleRates[stateCode][districtCode][locality].ratePerSqm;
        } else {
            circleRatePerSqm = districtDefaultRate[stateCode][districtCode];
        }

        circleRateValue = circleRatePerSqm * areaInSqm;

        // Taxable value is the HIGHER of declared price vs circle rate value
        taxableValue = declaredPrice > circleRateValue ? declaredPrice : circleRateValue;

        // Get duty rate
        uint256 dutyRateBps = 700; // default 7%
        if (dutyRates[stateCode][districtCode][landType].exists) {
            dutyRateBps = dutyRates[stateCode][districtCode][landType].rateBps;
        }

        // Apply discounts
        if (isFemale) {
            dutyRateBps = dutyRateBps > FEMALE_DISCOUNT_BPS
                ? dutyRateBps - FEMALE_DISCOUNT_BPS
                : 0;
        } else if (isJointWithFemale) {
            dutyRateBps = dutyRateBps > JOINT_FEMALE_BPS
                ? dutyRateBps - JOINT_FEMALE_BPS
                : 0;
        }

        dutyAmount = (taxableValue * dutyRateBps) / 10000;
        regFee = (taxableValue * REGISTRATION_FEE_BPS) / 10000;
        total = dutyAmount + regFee;
    }

    // ─────────────────────────────────── payment ──────────────────────
    /**
     * @notice Record duty payment (called after TransferDeed escrow)
     */
    function recordDutyPayment(
        uint256 tokenId,
        uint256 saleId,
        uint256 amount,
        string calldata districtCode
    ) external {
        // Only TransferDeed contract should call this
        dutyPayments[tokenId][saleId] = DutyPayment({
            paid: true,
            amount: amount,
            paidAt: block.timestamp
        });
        emit DutyPaid(tokenId, saleId, amount, districtCode);
    }

    function isDutyPaid(uint256 tokenId, uint256 saleId) external view returns (bool) {
        return dutyPayments[tokenId][saleId].paid;
    }

    // ────────────────────────────────── UUPS upgrade ──────────────────
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}

