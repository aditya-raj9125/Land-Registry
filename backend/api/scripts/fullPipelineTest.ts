import { ethers } from 'ethers';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import deployedAddresses from '../../../packages/contracts/deployments/sepolia-latest.json';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function runFullPipelineTest() {
  console.log('\n🚀 STARTING BHOOMICHAIN FULL PIPELINE INTEGRATION TEST');
  console.log('═══════════════════════════════════════════════════════\n');

  const provider = new ethers.JsonRpcProvider(`https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
  const contract = new ethers.Contract(deployedAddresses.LandRegistry, [
    "function mintLandTitle(address to, string ulpin, string ipfsDocHash, bytes32 sha256DocHash, uint8 landType, uint256 areaInSqm, string districtCode, string stateCode, int256[] latitudes, int256[] longitudes) external returns (uint256)"
  ], wallet);

  const testUlpin = `BC${Date.now().toString().slice(-12)}`;
  const testOwner = "0x0aF9Fda601342715aac0A63e6Cb0CF99c30845f3";

  // --- PHASE 1: GOVERNMENT UPLOAD ---
  console.log(`[1/3] GOVERNMENT PORTAL: Minting Land Title...`);
  console.log(`      ULPIN: ${testUlpin}`);
  
  const tx = await contract.mintLandTitle(
    testOwner,
    testUlpin,
    "QmTest" + Date.now(),
    ethers.ZeroHash,
    1, // Residential
    1500,
    "MUM",
    "MH",
    [19076000n, 19076500n, 19076500n, 19076000n], // 4 points (square)
    [72877000n, 72877000n, 72877500n, 72877500n]  
  );
  
  console.log(`      Transaction Sent: ${tx.hash}`);
  await tx.wait();
  console.log(`      ✓ Transaction Confirmed on Sepolia.\n`);

  // --- PHASE 2: INDEXER SYNC ---
  console.log(`[2/3] BHOOMICHAIN INDEXER: Waiting for database synchronization...`);
  console.log(`      (This usually takes 20-40 seconds for the indexer to pick up the block)`);
  
  let found = false;
  let attempts = 0;
  const maxAttempts = 15;

  while (!found && attempts < maxAttempts) {
    attempts++;
    process.stdout.write(`      Attempt ${attempts}/${maxAttempts}... `);
    
    try {
      const response = await axios.get(`http://localhost:4000/api/parcels/search?q=${testUlpin}`);
      if (response.data && response.data.length > 0) {
        found = true;
        console.log('\n      ✓ Record found in National Database!');
      } else {
        console.log('pending...');
        await new Promise(r => setTimeout(r, 5000));
      }
    } catch (e) {
      console.log('API unreachable, waiting...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  if (!found) {
    console.error('\n❌ ERROR: Indexer sync timed out. Is the indexer running?');
    process.exit(1);
  }

  // --- PHASE 3: CITIZEN SEARCH ---
  console.log(`\n[3/3] CITIZEN PORTAL: Verifying public record accessibility...`);
  try {
    const finalCheck = await axios.get(`http://localhost:4000/api/parcels/${testUlpin}`);
    console.log(`      ✓ PUBLIC DATA RETRIEVED:`);
    console.log(`      ULPIN: ${finalCheck.data.ulpin}`);
    console.log(`      Owner Hash: ${finalCheck.data.owner_address.slice(0, 10)}...`);
    console.log(`      Area: ${finalCheck.data.area_sqm} Sqm`);
    console.log(`      State: ${finalCheck.data.state_code}\n`);
    
    console.log('🎉 SUCCESS: Full pipeline verified from Blockchain to Public UI API!');
  } catch (err) {
    console.error('❌ ERROR: Final public retrieval failed.');
    process.exit(1);
  }
}

runFullPipelineTest().catch(console.error);
