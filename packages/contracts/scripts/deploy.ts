import { ethers, upgrades } from "hardhat";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

interface DeployedAddresses {
  LandRegistry: string;
  TransferDeed: string;
  StampDuty: string;
  DisputeOracle: string;
  IdentityVerifier: string;
  LandAuction: string;
  AuditLogger: string;
  network: string;
  deployedAt: string;
  deployer: string;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("═══════════════════════════════════════════");
  console.log("    BhoomiChain Smart Contract Deployment");
  console.log("═══════════════════════════════════════════");
  console.log(`Network:  ${network.name} (chainId: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(
    `Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`
  );
  console.log("═══════════════════════════════════════════\n");

  const addresses: Partial<DeployedAddresses> = {};

  // ─── 1. Deploy IdentityVerifier ────────────────────────────────────
  console.log("1/7 Deploying IdentityVerifier...");
  const IdentityVerifier = await ethers.getContractFactory("IdentityVerifier");
  const identityVerifier = await upgrades.deployProxy(
    IdentityVerifier,
    [deployer.address],
    { kind: "uups", initializer: "initialize" }
  );
  await identityVerifier.waitForDeployment();
  addresses.IdentityVerifier = await identityVerifier.getAddress();
  console.log(`   ✓ IdentityVerifier: ${addresses.IdentityVerifier}\n`);

  // ─── 2. Deploy StampDuty ───────────────────────────────────────────
  console.log("2/7 Deploying StampDuty...");
  const StampDuty = await ethers.getContractFactory("StampDuty");
  const stampDuty = await upgrades.deployProxy(
    StampDuty,
    [deployer.address],
    { kind: "uups", initializer: "initialize" }
  );
  await stampDuty.waitForDeployment();
  addresses.StampDuty = await stampDuty.getAddress();
  console.log(`   ✓ StampDuty: ${addresses.StampDuty}\n`);

  // ─── 3. Deploy LandRegistry ────────────────────────────────────────
  console.log("3/7 Deploying LandRegistry...");
  const LandRegistry = await ethers.getContractFactory("LandRegistry");
  const landRegistry = await upgrades.deployProxy(
    LandRegistry,
    [deployer.address, "ipfs://"],
    { kind: "uups", initializer: "initialize" }
  );
  await landRegistry.waitForDeployment();
  addresses.LandRegistry = await landRegistry.getAddress();
  console.log(`   ✓ LandRegistry: ${addresses.LandRegistry}\n`);

  // ─── 4. Deploy AuditLogger ─────────────────────────────────────────
  console.log("4/7 Deploying AuditLogger...");
  const AuditLogger = await ethers.getContractFactory("AuditLogger");
  const auditLogger = await upgrades.deployProxy(
    AuditLogger,
    [deployer.address],
    { kind: "uups", initializer: "initialize" }
  );
  await auditLogger.waitForDeployment();
  addresses.AuditLogger = await auditLogger.getAddress();
  console.log(`   ✓ AuditLogger: ${addresses.AuditLogger}\n`);

  // ─── 5. Deploy DisputeOracle ───────────────────────────────────────
  console.log("5/7 Deploying DisputeOracle...");
  const DisputeOracle = await ethers.getContractFactory("DisputeOracle");
  const disputeOracle = await upgrades.deployProxy(
    DisputeOracle,
    [deployer.address, addresses.LandRegistry],
    { kind: "uups", initializer: "initialize" }
  );
  await disputeOracle.waitForDeployment();
  addresses.DisputeOracle = await disputeOracle.getAddress();
  console.log(`   ✓ DisputeOracle: ${addresses.DisputeOracle}\n`);

  // ─── 6. Deploy TransferDeed ────────────────────────────────────────
  console.log("6/7 Deploying TransferDeed...");
  const TransferDeed = await ethers.getContractFactory("TransferDeed");
  const transferDeed = await upgrades.deployProxy(
    TransferDeed,
    [
      deployer.address,
      addresses.LandRegistry,
      addresses.IdentityVerifier,
      addresses.StampDuty,
      deployer.address, // platform treasury (update in production)
    ],
    { kind: "uups", initializer: "initialize" }
  );
  await transferDeed.waitForDeployment();
  addresses.TransferDeed = await transferDeed.getAddress();
  console.log(`   ✓ TransferDeed: ${addresses.TransferDeed}\n`);

  // ─── 7. Deploy LandAuction ─────────────────────────────────────────
  console.log("7/7 Deploying LandAuction...");
  const LandAuction = await ethers.getContractFactory("LandAuction");
  const landAuction = await upgrades.deployProxy(
    LandAuction,
    [deployer.address, addresses.LandRegistry],
    { kind: "uups", initializer: "initialize" }
  );
  await landAuction.waitForDeployment();
  addresses.LandAuction = await landAuction.getAddress();
  console.log(`   ✓ LandAuction: ${addresses.LandAuction}\n`);

  // ─── Post-deployment configuration ─────────────────────────────────
  console.log("Configuring contract interconnections...");

  // Set TransferDeed address in LandRegistry
  const lr = await ethers.getContractAt("LandRegistry", addresses.LandRegistry!);
  const tx1 = await lr.setTransferDeedContract(addresses.TransferDeed!);
  await tx1.wait();
  console.log("   ✓ LandRegistry → TransferDeed address set");

  // Grant COURT_ROLE to DisputeOracle in LandRegistry
  const COURT_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COURT_ROLE"));
  const tx2 = await lr.grantRole(COURT_ROLE, addresses.DisputeOracle!);
  await tx2.wait();
  console.log("   ✓ LandRegistry → COURT_ROLE granted to DisputeOracle");

  // Grant MINTER_ROLE to backend wallet (using deployer for now)
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  console.log(`   ✓ MINTER_ROLE held by deployer: ${deployer.address}`);

  // ─── Seed initial stamp duty rates ─────────────────────────────────
  console.log("\nSeeding initial stamp duty rates...");
  const sd = await ethers.getContractAt("StampDuty", addresses.StampDuty!);

  // Maharashtra rates (example)
  const tx3 = await sd.setDutyRate("MH", "MUMBAI", 1, 600); // Residential 6%
  await tx3.wait();
  const tx4 = await sd.setDutyRate("MH", "MUMBAI", 2, 700); // Commercial 7%
  await tx4.wait();
  const tx5 = await sd.setDutyRate("MH", "PUNE", 1, 600);
  await tx5.wait();

  // Delhi rates
  const tx6 = await sd.setDutyRate("DL", "NEW_DELHI", 1, 600);
  await tx6.wait();
  const tx7 = await sd.setDutyRate("DL", "NEW_DELHI", 2, 800);
  await tx7.wait();

  // UP rates
  const tx8 = await sd.setDutyRate("UP", "LUCKNOW", 1, 700);
  await tx8.wait();
  const tx9 = await sd.setDutyRate("UP", "NOIDA", 1, 700);
  await tx9.wait();

  console.log("   ✓ Stamp duty rates seeded for MH, DL, UP\n");

  // ─── Save deployment info ──────────────────────────────────────────
  const deploymentInfo: DeployedAddresses = {
    ...(addresses as DeployedAddresses),
    network: network.name,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };

  const deploymentsDir = join(__dirname, "../deployments");
  try {
    mkdirSync(deploymentsDir, { recursive: true });
  } catch {}

  const filename = join(deploymentsDir, `${network.name}-${Date.now()}.json`);
  writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));

  // Also write to a "latest" file
  writeFileSync(
    join(deploymentsDir, `${network.name}-latest.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("═══════════════════════════════════════════");
  console.log("    Deployment Complete!");
  console.log("═══════════════════════════════════════════");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment saved to: ${filename}`);
  console.log("\nNext step: Run verification script");
  console.log("npx hardhat run scripts/verify.ts --network sepolia");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
