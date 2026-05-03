// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./utils/ReentrancyGuardUpgradeable.sol";

interface ILandRegistryAuction {
    function ownerOf(uint256 tokenId) external view returns (address);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function isParcelFrozen(uint256 tokenId) external view returns (bool);
}

/**
 * @title LandAuction
 * @notice Government land auctions and distressed property sales
 * @dev Anti-sniping mechanism: last-minute bids extend auction by 10 minutes.
 *      Outbid bidders are refunded immediately.
 *      UUPS upgradeable.
 */
contract LandAuction is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    // ──────────────────────────────────────── roles ───────────────────
    bytes32 public constant AUCTION_ROLE  = keccak256("AUCTION_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ─────────────────────────────────────── enums ────────────────────
    enum AuctionStatus {
        SCHEDULED,
        ACTIVE,
        ENDED,
        RESERVE_NOT_MET,
        COMPLETED,
        CANCELLED
    }

    // ─────────────────────────────────────── structs ──────────────────
    struct Bid {
        address bidder;
        uint256 amount;
        uint256 timestamp;
    }

    struct Auction {
        uint256 auctionId;
        uint256 tokenId;
        address creator;
        uint256 reservePrice;
        uint256 startTime;
        uint256 endTime;
        uint256 depositRequired;  // must deposit to participate
        AuctionStatus status;
        address highestBidder;
        uint256 highestBid;
        uint256 bidCount;
    }

    // ─────────────────────────────────────── storage ──────────────────
    uint256 private _auctionIdCounter;
    uint256 public constant ANTI_SNIPE_WINDOW   = 10 minutes;
    uint256 public constant ANTI_SNIPE_EXTENSION = 10 minutes;
    uint256 public constant MIN_BID_INCREMENT_BPS = 100; // 1% minimum increment

    address public landRegistryContract;

    // auctionId => Auction
    mapping(uint256 => Auction) public auctions;

    // tokenId => active auctionId
    mapping(uint256 => uint256) public activeAuctionByToken;

    // auctionId => bidder => deposited amount
    mapping(uint256 => mapping(address => uint256)) public deposits;

    // auctionId => bid history
    mapping(uint256 => Bid[]) private _bidHistory;

    // ─────────────────────────────────────── events ───────────────────
    event AuctionCreated(
        uint256 indexed auctionId,
        uint256 indexed tokenId,
        uint256 reservePrice,
        uint256 startTime,
        uint256 endTime
    );
    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        uint256 newEndTime
    );
    event AuctionExtended(uint256 indexed auctionId, uint256 newEndTime);
    event AuctionEnded(
        uint256 indexed auctionId,
        uint256 indexed tokenId,
        address winner,
        uint256 winningBid
    );
    event AuctionReserveNotMet(uint256 indexed auctionId, uint256 highestBid, uint256 reservePrice);
    event BidRefunded(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionCancelled(uint256 indexed auctionId, string reason);

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
        _grantRole(AUCTION_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);

        landRegistryContract = _landRegistry;
    }

    // ─────────────────────────────── create auction ───────────────────
    /**
     * @notice Create an auction for a land parcel
     * @dev Only AUCTION_ROLE (government or bank) can create
     */
    function createAuction(
        uint256 tokenId,
        uint256 reservePrice,
        uint256 startTime,
        uint256 endTime,
        uint256 depositRequired
    ) external onlyRole(AUCTION_ROLE) returns (uint256) {
        ILandRegistryAuction registry = ILandRegistryAuction(landRegistryContract);

        require(registry.ownerOf(tokenId) != address(0), "LandAuction: token not found");
        require(!registry.isParcelFrozen(tokenId), "LandAuction: parcel is frozen");
        require(activeAuctionByToken[tokenId] == 0, "LandAuction: active auction exists");
        require(startTime >= block.timestamp, "LandAuction: start time in past");
        require(endTime > startTime, "LandAuction: end before start");
        require(endTime - startTime >= 1 days, "LandAuction: min 1 day duration");
        require(reservePrice > 0, "LandAuction: invalid reserve");

        _auctionIdCounter++;
        uint256 auctionId = _auctionIdCounter;

        auctions[auctionId] = Auction({
            auctionId: auctionId,
            tokenId: tokenId,
            creator: msg.sender,
            reservePrice: reservePrice,
            startTime: startTime,
            endTime: endTime,
            depositRequired: depositRequired,
            status: AuctionStatus.SCHEDULED,
            highestBidder: address(0),
            highestBid: 0,
            bidCount: 0
        });

        activeAuctionByToken[tokenId] = auctionId;

        // Transfer NFT to auction contract for escrow
        registry.safeTransferFrom(registry.ownerOf(tokenId), address(this), tokenId);

        emit AuctionCreated(auctionId, tokenId, reservePrice, startTime, endTime);
        return auctionId;
    }

    // ─────────────────────────────────── bidding ──────────────────────
    /**
     * @notice Place a bid on an active auction
     * @dev Outbid previous bidder is refunded immediately.
     *      Last-minute bids extend auction by 10 minutes.
     */
    function placeBid(uint256 auctionId) external payable nonReentrant {
        Auction storage auction = auctions[auctionId];

        require(auction.status == AuctionStatus.SCHEDULED || auction.status == AuctionStatus.ACTIVE, "LandAuction: not active");
        require(block.timestamp >= auction.startTime, "LandAuction: not started");
        require(block.timestamp <= auction.endTime, "LandAuction: ended");
        require(msg.sender != auction.creator, "LandAuction: creator cannot bid");

        // Calculate minimum required bid
        uint256 minBid;
        if (auction.highestBid == 0) {
            minBid = auction.reservePrice;
        } else {
            minBid = auction.highestBid + (auction.highestBid * MIN_BID_INCREMENT_BPS / 10000);
        }
        require(msg.value >= minBid, "LandAuction: bid too low");

        // Refund previous highest bidder
        if (auction.highestBidder != address(0)) {
            uint256 refundAmount = auction.highestBid;
            auction.highestBid = 0;
            (bool refunded, ) = payable(auction.highestBidder).call{value: refundAmount}("");
            require(refunded, "LandAuction: refund failed");
            emit BidRefunded(auctionId, auction.highestBidder, refundAmount);
        }

        auction.highestBidder = msg.sender;
        auction.highestBid = msg.value;
        auction.status = AuctionStatus.ACTIVE;
        auction.bidCount++;

        // Anti-sniping: extend auction if bid placed in last 10 minutes
        uint256 newEndTime = auction.endTime;
        if (auction.endTime - block.timestamp <= ANTI_SNIPE_WINDOW) {
            newEndTime = block.timestamp + ANTI_SNIPE_EXTENSION;
            auction.endTime = newEndTime;
            emit AuctionExtended(auctionId, newEndTime);
        }

        _bidHistory[auctionId].push(Bid({
            bidder: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp
        }));

        emit BidPlaced(auctionId, msg.sender, msg.value, newEndTime);
    }

    // ─────────────────────────────────── finalize ─────────────────────
    /**
     * @notice Finalize the auction after end time
     */
    function finalizeAuction(uint256 auctionId) external onlyRole(AUCTION_ROLE) nonReentrant {
        Auction storage auction = auctions[auctionId];

        require(
            auction.status == AuctionStatus.ACTIVE || auction.status == AuctionStatus.SCHEDULED,
            "LandAuction: cannot finalize"
        );
        require(block.timestamp > auction.endTime, "LandAuction: not ended");

        if (auction.highestBid >= auction.reservePrice && auction.highestBidder != address(0)) {
            auction.status = AuctionStatus.COMPLETED;
            activeAuctionByToken[auction.tokenId] = 0;

            // Transfer NFT to winner
            ILandRegistryAuction(landRegistryContract).safeTransferFrom(
                address(this),
                auction.highestBidder,
                auction.tokenId
            );

            // Transfer funds to government/platform (creator)
            (bool sent, ) = payable(auction.creator).call{value: auction.highestBid}("");
            require(sent, "LandAuction: payment failed");

            emit AuctionEnded(auctionId, auction.tokenId, auction.highestBidder, auction.highestBid);
        } else {
            auction.status = AuctionStatus.RESERVE_NOT_MET;
            activeAuctionByToken[auction.tokenId] = 0;

            // Return NFT to creator
            ILandRegistryAuction(landRegistryContract).safeTransferFrom(
                address(this),
                auction.creator,
                auction.tokenId
            );

            // Refund highest bidder if any
            if (auction.highestBidder != address(0) && auction.highestBid > 0) {
                (bool refunded, ) = payable(auction.highestBidder).call{value: auction.highestBid}("");
                require(refunded, "LandAuction: refund failed");
                emit BidRefunded(auctionId, auction.highestBidder, auction.highestBid);
            }

            emit AuctionReserveNotMet(auctionId, auction.highestBid, auction.reservePrice);
        }
    }

    function cancelAuction(uint256 auctionId, string calldata reason)
        external
        onlyRole(AUCTION_ROLE)
        nonReentrant
    {
        Auction storage auction = auctions[auctionId];
        require(
            auction.status == AuctionStatus.SCHEDULED || auction.status == AuctionStatus.ACTIVE,
            "LandAuction: cannot cancel"
        );

        auction.status = AuctionStatus.CANCELLED;
        activeAuctionByToken[auction.tokenId] = 0;

        // Return NFT to creator
        ILandRegistryAuction(landRegistryContract).safeTransferFrom(
            address(this),
            auction.creator,
            auction.tokenId
        );

        // Refund highest bidder if any
        if (auction.highestBidder != address(0) && auction.highestBid > 0) {
            (bool refunded, ) = payable(auction.highestBidder).call{value: auction.highestBid}("");
            require(refunded, "LandAuction: refund failed");
            emit BidRefunded(auctionId, auction.highestBidder, auction.highestBid);
        }

        emit AuctionCancelled(auctionId, reason);
    }

    // ─────────────────────────────────────── getters ──────────────────
    function getAuction(uint256 auctionId) external view returns (Auction memory) {
        return auctions[auctionId];
    }

    function getBidHistory(uint256 auctionId) external view returns (Bid[] memory) {
        return _bidHistory[auctionId];
    }

    function getHighestBid(uint256 auctionId) external view returns (address, uint256) {
        Auction storage auction = auctions[auctionId];
        return (auction.highestBidder, auction.highestBid);
    }

    // ────────────────────────── ERC721 receiver ──────────────────────
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    // ────────────────────────────────── UUPS upgrade ──────────────────
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}

    receive() external payable {}
}

