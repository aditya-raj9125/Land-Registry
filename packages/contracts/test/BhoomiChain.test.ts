import { expect } from 'chai'
import hre, { ethers } from 'hardhat'
import { LandRegistry, IdentityVerifier, StampDuty, TransferDeed, DisputeOracle, AuditLogger, LandAuction } from '../typechain-types'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'

const upgrades = (hre as any).upgrades

describe('BhoomiChain Smart Contracts', () => {
  let admin: HardhatEthersSigner
  let minter: HardhatEthersSigner
  let officer: HardhatEthersSigner
  let seller: HardhatEthersSigner
  let buyer: HardhatEthersSigner
  let courtRole: HardhatEthersSigner
  let govApprover1: HardhatEthersSigner
  let govApprover2: HardhatEthersSigner

  let landRegistry: LandRegistry
  let identityVerifier: IdentityVerifier
  let stampDuty: StampDuty
  let transferDeed: TransferDeed
  let disputeOracle: DisputeOracle
  let auditLogger: AuditLogger
  let landAuction: LandAuction

  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'))
  const COURT_ROLE = ethers.keccak256(ethers.toUtf8Bytes('COURT_ROLE'))
  const GOV_APPROVER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('GOV_APPROVER_ROLE'))
  const ORACLE_ROLE = ethers.keccak256(ethers.toUtf8Bytes('ORACLE_ROLE'))
  const KYC_ROLE = ethers.keccak256(ethers.toUtf8Bytes('KYC_ROLE'))
  const LOGGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('LOGGER_ROLE'))

  const SAMPLE_ULPIN = '14010100000001'
  const SAMPLE_IPFS = 'QmXyz123abc456def789'
  const SAMPLE_SHA256 = ethers.keccak256(ethers.toUtf8Bytes('sample-document'))
  const SAMPLE_LATS = [ethers.toBigInt('25614000'), ethers.toBigInt('25615000'), ethers.toBigInt('25612000')]
  const SAMPLE_LNGS = [ethers.toBigInt('85095000'), ethers.toBigInt('85098000'), ethers.toBigInt('85099000')]

  before(async () => {
    [admin, minter, officer, seller, buyer, courtRole, govApprover1, govApprover2] = await ethers.getSigners()

    // Deploy all contracts
    const IdentityVerifierFactory = await ethers.getContractFactory('IdentityVerifier')
    identityVerifier = (await upgrades.deployProxy(IdentityVerifierFactory, [admin.address], { kind: 'uups' })) as unknown as IdentityVerifier

    const StampDutyFactory = await ethers.getContractFactory('StampDuty')
    stampDuty = (await upgrades.deployProxy(StampDutyFactory, [admin.address], { kind: 'uups' })) as unknown as StampDuty

    const LandRegistryFactory = await ethers.getContractFactory('LandRegistry')
    landRegistry = (await upgrades.deployProxy(LandRegistryFactory, [admin.address, 'ipfs://'], { kind: 'uups' })) as unknown as LandRegistry

    const AuditLoggerFactory = await ethers.getContractFactory('AuditLogger')
    auditLogger = (await upgrades.deployProxy(AuditLoggerFactory, [admin.address], { kind: 'uups' })) as unknown as AuditLogger

    const DisputeOracleFactory = await ethers.getContractFactory('DisputeOracle')
    disputeOracle = (await upgrades.deployProxy(DisputeOracleFactory, [admin.address, await landRegistry.getAddress()], { kind: 'uups' })) as unknown as DisputeOracle

    const TransferDeedFactory = await ethers.getContractFactory('TransferDeed')
    transferDeed = (await upgrades.deployProxy(TransferDeedFactory, [
      admin.address,
      await landRegistry.getAddress(),
      await identityVerifier.getAddress(),
      await stampDuty.getAddress(),
      admin.address,
    ], { kind: 'uups' })) as unknown as TransferDeed

    const LandAuctionFactory = await ethers.getContractFactory('LandAuction')
    landAuction = (await upgrades.deployProxy(LandAuctionFactory, [admin.address, await landRegistry.getAddress()], { kind: 'uups' })) as unknown as LandAuction

    // Setup roles
    await landRegistry.setTransferDeedContract(await transferDeed.getAddress())
    await landRegistry.grantRole(MINTER_ROLE, minter.address)
    await landRegistry.grantRole(COURT_ROLE, await disputeOracle.getAddress())
    await identityVerifier.grantRole(KYC_ROLE, officer.address)
    await transferDeed.grantRole(GOV_APPROVER_ROLE, govApprover1.address)
    await transferDeed.grantRole(GOV_APPROVER_ROLE, govApprover2.address)
    await auditLogger.grantRole(LOGGER_ROLE, admin.address)

    // Verify seller and buyer identities
    const sellerAadhaarHash = ethers.keccak256(ethers.toUtf8Bytes('seller-aadhaar-123456789012'))
    const buyerAadhaarHash = ethers.keccak256(ethers.toUtf8Bytes('buyer-aadhaar-987654321098'))
    await identityVerifier.connect(officer).verifyIdentity(seller.address, sellerAadhaarHash, 1)
    await identityVerifier.connect(officer).verifyIdentity(buyer.address, buyerAadhaarHash, 2)
  })

  // ── LandRegistry Tests ────────────────────────────────────────────
  describe('LandRegistry', () => {
    it('Should deploy with correct name and symbol', async () => {
      expect(await landRegistry.name()).to.equal('BhoomiChain Land Title')
      expect(await landRegistry.symbol()).to.equal('BHMI')
    })

    it('Should mint a land title NFT', async () => {
      const tx = await landRegistry.connect(minter).mintLandTitle(
        seller.address, SAMPLE_ULPIN, SAMPLE_IPFS, SAMPLE_SHA256,
        0, // AGRICULTURAL
        9762, // area in sqm
        'PATNA', 'BIHAR',
        SAMPLE_LATS, SAMPLE_LNGS
      )
      const receipt = await tx.wait()
      expect(receipt?.status).to.equal(1)

      const tokenId = await landRegistry.getTokenByUlpin(SAMPLE_ULPIN)
      expect(tokenId).to.equal(1n)
      expect(await landRegistry.ownerOf(1n)).to.equal(seller.address)
    })

    it('Should return correct land details', async () => {
      const details = await landRegistry.getLandDetails(1n)
      expect(details.ulpin).to.equal(SAMPLE_ULPIN)
      expect(details.areaInSqm).to.equal(9762n)
      expect(details.districtCode).to.equal('PATNA')
    })

    it('Should return coordinates', async () => {
      const coords = await landRegistry.getLandCoordinates(1n)
      expect(coords.length).to.equal(3)
      expect(coords[0].latitude).to.equal(SAMPLE_LATS[0])
    })

    it('Should prevent duplicate ULPIN minting', async () => {
      await expect(
        landRegistry.connect(minter).mintLandTitle(
          seller.address, SAMPLE_ULPIN, SAMPLE_IPFS, SAMPLE_SHA256,
          0, 9762, 'PATNA', 'BIHAR', SAMPLE_LATS, SAMPLE_LNGS
        )
      ).to.be.revertedWith('LandRegistry: ULPIN already minted')
    })

    it('Should reject non-minter attempting to mint', async () => {
      await expect(
        landRegistry.connect(buyer).mintLandTitle(
          buyer.address, '14010100000002', SAMPLE_IPFS, SAMPLE_SHA256,
          0, 5000, 'PATNA', 'BIHAR', SAMPLE_LATS, SAMPLE_LNGS
        )
      ).to.be.reverted
    })

    it('Should prevent direct transfer (must go through TransferDeed)', async () => {
      await expect(
        landRegistry.connect(seller).transferFrom(seller.address, buyer.address, 1n)
      ).to.be.revertedWith('LandRegistry: transfers only via TransferDeed contract')
    })

    it('Should allow setting asking price by owner', async () => {
      const price = ethers.parseEther('0.42')
      await landRegistry.connect(seller).setAskingPrice(1n, price)
      const details = await landRegistry.getLandDetails(1n)
      expect(details.askingPrice).to.equal(price)
    })
  })

  // ── IdentityVerifier Tests ────────────────────────────────────────
  describe('IdentityVerifier', () => {
    it('Should verify an identity', async () => {
      expect(await identityVerifier.isVerified(seller.address)).to.equal(true)
      expect(await identityVerifier.isVerified(buyer.address)).to.equal(true)
    })

    it('Should reject unverified address', async () => {
      const [, , , , , , , , unknown] = await ethers.getSigners()
      expect(await identityVerifier.isVerified(unknown.address)).to.equal(false)
    })

    it('Should store gender correctly', async () => {
      const gender = await identityVerifier.getGender(buyer.address)
      expect(gender).to.equal(2n) // FEMALE
    })

    it('Should grant PoA with time limit', async () => {
      const expiry = Math.floor(Date.now() / 1000) + 86400 * 30 // 30 days
      const tx = await identityVerifier.connect(seller).grantPoA(buyer.address, [1n], [4], expiry) // ALL actions
      const receipt = await tx.wait()
      expect(receipt?.status).to.equal(1)
    })
  })

  // ── StampDuty Tests ───────────────────────────────────────────────
  describe('StampDuty', () => {
    it('Should set and retrieve duty rates', async () => {
      await stampDuty.setDutyRate('BIHAR', 'PATNA', 0, 500) // Agricultural 5%
      const rate = await stampDuty.dutyRates('BIHAR', 'PATNA', 0)
      expect(rate.rateBps).to.equal(500n)
      expect(rate.exists).to.equal(true)
    })

    it('Should calculate duty correctly', async () => {
      const price = ethers.parseEther('1') // 1 ETH
      const [, taxableValue, dutyAmount, regFee, total] = await stampDuty.calculateDuty(1n, price, false)
      expect(taxableValue).to.equal(price)
      expect(dutyAmount).to.be.gt(0n)
      expect(total).to.equal(dutyAmount + regFee)
    })

    it('Should apply female buyer discount', async () => {
      const price = ethers.parseEther('1')
      const [, , dutyNoDiscount] = await stampDuty.calculateDuty(1n, price, false)
      const [, , dutyWithDiscount] = await stampDuty.calculateDuty(1n, price, true)
      expect(dutyWithDiscount).to.be.lt(dutyNoDiscount)
    })
  })

  // ── DisputeOracle Tests ───────────────────────────────────────────
  describe('DisputeOracle', () => {
    it('Should register a dispute and freeze the parcel', async () => {
      await disputeOracle.grantRole(COURT_ROLE, courtRole.address)

      const tx = await disputeOracle.connect(courtRole).registerDispute(
        1n, 'CASE/2025/01234', 'District Court Patna', 'Ram Prasad',
        Math.floor(Date.now() / 1000), 0 // DISTRICT
      )
      await tx.wait()

      const [isDisp] = await disputeOracle.isDisputed(1n)
      expect(isDisp).to.equal(true)

      const frozen = await landRegistry.isParcelFrozen(1n)
      expect(frozen).to.equal(true)
    })

    it('Should resolve dispute and unfreeze', async () => {
      await disputeOracle.connect(courtRole).resolveDispute(
        1n, 3, // RESOLVED
        'Ruled in favor of current owner',
        'QmOrderHash123', true
      )

      const [isDisp] = await disputeOracle.isDisputed(1n)
      expect(isDisp).to.equal(false)

      const frozen = await landRegistry.isParcelFrozen(1n)
      expect(frozen).to.equal(false)
    })

    it('Should allow civil society reporting with stake', async () => {
      const stake = ethers.parseEther('0.001')
      await expect(
        disputeOracle.connect(buyer).reportSuspectedDispute(1n, 'Suspected boundary encroachment on eastern side', { value: stake })
      ).to.emit(disputeOracle, 'SuspectedDisputeReported')
    })

    it('Should reject report with insufficient stake', async () => {
      await expect(
        disputeOracle.connect(buyer).reportSuspectedDispute(1n, 'Some dispute details here', { value: ethers.parseEther('0.0001') })
      ).to.be.revertedWith('DisputeOracle: insufficient stake')
    })
  })

  // ── AuditLogger Tests ─────────────────────────────────────────────
  describe('AuditLogger', () => {
    it('Should log entries immutably', async () => {
      const tx = await auditLogger.log(
        admin.address, 0, // PARCEL_MINTED
        1n, 'QmSomeHash', 'Initial mint for testing', ethers.keccak256(ethers.toUtf8Bytes('data'))
      )
      await tx.wait()
      expect(await auditLogger.getTotalLogs()).to.equal(1n)
    })

    it('Should retrieve log by ID', async () => {
      const log = await auditLogger.getLog(1n)
      expect(log.actor).to.equal(admin.address)
      expect(log.tokenId).to.equal(1n)
    })

    it('Should filter logs by actor', async () => {
      const logs = await auditLogger.getLogsByActor(admin.address)
      expect(logs.length).to.be.gt(0)
    })
  })

  // ── LandAuction Tests ─────────────────────────────────────────────
  describe('LandAuction', () => {
    it('Should be deployed correctly', async () => {
      const addr = await landAuction.getAddress()
      expect(addr).to.be.properAddress
    })
  })
})
