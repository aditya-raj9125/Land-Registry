// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./utils/ReentrancyGuardUpgradeable.sol";

interface ILandRegistryFreeze {
    function freezeParcel(uint256 tokenId, string calldata reason) external;
    function unfreezeParcel(uint256 tokenId, string calldata reason) external;
}

/**
 * @title DisputeOracle
 * @notice Guardian contract — prevents any sale or transfer on disputed land
 * @dev Maintains dispute registry with court-level escalation.
 *      Integrates with e-Courts NIC API via Chainlink Functions.
 *      Civil society reporting with stake mechanism.
 *      UUPS upgradeable.
 */
contract DisputeOracle is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    // ──────────────────────────────────────── roles ───────────────────
    bytes32 public constant COURT_ROLE    = keccak256("COURT_ROLE");
    bytes32 public constant ORACLE_ROLE   = keccak256("ORACLE_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant REVIEWER_ROLE = keccak256("REVIEWER_ROLE");

    // ─────────────────────────────────────── enums ────────────────────
    enum CourtLevel { DISTRICT, HIGH, SUPREME }
    enum DisputeStatus { FILED, HEARING, RESOLVED, DISMISSED }
    enum ReportStatus { PENDING_REVIEW, CLEARED, ESCALATED, SLASHED }

    // ─────────────────────────────────────── structs ──────────────────
    struct Dispute {
        uint256 disputeId;
        uint256 tokenId;
        string caseNumber;
        string courtName;
        string plaintiff;
        uint256 filingDate;
        DisputeStatus status;
        CourtLevel courtLevel;
        string ipfsOrderHash;     // court order document
        string outcome;
        uint256 resolutionDate;
        address registeredBy;
    }

    struct SuspectedReport {
        uint256 reportId;
        uint256 tokenId;
        address reporter;
        string details;
        uint256 stake;            // ETH stake from reporter
        uint256 reportedAt;
        ReportStatus status;
        string reviewNotes;
    }

    // ─────────────────────────────────────── storage ──────────────────
    uint256 private _disputeIdCounter;
    uint256 private _reportIdCounter;

    address public landRegistryContract;

    // Minimum stake to report (0.001 ETH)
    uint256 public minReportStake;

    // tokenId => array of dispute IDs
    mapping(uint256 => uint256[]) private _tokenDisputes;

    // disputeId => Dispute
    mapping(uint256 => Dispute) public disputes;

    // tokenId => is currently disputed
    mapping(uint256 => bool) public isDisputedMap;

    // reportId => SuspectedReport
    mapping(uint256 => SuspectedReport) public reports;

    // tokenId => active dispute count
    mapping(uint256 => uint256) public activeDisputeCount;

    // ─────────────────────────────────────── events ───────────────────
    event DisputeRegistered(
        uint256 indexed disputeId,
        uint256 indexed tokenId,
        string caseNumber,
        string courtName,
        CourtLevel courtLevel
    );
    event DisputeResolved(
        uint256 indexed disputeId,
        uint256 indexed tokenId,
        DisputeStatus status,
        string outcome
    );
    event DisputeEscalated(
        uint256 indexed disputeId,
        CourtLevel newLevel
    );
    event SuspectedDisputeReported(
        uint256 indexed reportId,
        uint256 indexed tokenId,
        address reporter,
        uint256 stake
    );
    event ReportReviewed(
        uint256 indexed reportId,
        ReportStatus status,
        string notes
    );
    event StakeSlashed(uint256 indexed reportId, address reporter, uint256 amount);

    // ─────────────────────────────────── initializer ──────────────────
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address admin,
        address _landRegistry
    ) public initializer {
        __AccessControl_init();
        // __UUPSUpgradeable_init removed in OZ v5
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COURT_ROLE, admin);
        _grantRole(ORACLE_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(REVIEWER_ROLE, admin);

        landRegistryContract = _landRegistry;
        minReportStake = 0.001 ether;
    }

    // ─────────────────────────────── register dispute ─────────────────
    /**
     * @notice Register a new dispute and freeze the parcel
     * @dev Only COURT_ROLE can call. Immediately freezes parcel.
     */
    function registerDispute(
        uint256 tokenId,
        string calldata caseNumber,
        string calldata courtName,
        string calldata plaintiff,
        uint256 filingDate,
        CourtLevel courtLevel
    ) external onlyRole(COURT_ROLE) returns (uint256) {
        require(tokenId > 0, "DisputeOracle: invalid token");

        _disputeIdCounter++;
        uint256 disputeId = _disputeIdCounter;

        disputes[disputeId] = Dispute({
            disputeId: disputeId,
            tokenId: tokenId,
            caseNumber: caseNumber,
            courtName: courtName,
            plaintiff: plaintiff,
            filingDate: filingDate,
            status: DisputeStatus.FILED,
            courtLevel: courtLevel,
            ipfsOrderHash: "",
            outcome: "",
            resolutionDate: 0,
            registeredBy: msg.sender
        });

        _tokenDisputes[tokenId].push(disputeId);
        isDisputedMap[tokenId] = true;
        activeDisputeCount[tokenId]++;

        // Freeze the parcel immediately
        ILandRegistryFreeze(landRegistryContract).freezeParcel(
            tokenId,
            string(abi.encodePacked("Court case: ", caseNumber, " at ", courtName))
        );

        emit DisputeRegistered(disputeId, tokenId, caseNumber, courtName, courtLevel);
        return disputeId;
    }

    // ─────────────────────────────── resolve dispute ──────────────────
    /**
     * @notice Resolve a dispute based on court order
     * @param disputeId The dispute to resolve
     * @param status RESOLVED or DISMISSED
     * @param outcome Description of outcome
     * @param ipfsOrderHash IPFS hash of the court order document
     * @param unfreezeParcel Whether to unfreeze the parcel
     */
    function resolveDispute(
        uint256 disputeId,
        DisputeStatus status,
        string calldata outcome,
        string calldata ipfsOrderHash,
        bool unfreezeParcel
    ) external onlyRole(COURT_ROLE) {
        Dispute storage dispute = disputes[disputeId];
        require(dispute.disputeId == disputeId, "DisputeOracle: dispute not found");
        require(
            dispute.status == DisputeStatus.FILED || dispute.status == DisputeStatus.HEARING,
            "DisputeOracle: already resolved"
        );
        require(
            status == DisputeStatus.RESOLVED || status == DisputeStatus.DISMISSED,
            "DisputeOracle: invalid resolution status"
        );

        dispute.status = status;
        dispute.outcome = outcome;
        dispute.ipfsOrderHash = ipfsOrderHash;
        dispute.resolutionDate = block.timestamp;

        if (activeDisputeCount[dispute.tokenId] > 0) {
            activeDisputeCount[dispute.tokenId]--;
        }

        // Only unfreeze if no other active disputes
        if (unfreezeParcel && activeDisputeCount[dispute.tokenId] == 0) {
            isDisputedMap[dispute.tokenId] = false;
            ILandRegistryFreeze(landRegistryContract).unfreezeParcel(
                dispute.tokenId,
                string(abi.encodePacked("Case ", dispute.caseNumber, " resolved: ", outcome))
            );
        }

        emit DisputeResolved(disputeId, dispute.tokenId, status, outcome);
    }

    /**
     * @notice Escalate dispute to higher court level
     */
    function escalateDispute(
        uint256 disputeId,
        CourtLevel newLevel
    ) external onlyRole(COURT_ROLE) {
        Dispute storage dispute = disputes[disputeId];
        require(dispute.disputeId == disputeId, "DisputeOracle: not found");
        require(
            uint8(newLevel) > uint8(dispute.courtLevel),
            "DisputeOracle: can only escalate upward"
        );

        dispute.courtLevel = newLevel;
        dispute.status = DisputeStatus.HEARING;

        emit DisputeEscalated(disputeId, newLevel);
    }

    // ─────────────────────────────── oracle auto-detection ────────────
    /**
     * @notice Called by Chainlink oracle when e-Courts API finds a ULPIN mention
     * @dev Auto-registers dispute without COURT_ROLE requirement (oracle-only)
     */
    function oracleRegisterDispute(
        uint256 tokenId,
        string calldata caseNumber,
        string calldata courtName,
        string calldata plaintiff,
        CourtLevel courtLevel
    ) external onlyRole(ORACLE_ROLE) returns (uint256) {
        _disputeIdCounter++;
        uint256 disputeId = _disputeIdCounter;

        disputes[disputeId] = Dispute({
            disputeId: disputeId,
            tokenId: tokenId,
            caseNumber: caseNumber,
            courtName: courtName,
            plaintiff: plaintiff,
            filingDate: block.timestamp,
            status: DisputeStatus.FILED,
            courtLevel: courtLevel,
            ipfsOrderHash: "",
            outcome: "",
            resolutionDate: 0,
            registeredBy: msg.sender
        });

        _tokenDisputes[tokenId].push(disputeId);
        isDisputedMap[tokenId] = true;
        activeDisputeCount[tokenId]++;

        ILandRegistryFreeze(landRegistryContract).freezeParcel(
            tokenId,
            string(abi.encodePacked("Auto-detected: ", caseNumber))
        );

        emit DisputeRegistered(disputeId, tokenId, caseNumber, courtName, courtLevel);
        return disputeId;
    }

    // ─────────────────────────────── civil reporting ──────────────────
    /**
     * @notice Any verified citizen can report a suspected boundary dispute
     * @dev Does NOT auto-freeze — requires human review.
     *      Reporter must stake ETH to prevent frivolous reports.
     */
    function reportSuspectedDispute(
        uint256 tokenId,
        string calldata details
    ) external payable nonReentrant returns (uint256) {
        require(msg.value >= minReportStake, "DisputeOracle: insufficient stake");
        require(bytes(details).length > 10, "DisputeOracle: details too short");

        _reportIdCounter++;
        uint256 reportId = _reportIdCounter;

        reports[reportId] = SuspectedReport({
            reportId: reportId,
            tokenId: tokenId,
            reporter: msg.sender,
            details: details,
            stake: msg.value,
            reportedAt: block.timestamp,
            status: ReportStatus.PENDING_REVIEW,
            reviewNotes: ""
        });

        emit SuspectedDisputeReported(reportId, tokenId, msg.sender, msg.value);
        return reportId;
    }

    /**
     * @notice Reviewer clears or escalates a suspected dispute report
     */
    function reviewReport(
        uint256 reportId,
        ReportStatus newStatus,
        string calldata notes
    ) external onlyRole(REVIEWER_ROLE) nonReentrant {
        SuspectedReport storage report = reports[reportId];
        require(report.status == ReportStatus.PENDING_REVIEW, "DisputeOracle: not pending");

        report.status = newStatus;
        report.reviewNotes = notes;

        if (newStatus == ReportStatus.CLEARED) {
            // Frivolous — return stake to reporter
            (bool sent, ) = payable(report.reporter).call{value: report.stake}("");
            require(sent, "DisputeOracle: stake return failed");
        } else if (newStatus == ReportStatus.SLASHED) {
            // Frivolous abuse — slash stake (keep in contract)
            emit StakeSlashed(reportId, report.reporter, report.stake);
        }
        // If ESCALATED: stake is retained, human review will register proper dispute

        emit ReportReviewed(reportId, newStatus, notes);
    }

    // ─────────────────────────────────────── getters ──────────────────
    function isDisputed(uint256 tokenId) external view returns (bool, Dispute[] memory) {
        uint256[] memory ids = _tokenDisputes[tokenId];
        Dispute[] memory result = new Dispute[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = disputes[ids[i]];
        }
        return (isDisputedMap[tokenId], result);
    }

    function getDisputesByToken(uint256 tokenId)
        external
        view
        returns (uint256[] memory)
    {
        return _tokenDisputes[tokenId];
    }

    function getDispute(uint256 disputeId)
        external
        view
        returns (Dispute memory)
    {
        return disputes[disputeId];
    }

    // ─────────────────────────────────────── admin ────────────────────
    function setLandRegistry(address addr) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(addr != address(0), "DisputeOracle: zero address");
        landRegistryContract = addr;
    }

    function setMinReportStake(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minReportStake = amount;
    }

    function withdrawSlashedStakes(address to) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        (bool sent, ) = payable(to).call{value: address(this).balance}("");
        require(sent, "DisputeOracle: withdrawal failed");
    }

    // ────────────────────────────────── UUPS upgrade ──────────────────
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}

    receive() external payable {}
}

