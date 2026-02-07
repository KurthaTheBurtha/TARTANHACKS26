-- =============================================================================
-- CareMap Integrations — Supabase Schema
-- =============================================================================
-- This is the database schema for the provider/plan search feature.
--
-- HACKATHON NOTE:
-- - Network status mappings are seeded/heuristic, NOT official insurer data.
-- - This schema is designed for demo purposes; production would need:
--   - Real provider data feeds (NPI registry, insurer APIs)
--   - Proper network verification
--   - More granular access control
--
-- No PII is stored in these tables.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
-- Enable PostGIS if available (for future geo queries); otherwise use lat/lng
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- -----------------------------------------------------------------------------
-- Table: providers
-- -----------------------------------------------------------------------------
-- Stores healthcare provider information (doctors, hospitals, clinics, etc.)
-- Data sourced from Google Places API or manual seed.

CREATE TABLE IF NOT EXISTS providers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id        TEXT UNIQUE,                          -- Google Places ID (nullable for seeded data)
    name            TEXT NOT NULL,
    types           TEXT[] NULL,                          -- Google Places types: ["hospital", "doctor"]
    specialties     TEXT[] NULL,                          -- Medical specialties: ["cardiology", "pediatrics"]
    address         JSONB NOT NULL,                       -- { line1, line2?, city, state, zip? }
    lat             DOUBLE PRECISION NOT NULL,
    lng             DOUBLE PRECISION NOT NULL,
    phone           TEXT NULL,
    website         TEXT NULL,
    last_fetched_at TIMESTAMPTZ NULL,                     -- When data was last refreshed from Places API
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE providers IS 'Healthcare providers (doctors, hospitals, clinics). Sourced from Google Places or seed data.';
COMMENT ON COLUMN providers.place_id IS 'Google Places ID; null for manually seeded providers.';
COMMENT ON COLUMN providers.types IS 'Google Places type tags (e.g., hospital, doctor, pharmacy).';
COMMENT ON COLUMN providers.specialties IS 'Medical specialties (e.g., cardiology, orthopedics).';
COMMENT ON COLUMN providers.address IS 'JSONB address: {line1, line2?, city, state, zip?}';

-- -----------------------------------------------------------------------------
-- Table: insurance_plans
-- -----------------------------------------------------------------------------
-- Stores insurance plan information for network matching.

CREATE TABLE IF NOT EXISTS insurance_plans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payer       TEXT NOT NULL,                            -- Insurance company name
    plan_name   TEXT NOT NULL,                            -- Specific plan name
    network     TEXT NULL,                                -- Network type (PPO, HMO, EPO, etc.)
    state       TEXT NULL,                                -- State where plan is offered
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE insurance_plans IS 'Insurance plans for network matching. Demo/seed data only.';
COMMENT ON COLUMN insurance_plans.payer IS 'Insurance company (e.g., UPMC, Aetna, BCBS).';
COMMENT ON COLUMN insurance_plans.network IS 'Network type (PPO, HMO, EPO).';

-- -----------------------------------------------------------------------------
-- Table: provider_networks
-- -----------------------------------------------------------------------------
-- Junction table mapping providers to plans with network status.
-- HACKATHON NOTE: This is seeded/heuristic data, not official insurer verification.

CREATE TABLE IF NOT EXISTS provider_networks (
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    plan_id     UUID NOT NULL REFERENCES insurance_plans(id) ON DELETE CASCADE,
    in_network  BOOLEAN NOT NULL,
    confidence  NUMERIC NOT NULL DEFAULT 0.5,             -- 0.0 to 1.0 confidence score
    source      TEXT NOT NULL DEFAULT 'seed',             -- 'seed', 'heuristic', 'unknown'
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (provider_id, plan_id)
);

COMMENT ON TABLE provider_networks IS 'Provider-to-plan network mappings. HACKATHON: seeded/heuristic, not insurer-verified.';
COMMENT ON COLUMN provider_networks.confidence IS 'Confidence score 0.0-1.0 for network determination.';
COMMENT ON COLUMN provider_networks.source IS 'How network status was determined: seed, heuristic, unknown.';

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

-- Geospatial index for location-based queries (simple B-tree; PostGIS would be better)
CREATE INDEX IF NOT EXISTS idx_providers_lat_lng ON providers(lat, lng);

-- GIN indexes for array containment queries (e.g., types @> ARRAY['hospital'])
CREATE INDEX IF NOT EXISTS idx_providers_types ON providers USING GIN(types);
CREATE INDEX IF NOT EXISTS idx_providers_specialties ON providers USING GIN(specialties);

-- Index for network lookups by plan
CREATE INDEX IF NOT EXISTS idx_provider_networks_plan_in_network ON provider_networks(plan_id, in_network);

-- Index for provider name search
CREATE INDEX IF NOT EXISTS idx_providers_name_trgm ON providers(name);

-- -----------------------------------------------------------------------------
-- Triggers: updated_at
-- -----------------------------------------------------------------------------

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to providers
DROP TRIGGER IF EXISTS trigger_providers_updated_at ON providers;
CREATE TRIGGER trigger_providers_updated_at
    BEFORE UPDATE ON providers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to provider_networks
DROP TRIGGER IF EXISTS trigger_provider_networks_updated_at ON provider_networks;
CREATE TRIGGER trigger_provider_networks_updated_at
    BEFORE UPDATE ON provider_networks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Row Level Security (RLS)
-- -----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_networks ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT from all tables
CREATE POLICY "Authenticated users can read providers"
    ON providers
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read insurance_plans"
    ON insurance_plans
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read provider_networks"
    ON provider_networks
    FOR SELECT
    TO authenticated
    USING (true);

-- Also allow anon users to read (for demo/testing purposes)
CREATE POLICY "Anon users can read providers"
    ON providers
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Anon users can read insurance_plans"
    ON insurance_plans
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Anon users can read provider_networks"
    ON provider_networks
    FOR SELECT
    TO anon
    USING (true);

-- =============================================================================
-- NOTE: INSERT/UPDATE/DELETE policies are intentionally NOT created.
-- Writes should go through Edge Functions using the service role key.
-- This protects data integrity and ensures proper validation.
-- =============================================================================

-- Example of how to allow service role writes (uncomment if needed):
-- CREATE POLICY "Service role can insert providers"
--     ON providers
--     FOR INSERT
--     TO service_role
--     WITH CHECK (true);
