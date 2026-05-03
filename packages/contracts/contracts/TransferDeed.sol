// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./utils/ReentrancyGuardUpgradeable.sol";

interface ILandRegistry {
    function ownerOf(uint256 tokenId) external view returns (address);
    function isParcelFrozen(uint256 tokenId) external view returns (bool);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

interface IIdentityVerifier {
    function isVerified(address wallet) external view returns (bool);
    function isHighValueVerified(address wallet) external view returns (bool);
    function getParcelCount(address wallet) external view returns (uint256);
    function maxParcelsAllowed() external view returns (uint256);
}

interface IStampDuty {
    function isDutyPaid(uint256 tokenId, uint256 saleId) external view returns (bool);
    function calculateDuty(
        uint256 tokenId,
        uint256 declaredPrice,
        bool isFemale
    ) external view returns (uint256 circleRateValue, uint256 taxableValue, uint256 dutyAmount, uint256 regFee, uint256 total);
}

/**
 * @title TransferDeed
 * @notice Digital escrow + notary contract for land title transfers
 * @dev Manages the entire sale flow: initiation → deposit → gov approval → completion
 *      UUPS upgradeable. Multi-sig government approval required.
 */
contract TransferDeed is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    // ──────────────────────────────────────────── roles ──────────────
    bytes32 public constant GOV_APPROVER_ROLE = keccak256("GOV_APPROVER_ROLE");
    bytes32 public constant UPGRADER_ROLE     = keccak256("UPGRADER_ROLE");
    bytes32 public constant PLATFORM_ADMIN    = keccak256("PLATFORM_ADMIN");

    // ────────────────────────────────────────── sale status ──────────
    enum SaleStatus {
        INITIATED,      // seller listed, NFT in escrow
        FUNDED,         // buyer deposited funds
        PENDING_GOV,    // awaiting government multi-sig
        GOV_APPROVED,   // all approvers signed
        COMPLETED,      // transfer done
        CANCELLED,      // cancelled by expiry, mutual consent, or rejection
        REJECTED        // rejected by government
    }

    // ─────────────────────────────────────────── structs ─────────────
    struct Sale {
        uint256 saleId;
        uint256 tokenId;
        address seller;
        address buyer;
        uint256 askPrice;        // in wei
        uint256 stampDutyAmount; // in wei
        uint256 depositedAmount; // actual deposited
        uint256 startTime;
        uint256 fundedTime;
        SaleStatus status;
        uint256 approvalCount;
        mapping(address => bool) approvals;
        bytes32 eSignDocHash;    // hash of signed sale deed
        string rejectionReason;
    }

    // ─────────────────────────────────────────── storage ─────────────
    uint256 private _saleIdCounter;
    uint256 public constant DEPOSIT_DEADLINE  = 7 days;
    uint256 public constant APPROVAL_DEADLINE = 30 days;
    uint256 public constant PLATFORM_FEE_BPS  = 50;  // 0.5%
    uint256 public constant HIGH_VALUE_THRESHOLD = 50 * 1e18; // 50 ETH (proxy for 50 lakh INR)
    uint256 public constant REQUIRED_APPROVALS   = 2;  // 2-of-3

    address public landRegistryContract;
    address public identityVerifierContract;
    address public stampDutyContract;
    address public platformTreasury;

    // saleId => Sale struct
    mapping(uint256 => Sale) private _sales;

    // tokenId => active saleId (0 if none)
    mapping(uint256 => uint256) public activeSaleByToken;

    // ─────────────────────────────────────────── events ──────────────
    event SaleInitiated(
        uint256 indexed saleId,
        uint256 indexed tokenId,
        address seller,
        address buyer,
        uint256 askPrice
    );
    event FundsDeposited(uint256 indexed saleId, uint256 amount, address buyer);
    event GovernmentApproval(uint256 indexed saleId, address approver, uint256 approvalCount);
    event SaleCompleted(
        uint256 indexed saleId,
        uint256 indexed tokenId,
        address seller,
        address buyer,
        uint256 amount
    );
    event SaleCancelled(uint256 indexed saleId, string reason);
    event SaleRejected(uint256 indexed saleId, string reason);
    event ESignRecorded(uint256 indexed saleId, bytes32 docHash);
    event MutationTriggered(uint256 indexed tokenId, address newOwner);

    // ─────────────────────────────────────── initializer ─────────────
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address admin,
        address _landRegistry,
        address _identityVerifier,
        address _stampDuty,
        address _treasury
    ) public initializer {
        __AccessControl_init();
        // __UUPSUpgradeable_init removed in OZ v5
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(PLATFORM_ADMIN, admin);

        landRegistryContract = _landRegistry;
        identityVerifierContract = _identityVerifier;
        stampDutyContract = _stampDuty;
        platformTreasury = _treasury;
    }

    // ─────────────────────────────────── initiate sale ───────────────
    /**
     * @notice Seller initiates a sale — NFT moves to escrow
     * @param tokenId The land title token ID
     * @param buyer The intended buyer's address
     * @param askPrice The agreed sale price in wei
     * @param eSignDocHash Hash of the e-signed sale deed document
     */
    function initiateSale(
        uint256 tokenId,
        address buyer,
        uint256 askPrice,
        bytes32 eSignDocHash
    ) external nonReentrant returns (uint256) {
        ILandRegistry registry = ILandRegistry(landRegistryContract);
        IIdentityVerifier verifier = IIdentityVerifier(identityVerifierContract);

        require(registry.ownerOf(tokenId) == msg.sender, "TransferDeed: not owner");
        require(!registry.isParcelFrozen(tokenId), "TransferDeed: parcel is frozen (under dispute)");
        require(buyer != address(0), "TransferDeed: invalid buyer");
        require(buyer != msg.sender, "TransferDeed: cannot sell to self");
        require(askPrice > 0, "TransferDeed: invalid price");
        require(activeSaleByToken[tokenId] == 0, "TransferDeed: active sale exists");
        require(verifier.isVerified(msg.sender), "TransferDeed: seller not verified");
        require(verifier.isVerified(buyer), "TransferDeed: buyer not verified");

        // High-value check
        if (askPrice >= HIGH_VALUE_THRESHOLD) {
            require(
                verifier.isHighValueVerified(msg.sender) &&
                verifier.isHighValueVerified(buyer),
                "TransferDeed: high-value KYC required"
            );
        }

        // Check buyer parcel limit
        require(
            verifier.getParcelCount(buyer) < verifier.maxParcelsAllowed(),
            "TransferDeed: buyer reached parcel limit"
        );

        // Get stamp duty amount
        (, , uint256 dutyAmount, uint256 regFee, ) = IStampDuty(stampDutyContract)
            .calculateDuty(tokenId, askPrice, false);

        _saleIdCounter++;
        uint256 saleId = _saleIdCounter;

        Sale storage sale = _sales[saleId];
        sale.saleId = saleId;
        sale.tokenId = tokenId;
        sale.seller = msg.sender;
        sale.buyer = buyer;
        sale.askPrice = askPrice;
        sale.stampDutyAmount = dutyAmount + regFee;
        sale.startTime = block.timestamp;
        sale.status = SaleStatus.INITIATED;
        sale.eSignDocHash = eSignDocHash;

        activeSaleByToken[tokenId] = saleId;

        // Transfer NFT to escrow (this contract)
        registry.safeTransferFrom(msg.sender, address(this), tokenId);

        emit SaleInitiated(saleId, tokenId, msg.sender, buyer, askPrice);
        emit ESignRecorded(saleId, eSignDocHash);

        return saleId;
    }

    // ─────────────────────────────────── deposit funds ───────────────
    /**
     * @notice Buyer deposits the full sale amount + stamp duty
     */
    function depositFunds(uint256 saleId) external payable nonReentrant {
        Sale storage sale = _sales[saleId];

        require(sale.buyer == msg.sender, "TransferDeed: not the buyer");
        require(sale.status == SaleStatus.INITIATED, "TransferDeed: invalid status");
        require(
            block.timestamp <= sale.startTime + DEPOSIT_DEADLINE,
            "TransferDeed: deposit deadline passed"
        );

        uint256 required = sale.askPrice + sale.stampDutyAmount;
        require(msg.value == required, "TransferDeed: incorrect amount deposited");

        sale.depositedAmount = msg.value;
        sale.fundedTime = block.timestamp;
        sale.status = SaleStatus.FUNDED;

        emit FundsDeposited(saleId, msg.value, msg.sender);
    }

    // ─────────────────────────────── government approval ─────────────
    /**
     * @notice Government officer approves the transaction (multi-sig)
     * @dev Requires 2-of-3 signatures from GOV_APPROVER_ROLE holders
     */
    function approveTransaction(uint256 saleId) external onlyRole(GOV_APPROVER_ROLE) nonReentrant {
        Sale storage sale = _sales[saleId];

        require(sale.status == SaleStatus.FUNDED, "TransferDeed: not funded");
        require(!sale.approvals[msg.sender], "TransferDeed: already approved");
        require(
            block.timestamp <= sale.fundedTime + APPROVAL_DEADLINE,
            "TransferDeed: approval deadline passed"
        );

        sale.approvals[msg.sender] = true;
        sale.approvalCount++;

        emit GovernmentApproval(saleId, msg.sender, sale.approvalCount);

        if (sale.approvalCount >= REQUIRED_APPROVALS) {
            sale.status = SaleStatus.GOV_APPROVED;
            _executeSale(saleId);
        }
    }

    // ─────────────────────────────────── execute sale ────────────────
    function _executeSale(uint256 saleId) internal {
        Sale storage sale = _sales[saleId];

        uint256 platformFee = (sale.askPrice * PLATFORM_FEE_BPS) / 10000;
        uint256 sellerAmount = sale.askPrice - platformFee;

        sale.status = SaleStatus.COMPLETED;
        activeSaleByToken[sale.tokenId] = 0;

        // Transfer NFT to buyer
        ILandRegistry(landRegistryContract).safeTransferFrom(
            address(this),
            sale.buyer,
            sale.tokenId
        );

        // Transfer funds
        (bool sentToSeller, ) = payable(sale.seller).call{value: sellerAmount}("");
        require(sentToSeller, "TransferDeed: seller transfer failed");

        (bool sentToPlatform, ) = payable(platformTreasury).call{value: platformFee}("");
        require(sentToPlatform, "TransferDeed: platform fee transfer failed");

        // Stamp duty stays in contract — will be forwarded to government wallet
        // (handled by backend after SaleCompleted event)

        emit SaleCompleted(saleId, sale.tokenId, sale.seller, sale.buyer, sale.askPrice);
        emit MutationTriggered(sale.tokenId, sale.buyer);
    }

    // ─────────────────────────────── reject / cancel ─────────────────
    function rejectTransaction(uint256 saleId, string calldata reason)
        external
        onlyRole(GOV_APPROVER_ROLE)
        nonReentrant
    {
        Sale storage sale = _sales[saleId];
        require(sale.status == SaleStatus.FUNDED, "TransferDeed: not funded");

        sale.status = SaleStatus.REJECTED;
        sale.rejectionReason = reason;
        activeSaleByToken[sale.tokenId] = 0;

        // Return NFT to seller
        ILandRegistry(landRegistryContract).safeTransferFrom(
            address(this),
            sale.seller,
            sale.tokenId
        );

        // Refund buyer
        (bool refunded, ) = payable(sale.buyer).call{value: sale.depositedAmount}("");
        require(refunded, "TransferDeed: refund failed");

        emit SaleRejected(saleId, reason);
    }

    function cancelByExpiry(uint256 saleId) external nonReentrant {
        Sale storage sale = _sales[saleId];
        require(
            sale.status == SaleStatus.INITIATED || sale.status == SaleStatus.FUNDED,
            "TransferDeed: cannot cancel"
        );

        bool depositExpired = sale.status == SaleStatus.INITIATED &&
            block.timestamp > sale.startTime + DEPOSIT_DEADLINE;
        bool approvalExpired = sale.status == SaleStatus.FUNDED &&
            block.timestamp > sale.fundedTime + APPROVAL_DEADLINE;

        require(depositExpired || approvalExpired, "TransferDeed: deadlines not yet passed");

        sale.status = SaleStatus.CANCELLED;
        activeSaleByToken[sale.tokenId] = 0;

        // Return NFT to seller
        ILandRegistry(landRegistryContract).safeTransferFrom(
            address(this),
            sale.seller,
            sale.tokenId
        );

        // Refund buyer if funded
        if (sale.depositedAmount > 0) {
            (bool refunded, ) = payable(sale.buyer).call{value: sale.depositedAmount}("");
            require(refunded, "TransferDeed: refund failed");
        }

        emit SaleCancelled(saleId, "Deadline expired");
    }

    function cancelMutual(uint256 saleId) external nonReentrant {
        Sale storage sale = _sales[saleId];
        require(
            sale.status == SaleStatus.INITIATED || sale.status == SaleStatus.FUNDED,
            "TransferDeed: cannot cancel"
        );
        require(
            msg.sender == sale.seller || msg.sender == sale.buyer,
            "TransferDeed: not a party"
        );

        // Simple mutual cancel — both must call (first marks, second executes)
        // In production, implement 2-sig mechanism
        // For now: either party can cancel if status == INITIATED
        if (sale.status == SaleStatus.INITIATED) {
            require(msg.sender == sale.seller, "TransferDeed: only seller can cancel before funding");
        } else {
            // After funding, only platform admin can force cancel
            require(hasRole(PLATFORM_ADMIN, msg.sender), "TransferDeed: need admin for post-fund cancel");
        }

        sale.status = SaleStatus.CANCELLED;
        activeSaleByToken[sale.tokenId] = 0;

        ILandRegistry(landRegistryContract).safeTransferFrom(
            address(this),
            sale.seller,
            sale.tokenId
        );

        if (sale.depositedAmount > 0) {
            (bool refunded, ) = payable(sale.buyer).call{value: sale.depositedAmount}("");
            require(refunded, "TransferDeed: refund failed");
        }

        emit SaleCancelled(saleId, "Mutual cancellation");
    }

    // ─────────────────────────────────────────── getters ─────────────
    function getSaleDetails(uint256 saleId) external view returns (
        uint256 tokenId,
        address seller,
        address buyer,
        uint256 askPrice,
        uint256 stampDutyAmount,
        uint256 depositedAmount,
        uint256 startTime,
        SaleStatus status,
        uint256 approvalCount,
        bytes32 eSignDocHash,
        string memory rejectionReason
    ) {
        Sale storage sale = _sales[saleId];
        return (
            sale.tokenId,
            sale.seller,
            sale.buyer,
            sale.askPrice,
            sale.stampDutyAmount,
            sale.depositedAmount,
            sale.startTime,
            sale.status,
            sale.approvalCount,
            sale.eSignDocHash,
            sale.rejectionReason
        );
    }

    // ────────────────────────────────── ERC721 receiver ──────────────
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    // ──────────────────────────────── admin ──────────────────────────
    function setContracts(
        address _registry,
        address _verifier,
        address _stampDuty
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        landRegistryContract = _registry;
        identityVerifierContract = _verifier;
        stampDutyContract = _stampDuty;
    }

    function setPlatformTreasury(address treasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(treasury != address(0), "TransferDeed: zero address");
        platformTreasury = treasury;
    }

    // Extract stamp duty (government collects)
    function withdrawStampDuty(address to, uint256 amount)
        external
        onlyRole(PLATFORM_ADMIN)
        nonReentrant
    {
        require(to != address(0), "TransferDeed: zero address");
        (bool sent, ) = payable(to).call{value: amount}("");
        require(sent, "TransferDeed: withdrawal failed");
    }

    // ────────────────────────────── UUPS upgrade ─────────────────────
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}

    receive() external payable {}
}

