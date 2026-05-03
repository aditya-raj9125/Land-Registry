-- BhoomiChain PostgreSQL Schema
-- Run with: psql $DATABASE_URL -f schema.sql

-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Parcels ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parcels (
  token_id            BIGINT PRIMARY KEY,
  ulpin               VARCHAR(14) UNIQUE NOT NULL,
  khasra_number       VARCHAR(50),
  district            VARCHAR(100),
  state               VARCHAR(100),
  village             VARCHAR(100),
  area_sqm            DECIMAL(12, 2),
  coordinates         GEOMETRY(POLYGON, 4326),  -- PostGIS polygon
  land_type           VARCHAR(20) CHECK (land_type IN ('AGRICULTURAL','RESIDENTIAL','COMMERCIAL','INDUSTRIAL','FOREST','GOVERNMENT','MIXED')),
  owner_address       VARCHAR(42),              -- Ethereum address
  owner_aadhaar_hash  BYTEA,                    -- keccak256 hash
  title_status        VARCHAR(20) DEFAULT 'PENDING' CHECK (title_status IN ('CLEAR','PENDING','DISPUTED','ENCUMBERED','FROZEN')),
  asking_price        DECIMAL(20, 8),           -- in ETH
  ipfs_document_hash  TEXT,
  sha256_document_hash BYTEA,
  encumbrance_details JSONB DEFAULT '{}',
  mint_transaction_hash VARCHAR(66),
  mint_block_number   BIGINT,
  road_access         VARCHAR(50),
  water_connection    BOOLEAN DEFAULT false,
  electricity         BOOLEAN DEFAULT false,
  is_irrigated        VARCHAR(20) DEFAULT 'NO',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Geospatial index for map queries
CREATE INDEX IF NOT EXISTS idx_parcels_coordinates ON parcels USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_parcels_district ON parcels(district);
CREATE INDEX IF NOT EXISTS idx_parcels_state ON parcels(state);
CREATE INDEX IF NOT EXISTS idx_parcels_status ON parcels(title_status);
CREATE INDEX IF NOT EXISTS idx_parcels_owner ON parcels(owner_address);

-- ── Transactions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id                   BIGINT UNIQUE,          -- from smart contract
  token_id                  BIGINT REFERENCES parcels(token_id),
  seller_address            VARCHAR(42),
  buyer_address             VARCHAR(42),
  agreed_price              DECIMAL(20, 8),
  stamp_duty                DECIMAL(20, 8),
  registration_fee          DECIMAL(20, 8),
  platform_fee              DECIMAL(20, 8),
  total_amount              DECIMAL(20, 8),
  status                    VARCHAR(20) DEFAULT 'INITIATED' CHECK (status IN ('INITIATED','FUNDED','PENDING_GOV','GOV_APPROVED','COMPLETED','CANCELLED','REJECTED')),
  e_sign_document_hash      TEXT,
  completion_transaction_hash VARCHAR(66),
  rejection_reason          TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  completed_at              TIMESTAMPTZ,
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_token ON transactions(token_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON transactions(seller_address);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer_address);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- ── Officers ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS officers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     VARCHAR(50) UNIQUE NOT NULL,
  name            VARCHAR(200) NOT NULL,
  aadhaar_hash    BYTEA,
  role            VARCHAR(30) CHECK (role IN ('SURVEY_OFFICER','REVENUE_CLERK','SUB_REGISTRAR','DISTRICT_COLLECTOR','STATE_ADMIN','NATIONAL_ADMIN')),
  district        VARCHAR(100),
  state           VARCHAR(100),
  wallet_address  VARCHAR(42),
  is_active       BOOLEAN DEFAULT true,
  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_officers_district ON officers(district);
CREATE INDEX IF NOT EXISTS idx_officers_role ON officers(role);

-- ── Disputes ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disputes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id        BIGINT REFERENCES parcels(token_id),
  case_number     VARCHAR(100) UNIQUE NOT NULL,
  court_name      VARCHAR(200),
  court_level     INTEGER DEFAULT 0 CHECK (court_level IN (0, 1, 2)), -- 0=District,1=High,2=Supreme
  plaintiff       VARCHAR(200),
  filing_date     TIMESTAMPTZ DEFAULT NOW(),
  status          VARCHAR(20) DEFAULT 'FILED' CHECK (status IN ('FILED','HEARING','RESOLVED','DISMISSED')),
  outcome         TEXT,
  resolution_date TIMESTAMPTZ,
  ipfs_order_hash TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_token ON disputes(token_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

-- ── Grievances ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grievances (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id    VARCHAR(20) UNIQUE NOT NULL, -- e.g. GRV-2025-08492
  token_id        BIGINT,
  ulpin           VARCHAR(14),
  complainant     VARCHAR(42),
  type            VARCHAR(50),
  details         TEXT,
  district        VARCHAR(100),
  status          VARCHAR(30) DEFAULT 'FILED',
  assigned_to     UUID REFERENCES officers(id),
  audit_log_id    BIGINT,  -- reference to AuditLogger.sol entry
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grievance_updates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grievance_id    UUID REFERENCES grievances(id),
  officer_id      UUID REFERENCES officers(id),
  status          VARCHAR(30),
  note            TEXT,
  on_chain_tx     VARCHAR(66),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Price History ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id    BIGINT REFERENCES parcels(token_id),
  sale_price  DECIMAL(20, 8),
  sale_date   TIMESTAMPTZ,
  buyer       VARCHAR(42),
  seller      VARCHAR(42),
  tx_hash     VARCHAR(66)
);

CREATE INDEX IF NOT EXISTS idx_price_history_token ON price_history(token_id);

-- ── Mortgages / Bank Linkage ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mortgages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id          BIGINT REFERENCES parcels(token_id),
  bank_address      VARCHAR(42),   -- bank's ORACLE_ROLE wallet
  bank_name         VARCHAR(200),
  loan_account      VARCHAR(100),
  loan_amount       DECIMAL(20, 2),
  loan_date         TIMESTAMPTZ,
  ltv_ratio         DECIMAL(5, 2),
  status            VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','CLOSED','DEFAULTED')),
  noc_ipfs_hash     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  closed_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mortgages_token ON mortgages(token_id);
CREATE INDEX IF NOT EXISTS idx_mortgages_bank ON mortgages(bank_address);

-- ── Audit Log Mirror ────────────────────────────────────────────────
-- Mirrors AuditLogger.sol entries for fast querying
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  on_chain_id BIGINT UNIQUE,
  actor       VARCHAR(42),
  action_type INTEGER,
  token_id    BIGINT,
  timestamp   TIMESTAMPTZ,
  ipfs_hash   TEXT,
  notes       TEXT,
  tx_hash     VARCHAR(66)
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor);
CREATE INDEX IF NOT EXISTS idx_audit_token ON audit_logs(token_id);

-- ── Update trigger ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER parcels_updated_at BEFORE UPDATE ON parcels FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER grievances_updated_at BEFORE UPDATE ON grievances FOR EACH ROW EXECUTE FUNCTION update_updated_at();
