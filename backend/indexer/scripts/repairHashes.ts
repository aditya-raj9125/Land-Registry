import { ethers } from 'ethers'
import { db } from '../../api/src/lib/db'
import * as dotenv from 'dotenv'
import path from 'path'
import deployedAddresses from '../../../packages/contracts/deployments/sepolia-latest.json'

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })

const LAND_REGISTRY_ABI = [
  'event ParcelMinted(uint256 indexed tokenId, string ulpin, address indexed owner, string ipfsDocHash, uint256 areaInSqm)'
]

async function repair() {
  console.log('🛠️ REPAIRING MISSING BLOCKCHAIN HASHES...')
  
  const provider = new ethers.JsonRpcProvider(`https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`)
  const contract = new ethers.Contract(deployedAddresses.LandRegistry, LAND_REGISTRY_ABI, provider)

  // Find parcels with missing hashes
  const res = await db.query("SELECT token_id, ulpin FROM parcels WHERE mint_transaction_hash IS NULL OR mint_transaction_hash = ''")
  console.log(`Found ${res.rows.length} records to repair.`)

  for (const row of res.rows) {
    console.log(`Searching for ULPIN: ${row.ulpin}...`)
    
    // Query historical events to find the original mint transaction
    const logs = await contract.queryFilter(contract.filters.ParcelMinted(row.token_id))
    
    if (logs.length > 0) {
      const txHash = logs[0].transactionHash
      const blockNumber = logs[0].blockNumber
      
      await db.query(
        "UPDATE parcels SET mint_transaction_hash = $1, mint_block_number = $2 WHERE token_id = $3",
        [txHash, blockNumber, row.token_id]
      )
      console.log(`✓ Updated Token #${row.token_id} with hash: ${txHash.slice(0, 10)}...`)
    } else {
      console.log(`✗ Could not find mint event for Token #${row.token_id}`)
    }
  }

  console.log('✅ REPAIR COMPLETE!')
  process.exit(0)
}

repair().catch(console.error)
