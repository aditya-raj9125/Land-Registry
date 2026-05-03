// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title IdentityVerifier
 * @notice Prevents benami transactions and enforces policy limits
 * @dev Stores Aadhaar hashes (never raw Aadhaar), PAN links, PoA registry.
 *      NRI flags and multi-sig security mode.
 *      UUPS upgradeable.
 */
contract IdentityVerifier is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    // ──────────────────────────────────────── roles ───────────────────
    bytes32 public constant KYC_ROLE         = keccak256("KYC_ROLE");
    bytes32 public constant POLICY_ADMIN     = keccak256("POLICY_ADMIN");
    bytes32 public constant UPGRADER_ROLE    = keccak256("UPGRADER_ROLE");
    bytes32 public constant NRI_KYC_ROLE     = keccak256("NRI_KYC_ROLE");

    // ─────────────────────────────────────── enums ────────────────────
    enum PoAAction { LIST_FOR_SALE, NEGOTIATE, SIGN_DEED, ACCEPT_PAYMENT, ALL }
    enum Gender { UNKNOWN, MALE, FEMALE, OTHER }

    // ─────────────────────────────────────── structs ──────────────────
    struct Identity {
        bytes32 aadhaarHash;    // keccak256(aadhaarNumber) — never store raw
        bytes32 panHash;        // keccak256(panNumber) — for high-value KYC
        Gender gender;
        bool isNRI;
        bool nriAlertEnabled;
        bool multiSigMode;      // requires 2-of-3 for any transfer
        address[] trustedGuardians; // for multi-sig mode
        uint256 verifiedAt;
        uint256 parcelCount;    // how many parcels this identity owns
    }

    struct PowerOfAttorney {
        uint256 poaId;
        address grantor;
        address grantee;
        uint256[] tokenIds;     // which parcels (empty = all)
        PoAAction[] allowedActions;
        uint256 expiryTimestamp;
        bool revoked;
        uint256 grantedAt;
    }

    // ─────────────────────────────────────── storage ──────────────────
    uint256 public maxParcelsAllowed;
    uint256 private _poaIdCounter;

    // wallet => Identity
    mapping(address => Identity) private _identities;

    // aadhaarHash => wallet (for duplicate prevention)
    mapping(bytes32 => address) public aadhaarToWallet;

    // poaId => PowerOfAttorney
    mapping(uint256 => PowerOfAttorney) public powerOfAttorneys;

    // grantor address => array of PoA IDs
    mapping(address => uint256[]) private _grantorPoAs;

    // grantee address => array of active PoA IDs
    mapping(address => uint256[]) private _granteePoAs;

    // ─────────────────────────────────────── events ───────────────────
    event IdentityVerified(address indexed wallet, bytes32 aadhaarHash, Gender gender);
    event HighValueKYCCompleted(address indexed wallet, bytes32 panHash);
    event NRIFlagSet(address indexed wallet, bool isNRI);
    event PoAGranted(
        uint256 indexed poaId,
        address indexed grantor,
        address indexed grantee,
        uint256 expiry
    );
    event PoARevoked(uint256 indexed poaId, address indexed grantor);
    event ParcelCountUpdated(address indexed wallet, uint256 newCount);
    event MultiSigModeSet(address indexed wallet, bool enabled);

    // ─────────────────────────────────── initializer ──────────────────
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin) public initializer {
        __AccessControl_init();
        // __UUPSUpgradeable_init removed in OZ v5

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(KYC_ROLE, admin);
        _grantRole(POLICY_ADMIN, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(NRI_KYC_ROLE, admin);

        maxParcelsAllowed = 5; // default: 5 residential parcels per Aadhaar
    }

    // ─────────────────────────────── verification ─────────────────────
    /**
     * @notice Verify a wallet with Aadhaar hash (off-chain verification done before this)
     * @param wallet Address to verify
     * @param aadhaarHash keccak256(aadhaarNumber) — generated off-chain
     * @param gender Gender from Aadhaar data
     */
    function verifyIdentity(
        address wallet,
        bytes32 aadhaarHash,
        Gender gender
    ) external onlyRole(KYC_ROLE) {
        require(wallet != address(0), "IdentityVerifier: zero address");
        require(aadhaarHash != bytes32(0), "IdentityVerifier: invalid aadhaar hash");
        require(
            aadhaarToWallet[aadhaarHash] == address(0) ||
            aadhaarToWallet[aadhaarHash] == wallet,
            "IdentityVerifier: Aadhaar already linked to different wallet"
        );

        _identities[wallet].aadhaarHash = aadhaarHash;
        _identities[wallet].gender = gender;
        _identities[wallet].verifiedAt = block.timestamp;

        aadhaarToWallet[aadhaarHash] = wallet;

        emit IdentityVerified(wallet, aadhaarHash, gender);
    }

    /**
     * @notice Complete PAN-linked high-value KYC
     */
    function completeHighValueKYC(
        address wallet,
        bytes32 panHash
    ) external onlyRole(KYC_ROLE) {
        require(_identities[wallet].aadhaarHash != bytes32(0), "IdentityVerifier: not verified");
        require(panHash != bytes32(0), "IdentityVerifier: invalid PAN hash");

        _identities[wallet].panHash = panHash;

        emit HighValueKYCCompleted(wallet, panHash);
    }

    /**
     * @notice Set NRI flag after NRI KYC completion
     */
    function setNRIFlag(
        address wallet,
        bool nriStatus,
        bool alertEnabled
    ) external onlyRole(NRI_KYC_ROLE) {
        require(_identities[wallet].aadhaarHash != bytes32(0), "IdentityVerifier: not verified");
        _identities[wallet].isNRI = nriStatus;
        _identities[wallet].nriAlertEnabled = alertEnabled;
        emit NRIFlagSet(wallet, nriStatus);
    }

    /**
     * @notice Update parcel count when land is bought/sold
     * @dev Called by LandRegistry or TransferDeed contracts
     */
    function updateParcelCount(address wallet, bool increase) external {
        // In production: restrict to authorized contracts only
        if (increase) {
            _identities[wallet].parcelCount++;
        } else if (_identities[wallet].parcelCount > 0) {
            _identities[wallet].parcelCount--;
        }
        emit ParcelCountUpdated(wallet, _identities[wallet].parcelCount);
    }

    // ─────────────────────────────── multi-sig mode ───────────────────
    /**
     * @notice NRI can enable multi-sig mode requiring 2-of-3 trusted guardians
     */
    function setMultiSigMode(
        bool enabled,
        address[] calldata guardians
    ) external {
        require(_identities[msg.sender].aadhaarHash != bytes32(0), "IdentityVerifier: not verified");
        if (enabled) {
            require(guardians.length >= 2, "IdentityVerifier: need at least 2 guardians");
        }
        _identities[msg.sender].multiSigMode = enabled;
        _identities[msg.sender].trustedGuardians = guardians;
        emit MultiSigModeSet(msg.sender, enabled);
    }

    // ─────────────────────────────── power of attorney ────────────────
    /**
     * @notice Grant on-chain Power of Attorney
     */
    function grantPoA(
        address grantee,
        uint256[] calldata tokenIds,
        PoAAction[] calldata allowedActions,
        uint256 expiryTimestamp
    ) external returns (uint256) {
        require(_identities[msg.sender].aadhaarHash != bytes32(0), "IdentityVerifier: grantor not verified");
        require(_identities[grantee].aadhaarHash != bytes32(0), "IdentityVerifier: grantee not verified");
        require(expiryTimestamp > block.timestamp, "IdentityVerifier: expiry in past");
        require(grantee != msg.sender, "IdentityVerifier: self-PoA not allowed");
        require(allowedActions.length > 0, "IdentityVerifier: no actions specified");

        _poaIdCounter++;
        uint256 poaId = _poaIdCounter;

        powerOfAttorneys[poaId] = PowerOfAttorney({
            poaId: poaId,
            grantor: msg.sender,
            grantee: grantee,
            tokenIds: tokenIds,
            allowedActions: allowedActions,
            expiryTimestamp: expiryTimestamp,
            revoked: false,
            grantedAt: block.timestamp
        });

        _grantorPoAs[msg.sender].push(poaId);
        _granteePoAs[grantee].push(poaId);

        emit PoAGranted(poaId, msg.sender, grantee, expiryTimestamp);
        return poaId;
    }

    /**
     * @notice Revoke a Power of Attorney (grantor can revoke anytime)
     */
    function revokePoA(uint256 poaId) external {
        PowerOfAttorney storage poa = powerOfAttorneys[poaId];
        require(poa.grantor == msg.sender, "IdentityVerifier: not grantor");
        require(!poa.revoked, "IdentityVerifier: already revoked");

        poa.revoked = true;
        emit PoARevoked(poaId, msg.sender);
    }

    // ─────────────────────────────────────── getters ──────────────────
    function isVerified(address wallet) external view returns (bool) {
        return _identities[wallet].aadhaarHash != bytes32(0);
    }

    function isHighValueVerified(address wallet) external view returns (bool) {
        return _identities[wallet].panHash != bytes32(0);
    }

    function isNRI(address wallet) external view returns (bool) {
        return _identities[wallet].isNRI;
    }

    function getParcelCount(address wallet) external view returns (uint256) {
        return _identities[wallet].parcelCount;
    }

    function getGender(address wallet) external view returns (Gender) {
        return _identities[wallet].gender;
    }

    function isPoAValid(
        uint256 poaId,
        address grantee,
        uint256 tokenId
    ) external view returns (bool) {
        PowerOfAttorney storage poa = powerOfAttorneys[poaId];
        if (poa.grantee != grantee) return false;
        if (poa.revoked) return false;
        if (block.timestamp > poa.expiryTimestamp) return false;

        // Check token scope (empty tokenIds = all tokens)
        if (poa.tokenIds.length > 0) {
            bool found = false;
            for (uint256 i = 0; i < poa.tokenIds.length; i++) {
                if (poa.tokenIds[i] == tokenId) {
                    found = true;
                    break;
                }
            }
            if (!found) return false;
        }

        return true;
    }

    function getIdentity(address wallet) external view returns (
        bytes32 aadhaarHash,
        bytes32 panHash,
        Gender gender,
        bool nriFlag,
        bool multiSigModeEnabled,
        uint256 verifiedAt,
        uint256 parcelCount
    ) {
        Identity storage id = _identities[wallet];
        return (
            id.aadhaarHash,
            id.panHash,
            id.gender,
            id.isNRI,
            id.multiSigMode,
            id.verifiedAt,
            id.parcelCount
        );
    }

    function getGrantorPoAs(address grantor) external view returns (uint256[] memory) {
        return _grantorPoAs[grantor];
    }

    // ─────────────────────────────────────── admin ────────────────────
    function setMaxParcelsAllowed(uint256 newMax) external onlyRole(POLICY_ADMIN) {
        maxParcelsAllowed = newMax;
    }

    // ────────────────────────────────── UUPS upgrade ──────────────────
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}

