// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title LandRegistry
 * @notice Master NFT contract for India's blockchain land registry (BhoomiChain)
 * @dev Every piece of land in India is one unique ERC-721 token.
 *      UUPS upgradeable with role-based access control.
 *      Deploys on Sepolia testnet, verifiable on Etherscan.
 */
contract LandRegistry is
    Initializable,
    ERC721Upgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    // ─────────────────────────────────────────────────────── roles ──
    bytes32 public constant MINTER_ROLE     = keccak256("MINTER_ROLE");
    bytes32 public constant ORACLE_ROLE     = keccak256("ORACLE_ROLE");
    bytes32 public constant COURT_ROLE      = keccak256("COURT_ROLE");
    bytes32 public constant UPGRADER_ROLE   = keccak256("UPGRADER_ROLE");

    // ─────────────────────────────────────────────────── enums ──────
    enum LandType {
        AGRICULTURAL,
        RESIDENTIAL,
        COMMERCIAL,
        INDUSTRIAL,
        FOREST,
        GOVERNMENT,
        MIXED
    }

    enum TitleStatus {
        CLEAR,
        PENDING,
        DISPUTED,
        ENCUMBERED,
        FROZEN
    }

    // ─────────────────────────────────────────────────── structs ────
    struct Coordinate {
        int256 latitude;   // multiplied by 1e6
        int256 longitude;  // multiplied by 1e6
    }

    struct OwnerRecord {
        address owner;
        uint256 timestamp;
        bytes32 transactionHash; // hash of the deed/transaction doc
    }

    struct ParcelMetadata {
        string ulpin;           // 14-digit Bhu-Aadhaar
        string ipfsDocHash;     // IPFS CID of document bundle
        bytes32 sha256DocHash;  // SHA-256 of documents
        LandType landType;
        uint256 areaInSqm;      // stored as integer (precision off-chain)
        string districtCode;
        string stateCode;
        bool hasEncumbrance;
        bool isFrozen;
        TitleStatus titleStatus;
        uint256 askingPrice;    // 0 if not for sale (in wei)
        uint256 mintedAt;
        uint256 updatedAt;
    }

    // ─────────────────────────────────────────────── storage ────────
    uint256 private _tokenIdCounter;
    address public transferDeedContract;

    // tokenId => metadata
    mapping(uint256 => ParcelMetadata) public parcels;

    // tokenId => boundary coordinates
    mapping(uint256 => Coordinate[]) private _coordinates;

    // tokenId => ownership history
    mapping(uint256 => OwnerRecord[]) private _ownerHistory;

    // ULPIN => tokenId (for lookups)
    mapping(string => uint256) public ulpinToTokenId;

    // Base URI for token metadata
    string private _baseTokenURI;

    // ─────────────────────────────────────────────────── events ─────
    event ParcelMinted(
        uint256 indexed tokenId,
        string ulpin,
        address indexed owner,
        string ipfsDocHash,
        uint256 areaInSqm
    );
    event TitleTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );
    event EncumbranceUpdated(
        uint256 indexed tokenId,
        bool hasEncumbrance,
        string details
    );
    event ParcelFrozen(uint256 indexed tokenId, string reason);
    event ParcelUnfrozen(uint256 indexed tokenId, string reason);
    event MetadataUpdated(uint256 indexed tokenId, string field);
    event AskingPriceSet(uint256 indexed tokenId, uint256 price);
    event TransferDeedContractSet(address contractAddress);

    // ─────────────────────────────────────────────── initializer ────
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address admin,
        string memory baseURI
    ) public initializer {
        __ERC721_init("BhoomiChain Land Title", "BHMI");
        __AccessControl_init();
        // __UUPSUpgradeable_init removed in OZ v5
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);

        _baseTokenURI = baseURI;
    }

    // ──────────────────────────────────────────────── minting ───────
    /**
     * @notice Mint a new land title NFT
     * @dev Only MINTER_ROLE can call. First assigns to contract, then to owner.
     */
    function mintLandTitle(
        address to,
        string calldata ulpin,
        string calldata ipfsDocHash,
        bytes32 sha256DocHash,
        LandType landType,
        uint256 areaInSqm,
        string calldata districtCode,
        string calldata stateCode,
        int256[] calldata latitudes,
        int256[] calldata longitudes
    ) external onlyRole(MINTER_ROLE) nonReentrant returns (uint256) {
        require(bytes(ulpin).length == 14, "LandRegistry: ULPIN must be 14 chars");
        require(ulpinToTokenId[ulpin] == 0, "LandRegistry: ULPIN already minted");
        require(latitudes.length == longitudes.length, "LandRegistry: coord arrays mismatch");
        require(latitudes.length >= 3, "LandRegistry: min 3 coordinates");
        require(to != address(0), "LandRegistry: zero address");

        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        // Store metadata
        parcels[tokenId] = ParcelMetadata({
            ulpin: ulpin,
            ipfsDocHash: ipfsDocHash,
            sha256DocHash: sha256DocHash,
            landType: landType,
            areaInSqm: areaInSqm,
            districtCode: districtCode,
            stateCode: stateCode,
            hasEncumbrance: false,
            isFrozen: false,
            titleStatus: TitleStatus.PENDING,
            askingPrice: 0,
            mintedAt: block.timestamp,
            updatedAt: block.timestamp
        });

        // Store coordinates
        for (uint256 i = 0; i < latitudes.length; i++) {
            _coordinates[tokenId].push(Coordinate({
                latitude: latitudes[i],
                longitude: longitudes[i]
            }));
        }

        // Map ULPIN
        ulpinToTokenId[ulpin] = tokenId;

        // Mint NFT
        _safeMint(to, tokenId);

        // Record initial ownership
        _ownerHistory[tokenId].push(OwnerRecord({
            owner: to,
            timestamp: block.timestamp,
            transactionHash: sha256DocHash
        }));

        emit ParcelMinted(tokenId, ulpin, to, ipfsDocHash, areaInSqm);
        return tokenId;
    }

    // ────────────────────────────────────────── transfer controls ───
    /**
     * @dev Override transfer functions — only TransferDeed contract or MINTER_ROLE can transfer.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);

        // Allow minting (from == address(0)) or burning (to == address(0))
        if (from != address(0) && to != address(0)) {
            require(
                msg.sender == transferDeedContract ||
                hasRole(MINTER_ROLE, msg.sender),
                "LandRegistry: transfers only via TransferDeed contract"
            );
            require(!parcels[tokenId].isFrozen, "LandRegistry: parcel is frozen");

            // Record ownership history
            _ownerHistory[tokenId].push(OwnerRecord({
                owner: to,
                timestamp: block.timestamp,
                transactionHash: bytes32(0)
            }));

            parcels[tokenId].titleStatus = TitleStatus.CLEAR;
            parcels[tokenId].updatedAt = block.timestamp;

            emit TitleTransferred(tokenId, from, to, block.timestamp);
        }

        return super._update(to, tokenId, auth);
    }

    // ─────────────────────────────────── encumbrance & status ───────
    function updateEncumbrance(
        uint256 tokenId,
        bool hasEncumbrance,
        string calldata details
    ) external onlyRole(ORACLE_ROLE) {
        require(_ownerOf(tokenId) != address(0), "LandRegistry: token does not exist");
        parcels[tokenId].hasEncumbrance = hasEncumbrance;
        parcels[tokenId].titleStatus = hasEncumbrance
            ? TitleStatus.ENCUMBERED
            : TitleStatus.CLEAR;
        parcels[tokenId].updatedAt = block.timestamp;
        emit EncumbranceUpdated(tokenId, hasEncumbrance, details);
    }

    function freezeParcel(
        uint256 tokenId,
        string calldata reason
    ) external onlyRole(COURT_ROLE) {
        require(_ownerOf(tokenId) != address(0), "LandRegistry: token does not exist");
        parcels[tokenId].isFrozen = true;
        parcels[tokenId].titleStatus = TitleStatus.FROZEN;
        parcels[tokenId].updatedAt = block.timestamp;
        emit ParcelFrozen(tokenId, reason);
    }

    function unfreezeParcel(
        uint256 tokenId,
        string calldata reason
    ) external onlyRole(COURT_ROLE) {
        require(_ownerOf(tokenId) != address(0), "LandRegistry: token does not exist");
        parcels[tokenId].isFrozen = false;
        parcels[tokenId].titleStatus = TitleStatus.CLEAR;
        parcels[tokenId].updatedAt = block.timestamp;
        emit ParcelUnfrozen(tokenId, reason);
    }

    function setTitleStatus(
        uint256 tokenId,
        TitleStatus status
    ) external onlyRole(MINTER_ROLE) {
        require(_ownerOf(tokenId) != address(0), "LandRegistry: token does not exist");
        parcels[tokenId].titleStatus = status;
        parcels[tokenId].updatedAt = block.timestamp;
        emit MetadataUpdated(tokenId, "titleStatus");
    }

    function setAskingPrice(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "LandRegistry: not owner");
        parcels[tokenId].askingPrice = price;
        emit AskingPriceSet(tokenId, price);
    }

    function updateIpfsHash(
        uint256 tokenId,
        string calldata newIpfsHash,
        bytes32 newSha256Hash
    ) external onlyRole(MINTER_ROLE) {
        require(_ownerOf(tokenId) != address(0), "LandRegistry: token does not exist");
        parcels[tokenId].ipfsDocHash = newIpfsHash;
        parcels[tokenId].sha256DocHash = newSha256Hash;
        parcels[tokenId].updatedAt = block.timestamp;
        emit MetadataUpdated(tokenId, "ipfsDocHash");
    }

    // ───────────────────────────────────────────────── setters ──────
    function setTransferDeedContract(address addr) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(addr != address(0), "LandRegistry: zero address");
        transferDeedContract = addr;
        emit TransferDeedContractSet(addr);
    }

    function setBaseURI(string memory baseURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = baseURI;
    }

    // ───────────────────────────────────────────────── getters ──────
    function getLandCoordinates(uint256 tokenId)
        external
        view
        returns (Coordinate[] memory)
    {
        require(_ownerOf(tokenId) != address(0), "LandRegistry: token does not exist");
        return _coordinates[tokenId];
    }

    function getLandDetails(uint256 tokenId)
        external
        view
        returns (ParcelMetadata memory)
    {
        require(_ownerOf(tokenId) != address(0), "LandRegistry: token does not exist");
        return parcels[tokenId];
    }

    function getOwnerHistory(uint256 tokenId)
        external
        view
        returns (OwnerRecord[] memory)
    {
        require(_ownerOf(tokenId) != address(0), "LandRegistry: token does not exist");
        return _ownerHistory[tokenId];
    }

    function getTokenByUlpin(string calldata ulpin)
        external
        view
        returns (uint256)
    {
        uint256 tokenId = ulpinToTokenId[ulpin];
        require(tokenId != 0, "LandRegistry: ULPIN not found");
        return tokenId;
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    function isParcelFrozen(uint256 tokenId) external view returns (bool) {
        return parcels[tokenId].isFrozen;
    }

    // ───────────────────────────────────────── token URI ────────────
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(_ownerOf(tokenId) != address(0), "LandRegistry: token does not exist");
        ParcelMetadata memory meta = parcels[tokenId];

        // Return IPFS metadata URI
        return string(abi.encodePacked(_baseTokenURI, meta.ipfsDocHash));
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    // ─────────────────────────── ERC165 supportsInterface ───────────
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ──────────────────────────────── UUPS upgrade authorization ────
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}

