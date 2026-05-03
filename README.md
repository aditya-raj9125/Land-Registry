# BhoomiChain — India Blockchain Land Registry System



BhoomiChain is a **ministerial-grade, end-to-end blockchain land registry system** built for the Indian government. It aims to digitize land records, prevent benami transactions, streamline property transfers, and provide an immutable audit trail for all land-related actions. Every piece of land in India is represented as a unique ERC-721 token (NFT) linked to a 14-digit Bhu-Aadhaar (ULPIN).

## 🌟 Key Features

- **Immutable Title Records**: Land ownership is recorded as ERC-721 NFTs. No unauthorized entity can alter the records.
- **Privacy-First Identity Verification**: Aadhaar and PAN are hashed (using `keccak256`) before being stored on-chain to protect citizen privacy.
- **Automated Stamp Duty**: Smart contracts enforce district-level circle rates and automatically calculate stamp duties, including female ownership discounts.
- **Government Multi-Sig Escrow**: Property transfers require a 2-of-3 multi-signature approval from government officials, eliminating bribery and unauthorized mutations.
- **Dispute & Encumbrance Oracle**: Integrates with the e-Courts API to automatically freeze land parcels involved in litigation. Citizens can also report suspected disputes via a staked mechanism.
- **NRI Protection Module**: Non-Resident Indians (NRIs) can grant on-chain Power of Attorney (PoA), enable multi-sig security modes, and receive instant mutation alerts.
- **Immutable Audit Trail**: Every significant action (minting, transfer, dispute, login) is logged immutably via the `AuditLogger` smart contract.

## 🏗️ Architecture & Tech Stack

This project is structured as a **Turborepo Monorepo**, ensuring clean separation of concerns and optimized build times.

### Technology Stack
- **Smart Contracts**: Solidity ^0.8.24, Hardhat, OpenZeppelin (UUPS Upgradeable v5)
- **Frontend (Public dApp & Gov Portal)**: Next.js 15, React 19, Tailwind CSS v4, Wagmi v2, RainbowKit
- **Backend API**: Express 5, tRPC, PostgreSQL + PostGIS (Geospatial), Redis
- **Event Indexer**: BullMQ, Alchemy WebSockets
- **Infrastructure**: Turborepo, TypeScript

### Monorepo Structure

```text
BhoomiChain/
├── apps/
│   ├── web/                 # Public dApp (Next.js 15)
│   └── gov/                 # Government portal (Next.js 15)
├── packages/
│   └── contracts/           # Hardhat smart contracts
│       ├── contracts/       # All 7 Solidity contracts
│       ├── scripts/         # Deploy + verify scripts
│       └── test/            # 23-test Hardhat suite
├── backend/
│   ├── api/                 # Express 5 REST API
│   └── indexer/             # Blockchain event indexer
├── .env.example             # Environment variable template
└── turbo.json               # Turborepo task configuration
```

## 📜 Smart Contract Suite

All smart contracts are **UUPS-upgradeable**, ensuring the government can upgrade logic without losing state. 

| Contract | Purpose |
|---|---|
| `LandRegistry.sol` | Master ERC-721 land title NFT, ULPIN uniqueness, RBAC gating. |
| `IdentityVerifier.sol` | Aadhaar/PAN hashing, PoA, NRI flags, multi-sig modes. |
| `StampDuty.sol` | Circle rate enforcement, female discount, 48h update timelocks. |
| `DisputeOracle.sol` | Court-level freeze/unfreeze, civil society staked reporting. |
| `AuditLogger.sol` | Append-only immutable on-chain audit trail for 25 action types. |
| `TransferDeed.sol` | Escrow state machine, 2-of-3 gov multi-sig, mutation trigger. |
| `LandAuction.sol` | Anti-sniping auctions, reserve price enforcement. |

> **Note on Upgrade Safety**: A custom `ReentrancyGuardUpgradeable.sol` using ERC-7201 namespaced storage was implemented to ensure full OpenZeppelin v5 compatibility for UUPS contracts.

## 🚀 Getting Started

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL with PostGIS extension installed
- Redis instance running

### 1. Environment Setup

Copy the example environment file and fill in your keys:

```bash
cp .env.example .env
```

You will need:
- Alchemy API Key (for Sepolia)
- Deployer Private Key
- Etherscan API Key
- Mapbox Token

### 2. Install Dependencies

Install all dependencies across the monorepo:

```bash
npm install
```

### 3. Database Setup

Ensure your PostgreSQL instance is running, then apply the schema:

```bash
psql $DATABASE_URL -f backend/api/src/db/schema.sql
```

### 4. Smart Contract Deployment

Compile the smart contracts and deploy them to the Sepolia testnet:

```bash
npm run contracts:compile
npm run contracts:deploy
```

*After deployment, update your `.env` with the newly generated contract addresses.*

### 5. Running the Application

You can start specific services using Turborepo commands:

```bash
# Start the Public Web dApp
npm run web:dev

# Start the Government Portal
npm run gov:dev

# Start the Backend API
npm run api:dev

# Run all tests (23/23 passing)
npm run contracts:test
```

## 🧪 Testing

The smart contract suite has full coverage via Hardhat and Chai. To run the tests:

```bash
npm run contracts:test
```
*Current Status: 23/23 passing across all 7 smart contracts.*

## 📄 License

This project is proprietary and confidential.

---
*Built with ❤️ for a transparent and digital India.*
