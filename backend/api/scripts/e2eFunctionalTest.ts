import { ethers } from 'ethers';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Load ABI and Addresses
import deployedAddresses from '../../../packages/contracts/deployments/sepolia-latest.json' assert { type: 'json' };

const LAND_REGISTRY_ABI = [
  "function mintLandTitle(address to, string ulpin, string ipfsDocHash, bytes32 sha256DocHash, uint8 landType, uint256 areaInSqm, string districtCode, string stateCode, int256[] latitudes, int256[] longitudes) external returns (uint256)",
  "function ownerOf(uint256 tokenId) public view returns (address)"
];

async function runE2ETest() {
  console.log('\n🚀 STARTING END-TO-END FUNCTIONAL TEST...');
  console.log('═══════════════════════════════════════════\n');

  const provider = new ethers.JsonRpcProvider(`https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
  const landRegistry = new ethers.Contract(deployedAddresses.LandRegistry, LAND_REGISTRY_ABI, wallet);

  // 1. Generate a unique ULPIN for this test
  const testUlpin = `${Math.floor(10000000000000 + Math.random() * 90000000000000)}`; // 14 digits
  const testArea = 1200; 
  const testIpfs = "QmTestHash" + Date.now();
  const testSha256 = ethers.keccak256(ethers.toUtf8Bytes("test-doc"));
  const testCoords = {
    lats: [19076000, 19076500, 19077000, 19076000],
    longs: [72877000, 72877500, 72878000, 72877000]
  };

  console.log(`[1/4] Minting Land Parcel on Sepolia...`);
  console.log(`      ULPIN: ${testUlpin}`);
  
  try {
    const tx = await landRegistry.mintLandTitle(
      wallet.address,
      testUlpin,
      testIpfs,
      testSha256,
      1, // LandType.RESIDENTIAL
      testArea,
      "MUM",
      "MH",
      testCoords.lats,
      testCoords.longs
    );
    console.log(`      Transaction Sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`   ✅ Minting Successful! (Block: ${receipt.blockNumber})\n`);

    // 2. Wait for Indexer to catch the event
    console.log(`[2/4] Waiting for Indexer to sync with Database (this may take 30-60s)...`);
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    let foundInDb = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 75; // 75 * 4s = 5 minutes
    while (!foundInDb && attempts < MAX_ATTEMPTS) {
      const res = await client.query('SELECT * FROM parcels WHERE ulpin = $1', [testUlpin]);
      if (res.rowCount > 0) {
        foundInDb = true;
        console.log(`   ✅ Indexer synced successfully! Land record found in PostgreSQL.\n`);
      } else {
        attempts++;
        process.stdout.write('.');
        await new Promise(r => setTimeout(r, 4000)); // Wait 4 seconds per check
      }
    }
    await client.end();

    if (!foundInDb) {
      throw new Error("Indexer failed to sync within the timeout period.");
    }

    // 3. Test API Search
    console.log(`[3/4] Testing API Search (Simulating UI Search)...`);
    const apiPort = process.env.API_PORT || 4000;
    const apiResponse = await fetch(`http://localhost:${apiPort}/api/parcels/search?q=${testUlpin}`);
    
    if (apiResponse.ok) {
      const results = await apiResponse.json();
      if (results.length > 0 && results[0].ulpin === testUlpin) {
        console.log(`   ✅ API returned correct land data!\n`);
      } else {
        throw new Error("API search returned no results or incorrect data.");
      }
    } else {
      throw new Error(`API Search failed with status: ${apiResponse.status}`);
    }

    // 4. Final Verification
    console.log(`[4/4] Final Verification...`);
    console.log(`   💎 Blockchain State: Verified`);
    console.log(`   🐘 Database State:   Verified`);
    console.log(`   🚀 API State:        Verified`);

    console.log('\n═══════════════════════════════════════════');
    console.log('  🎉 FUNCTIONAL TEST: ALL SYSTEMS GO!');
    console.log('═══════════════════════════════════════════\n');
    process.exit(0);

  } catch (err: any) {
    console.error('\n❌ FUNCTIONAL TEST FAILED!');
    console.error(`Reason: ${err.message}`);
    process.exit(1);
  }
}

runE2ETest();
