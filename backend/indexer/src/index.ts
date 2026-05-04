import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

import { ethers } from 'ethers'
import { Queue, Worker } from 'bullmq'
import { db } from '../../api/src/lib/db'
import { redis } from '../../api/src/lib/redis'

// Load deployed addresses
import deployedAddresses from '../../../packages/contracts/deployments/sepolia-latest.json' assert { type: 'json' }

// Minimal ABIs for event listening
const LAND_REGISTRY_ABI = [
  'event ParcelMinted(uint256 indexed tokenId, string ulpin, address indexed owner, string ipfsDocHash, uint256 areaInSqm)',
  'event TitleTransferred(uint256 indexed tokenId, address indexed from, address indexed to, uint256 timestamp)',
  'event EncumbranceUpdated(uint256 indexed tokenId, bool hasEncumbrance, string details)',
  'event ParcelFrozen(uint256 indexed tokenId, string reason)',
  'event ParcelUnfrozen(uint256 indexed tokenId, string reason)',
  'function getLandDetails(uint256 tokenId) external view returns (tuple(string ulpin, string ipfsDocHash, bytes32 sha256DocHash, uint8 landType, uint256 areaInSqm, string districtCode, string stateCode, bool hasEncumbrance, bool isFrozen, uint8 titleStatus, uint256 askingPrice, uint256 mintedAt, uint256 updatedAt))',
  'function getLandCoordinates(uint256 tokenId) external view returns (tuple(int256 latitude, int256 longitude)[])',
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

// ── Startup Catch-up Logic ──────────────────────────────────────────
async function syncHistoricalEvents() {
  console.log('[Indexer] Starting historical sync...')
  try {
    // Get last processed block from DB
    const res = await db.query('SELECT MAX(mint_block_number) as last_block FROM parcels')
    const lastBlock = res.rows[0].last_block || 10780000; // Start from recent block if DB is empty
    const currentBlock = await provider.getBlockNumber()
    
    console.log(`[Indexer] Syncing from block ${lastBlock} to ${currentBlock}...`)
    
    if (currentBlock > lastBlock) {
      const CHUNK_SIZE = 10;
      for (let i = lastBlock + 1; i <= currentBlock; i += CHUNK_SIZE) {
        const toBlock = Math.min(i + CHUNK_SIZE - 1, currentBlock);
        process.stdout.write(`\r[Indexer] Progress: ${(( (toBlock - lastBlock) / (currentBlock - lastBlock) ) * 100).toFixed(1)}%`);
        
        const logs = await landRegistry.queryFilter('ParcelMinted', i, toBlock)
        for (const log of logs) {
          if (log instanceof ethers.EventLog) {
            const { tokenId, ulpin, owner, ipfsDocHash, areaInSqm } = log.args
            await handleParcelMinted(tokenId, ulpin, owner, ipfsDocHash, areaInSqm, log)
          }
        }
      }
      console.log(`\n[Indexer] Historical sync complete.`)
    }
  } catch (err: any) {
    console.error('[Indexer] Sync failed:', err.message)
  }
}

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
        try {
          // Deep Sync: Fetch full metadata from the contract
          const details = await landRegistry.getLandDetails(data.tokenId);
          const coords = await landRegistry.getLandCoordinates(data.tokenId);
          
          await db.query(
            `INSERT INTO parcels (
              token_id, ulpin, owner_address, ipfs_document_hash, 
              land_type, area_sqm, district_code, state_code,
              title_status, mint_transaction_hash, mint_block_number, 
              created_at, updated_at
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', $9, $10, NOW(), NOW())
             ON CONFLICT (ulpin) DO UPDATE SET 
              owner_address=$3, 
              land_type=$5, 
              area_sqm=$6, 
              district_code=$7, 
              state_code=$8,
              updated_at=NOW()`,
            [
              data.tokenId, 
              data.ulpin, 
              data.owner, 
              data.ipfsDocHash,
              ['AGRICULTURAL','RESIDENTIAL','COMMERCIAL','INDUSTRIAL','FOREST','GOVERNMENT','MIXED'][Number(details.landType)] || 'AGRICULTURAL',
              Number(details.areaInSqm),
              details.districtCode,
              details.stateCode,
              data.txHash, 
              data.blockNumber
            ]
          )
          
          // Store coordinates if the table exists
          for (const coord of coords) {
            await db.query(
              `INSERT INTO parcel_coordinates (token_id, latitude, longitude) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
              [data.tokenId, Number(coord.latitude), Number(coord.longitude)]
            ).catch(() => {}); // Ignore if table doesn't exist yet
          }

          // Invalidate Redis cache
          await redis.del(`parcel:${data.ulpin}`)
          console.log(`[Worker] Deep Sync Successful for ULPIN: ${data.ulpin}`)
        } catch (err: any) {
          console.error(`[Worker] Deep Sync Failed for ULPIN ${data.ulpin}:`, err.message)
        }
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

async function main() {
  console.log('────────────────────────────────────────────────')
  console.log('🏛️  BHOOMICHAIN INDEXER STARTING')
  console.log(`📂 DB_URL: ${process.env.DATABASE_URL ? 'LOADED' : 'MISSING'}`)
  console.log('────────────────────────────────────────────────')

  // Perform catch-up sync for missed events
  await syncHistoricalEvents()

  console.log('✅ Indexer is now listening for real-time events...')
}

main().catch(err => {
  console.error('[Indexer] Fatal error during startup:', err)
  process.exit(1)
})
