// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title AuditLogger
 * @notice Immutable audit trail — write-only, no delete, no modify
 * @dev Every significant action in BhoomiChain writes an immutable log here.
 *      Serves as the backbone of the government audit trail.
 *      UUPS upgradeable (only for adding new log types, not modifying existing).
 */
contract AuditLogger is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    // ──────────────────────────────────────── roles ───────────────────
    bytes32 public constant LOGGER_ROLE   = keccak256("LOGGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ─────────────────────────────────────── enums ────────────────────
    enum ActionType {
        PARCEL_MINTED,          // 0
        TITLE_TRANSFERRED,      // 1
        ENCUMBRANCE_ADDED,      // 2
        ENCUMBRANCE_REMOVED,    // 3
        PARCEL_FROZEN,          // 4
        PARCEL_UNFROZEN,        // 5
        SALE_INITIATED,         // 6
        FUNDS_DEPOSITED,        // 7
        GOV_APPROVED,           // 8
        SALE_COMPLETED,         // 9
        SALE_CANCELLED,         // 10
        DISPUTE_FILED,          // 11
        DISPUTE_RESOLVED,       // 12
        IDENTITY_VERIFIED,      // 13
        POA_GRANTED,            // 14
        POA_REVOKED,            // 15
        AUCTION_CREATED,        // 16
        BID_PLACED,             // 17
        AUCTION_COMPLETED,      // 18
        OFFICER_LOGIN,          // 19
        BULK_UPLOAD,            // 20
        METADATA_UPDATED,       // 21
        GRIEVANCE_FILED,        // 22
        GRIEVANCE_RESOLVED,     // 23
        DUTY_PAID               // 24
    }

    // ─────────────────────────────────────── structs ──────────────────
    struct LogEntry {
        uint256 logId;
        address actor;
        ActionType actionType;
        uint256 tokenId;         // 0 if not token-specific
        uint256 timestamp;
        string ipfsDocHash;      // IPFS hash of any associated document
        string notes;
        bytes32 dataHash;        // hash of off-chain data for this action
    }

    // ─────────────────────────────────────── storage ──────────────────
    uint256 private _logIdCounter;

    // All log entries in an append-only array
    LogEntry[] private _logs;

    // actor => array of log indices (for filtering by actor)
    mapping(address => uint256[]) private _actorLogs;

    // tokenId => array of log indices (for filtering by token)
    mapping(uint256 => uint256[]) private _tokenLogs;

    // actionType => array of log indices (for filtering by action)
    mapping(uint8 => uint256[]) private _actionLogs;

    // ─────────────────────────────────────── events ───────────────────
    event LogWritten(
        uint256 indexed logId,
        address indexed actor,
        ActionType indexed actionType,
        uint256 tokenId,
        string notes
    );

    // ─────────────────────────────────── initializer ──────────────────
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin) public initializer {
        __AccessControl_init();
        // __UUPSUpgradeable_init removed in OZ v5

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(LOGGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }

    // ─────────────────────────────────── logging ──────────────────────
    /**
     * @notice Write an immutable log entry
     * @dev Only LOGGER_ROLE can write. NO delete function exists.
     */
    function log(
        address actor,
        ActionType actionType,
        uint256 tokenId,
        string calldata ipfsDocHash,
        string calldata notes,
        bytes32 dataHash
    ) external onlyRole(LOGGER_ROLE) returns (uint256) {
        _logIdCounter++;
        uint256 logId = _logIdCounter;

        LogEntry memory entry = LogEntry({
            logId: logId,
            actor: actor,
            actionType: actionType,
            tokenId: tokenId,
            timestamp: block.timestamp,
            ipfsDocHash: ipfsDocHash,
            notes: notes,
            dataHash: dataHash
        });

        _logs.push(entry);

        // Index the entry
        uint256 index = _logs.length - 1;
        _actorLogs[actor].push(index);
        if (tokenId > 0) {
            _tokenLogs[tokenId].push(index);
        }
        _actionLogs[uint8(actionType)].push(index);

        emit LogWritten(logId, actor, actionType, tokenId, notes);
        return logId;
    }

    /**
     * @notice Batch log multiple actions (for bulk upload scenarios)
     */
    function batchLog(
        address[] calldata actors,
        ActionType[] calldata actionTypes,
        uint256[] calldata tokenIds,
        string[] calldata notes
    ) external onlyRole(LOGGER_ROLE) {
        require(actors.length == actionTypes.length, "AuditLogger: array mismatch");
        require(actors.length == tokenIds.length, "AuditLogger: array mismatch");
        require(actors.length == notes.length, "AuditLogger: array mismatch");

        for (uint256 i = 0; i < actors.length; i++) {
            _logIdCounter++;
            uint256 logId = _logIdCounter;

            LogEntry memory entry = LogEntry({
                logId: logId,
                actor: actors[i],
                actionType: actionTypes[i],
                tokenId: tokenIds[i],
                timestamp: block.timestamp,
                ipfsDocHash: "",
                notes: notes[i],
                dataHash: bytes32(0)
            });

            _logs.push(entry);
            uint256 index = _logs.length - 1;
            _actorLogs[actors[i]].push(index);
            if (tokenIds[i] > 0) {
                _tokenLogs[tokenIds[i]].push(index);
            }
            _actionLogs[uint8(actionTypes[i])].push(index);

            emit LogWritten(logId, actors[i], actionTypes[i], tokenIds[i], notes[i]);
        }
    }

    // ─────────────────────────────────────── getters ──────────────────
    function getLog(uint256 logId) external view returns (LogEntry memory) {
        require(logId > 0 && logId <= _logIdCounter, "AuditLogger: invalid log ID");
        return _logs[logId - 1];
    }

    function getTotalLogs() external view returns (uint256) {
        return _logIdCounter;
    }

    function getLogsByActor(address actor)
        external
        view
        returns (uint256[] memory)
    {
        return _actorLogs[actor];
    }

    function getLogsByToken(uint256 tokenId)
        external
        view
        returns (uint256[] memory)
    {
        return _tokenLogs[tokenId];
    }

    function getLogsByAction(ActionType actionType)
        external
        view
        returns (uint256[] memory)
    {
        return _actionLogs[uint8(actionType)];
    }

    /**
     * @notice Get paginated log entries
     */
    function getLogsRange(uint256 start, uint256 count)
        external
        view
        returns (LogEntry[] memory)
    {
        require(start < _logs.length, "AuditLogger: start out of range");
        uint256 end = start + count;
        if (end > _logs.length) {
            end = _logs.length;
        }
        LogEntry[] memory result = new LogEntry[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = _logs[i];
        }
        return result;
    }

    // ────────────────────────────────── UUPS upgrade ──────────────────
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}

