import { ethers } from 'ethers'
import { Queue, Worker } from 'bullmq'
import * as dotenv from 'dotenv'
import { db } from '../api/src/lib/db'
import { redis } from '../api/src/lib/redis'

dotenv.config({ path: '../../.env' })

// Load deployed addresses
import deployedAddresses from '../../packages/contracts/deployments/sepolia-latest.json' assert { type: 'json' }

// Minimal ABIs for event listening
const LAND_REGISTRY_ABI = [
  'event ParcelMinted(uint256 indexed tokenId, string ulpin, address indexed owner, string ipfsDocHash, uint256 areaInSqm)',
  'event TitleTransferred(uint256 indexed tokenId, address indexed from, address indexed to, uint256 timestamp)',
  'event EncumbranceUpdated(uint256 indexed tokenId, bool hasEncumbrance, string details)',
  'event ParcelFrozen(uint256 indexed tokenId, string reason)',
  'event ParcelUnfrozen(uint256 indexed tokenId, string reason)',
]

const TRANSFER_DEED_ABI = [
  'event SaleInitiated(uint256 indexed saleId, uint256 indexed tokenId, address seller, address buyer, uint256 askPrice)',
  'event FundsDeposited(uint256 indexed saleId, uint256 amount, address buyer)',
  'event GovernmentApproval(uint256 indexed saleId, address approver, uint256 approvalCount)',
  'event SaleCompleted(uint256 indexed saleId, uint256 indexed tokenId, address seller, address buyer, uint256 amount)',
  'event SaleCancelled(uint256 indexed saleId, string reason)',
  'event MutationTriggered(uint256 indexed tokenId, address newOwner)',
]

const DISPUTE_ORACLE_ABI = [
  'event DisputeRegistered(uint256 indexed disputeId, uint256 indexed tokenId, string caseNumber, string courtName, uint8 courtLevel)',
  'event DisputeResolved(uint256 indexed disputeId, uint256 indexed tokenId, uint8 status, string outcome)',
]

const STAMP_DUTY_ABI = [
  'event DutyPaid(uint256 indexed tokenId, uint256 indexed saleId, uint256 amount, string districtCode)',
]

// ── Setup provider and contracts ─────────────────────────────────
const provider = new ethers.WebSocketProvider(
  `wss://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
)

const landRegistry = new ethers.Contract(deployedAddresses.LandRegistry, LAND_REGISTRY_ABI, provider)
const transferDeed = new ethers.Contract(deployedAddresses.TransferDeed, TRANSFER_DEED_ABI, provider)
const disputeOracle = new ethers.Contract(deployedAddresses.DisputeOracle, DISPUTE_ORACLE_ABI, provider)
const stampDuty = new ethers.Contract(deployedAddresses.StampDuty, STAMP_DUTY_ABI, provider)

// ── BullMQ Queue ──────────────────────────────────────────────────
const eventQueue = new Queue('blockchain-events', {
  connection: { url: process.env.REDIS_URL },
})

// ── Event Handlers ────────────────────────────────────────────────
async function handleParcelMinted(
  tokenId: bigint, ulpin: string, owner: string, ipfsDocHash: string, areaInSqm: bigint,
  event: ethers.EventLog
) {
  await eventQueue.add('parcel-minted', {
    tokenId: tokenId.toString(), ulpin, owner, ipfsDocHash,
    areaInSqm: areaInSqm.toString(),
    txHash: event.transactionHash, blockNumber: event.blockNumber,
  })
  console.log(`[Indexer] ParcelMinted: tokenId=${tokenId} ulpin=${ulpin}`)
}

async function handleTitleTransferred(
  tokenId: bigint, from: string, to: string, timestamp: bigint, event: ethers.EventLog
) {
  await eventQueue.add('title-transferred', {
    tokenId: tokenId.toString(), from, to,
    timestamp: timestamp.toString(),
    txHash: event.transactionHash,
  })
  console.log(`[Indexer] TitleTransferred: tokenId=${tokenId} ${from}→${to}`)
}

async function handleSaleCompleted(
  saleId: bigint, tokenId: bigint, seller: string, buyer: string, amount: bigint, event: ethers.EventLog
) {
  await eventQueue.add('sale-completed', {
    saleId: saleId.toString(), tokenId: tokenId.toString(),
    seller, buyer, amount: amount.toString(),
    txHash: event.transactionHash,
  })
  console.log(`[Indexer] SaleCompleted: saleId=${saleId} tokenId=${tokenId}`)
}

async function handleDisputeRegistered(
  disputeId: bigint, tokenId: bigint, caseNumber: string, courtName: string, courtLevel: number, event: ethers.EventLog
) {
  await eventQueue.add('dispute-registered', {
    disputeId: disputeId.toString(), tokenId: tokenId.toString(),
    caseNumber, courtName, courtLevel,
    txHash: event.transactionHash,
  })
  console.log(`[Indexer] DisputeRegistered: tokenId=${tokenId} case=${caseNumber}`)
}

// ── Event Listeners ───────────────────────────────────────────────
landRegistry.on('ParcelMinted', handleParcelMinted)
landRegistry.on('TitleTransferred', handleTitleTransferred)
landRegistry.on('EncumbranceUpdated', async (tokenId, hasEncumbrance, details, event) => {
  await eventQueue.add('encumbrance-updated', { tokenId: tokenId.toString(), hasEncumbrance, details, txHash: (event as ethers.EventLog).transactionHash })
})
landRegistry.on('ParcelFrozen', async (tokenId, reason, event) => {
  await eventQueue.add('parcel-frozen', { tokenId: tokenId.toString(), reason, txHash: (event as ethers.EventLog).transactionHash })
})
landRegistry.on('ParcelUnfrozen', async (tokenId, reason, event) => {
  await eventQueue.add('parcel-unfrozen', { tokenId: tokenId.toString(), reason, txHash: (event as ethers.EventLog).transactionHash })
})
transferDeed.on('SaleInitiated', async (saleId, tokenId, seller, buyer, askPrice, event) => {
  await eventQueue.add('sale-initiated', { saleId: saleId.toString(), tokenId: tokenId.toString(), seller, buyer, askPrice: askPrice.toString(), txHash: (event as ethers.EventLog).transactionHash })
})
transferDeed.on('SaleCompleted', handleSaleCompleted)
transferDeed.on('MutationTriggered', async (tokenId, newOwner, event) => {
  await eventQueue.add('mutation-triggered', { tokenId: tokenId.toString(), newOwner, txHash: (event as ethers.EventLog).transactionHash })
})
disputeOracle.on('DisputeRegistered', handleDisputeRegistered)
stampDuty.on('DutyPaid', async (tokenId, saleId, amount, districtCode, event) => {
  await eventQueue.add('duty-paid', { tokenId: tokenId.toString(), saleId: saleId.toString(), amount: amount.toString(), districtCode, txHash: (event as ethers.EventLog).transactionHash })
})

// ── BullMQ Worker — write events to PostgreSQL ───────────────────
const worker = new Worker(
  'blockchain-events',
  async (job) => {
    const { name, data } = job

    switch (name) {
      case 'parcel-minted':
        await db.query(
          `INSERT INTO parcels (token_id, ulpin, owner_address, ipfs_document_hash, title_status, mint_transaction_hash, mint_block_number, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, NOW(), NOW())
           ON CONFLICT (ulpin) DO UPDATE SET owner_address=$3, updated_at=NOW()`,
          [data.tokenId, data.ulpin, data.owner, data.ipfsDocHash, data.txHash, data.blockNumber]
        )
        // Invalidate Redis cache
        await redis.del(`parcel:${data.ulpin}`)
        break

      case 'title-transferred':
        await db.query(
          `UPDATE parcels SET owner_address=$1, title_status='CLEAR', updated_at=NOW() WHERE token_id=$2`,
          [data.to, data.tokenId]
        )
        await db.query(
          `INSERT INTO transactions (token_id, seller_address, buyer_address, completion_transaction_hash, status, completed_at)
           VALUES ($1, $2, $3, $4, 'COMPLETED', NOW())
           ON CONFLICT DO NOTHING`,
          [data.tokenId, data.from, data.to, data.txHash]
        )
        break

      case 'parcel-frozen':
        await db.query(
          `UPDATE parcels SET title_status='FROZEN', updated_at=NOW() WHERE token_id=$1`,
          [data.tokenId]
        )
        break

      case 'parcel-unfrozen':
        await db.query(
          `UPDATE parcels SET title_status='CLEAR', updated_at=NOW() WHERE token_id=$1`,
          [data.tokenId]
        )
        break

      case 'encumbrance-updated':
        await db.query(
          `UPDATE parcels SET title_status=$1, updated_at=NOW() WHERE token_id=$2`,
          [data.hasEncumbrance ? 'ENCUMBERED' : 'CLEAR', data.tokenId]
        )
        break

      case 'dispute-registered':
        await db.query(
          `INSERT INTO disputes (token_id, case_number, court_name, court_level, status, filing_date)
           VALUES ($1, $2, $3, $4, 'FILED', NOW())
           ON CONFLICT (case_number) DO NOTHING`,
          [data.tokenId, data.caseNumber, data.courtName, data.courtLevel]
        )
        await db.query(
          `UPDATE parcels SET title_status='DISPUTED', updated_at=NOW() WHERE token_id=$1`,
          [data.tokenId]
        )
        break

      default:
        console.log(`[Worker] Unhandled job: ${name}`)
    }
  },
  { connection: { url: process.env.REDIS_URL }, concurrency: 5 }
)

worker.on('completed', (job) => console.log(`[Worker] Job ${job.id} (${job.name}) completed`))
worker.on('failed', (job, err) => console.error(`[Worker] Job ${job?.id} failed:`, err.message))

// ── Reconnect on WebSocket disconnect ────────────────────────────
provider.on('error', (err) => {
  console.error('[Indexer] Provider error:', err.message)
})

console.log('✓ BhoomiChain Blockchain Event Indexer running')
console.log(`  → Listening on Sepolia: LandRegistry @ ${deployedAddresses.LandRegistry}`)
