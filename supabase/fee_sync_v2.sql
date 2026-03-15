-- ═══════════════════════════════════════════════
-- NEXUS GIET — Fee Sync categorized extension (v2)
-- Adds granular columns for College and Transport dues
-- ═══════════════════════════════════════════════

ALTER TABLE fees 
ADD COLUMN IF NOT EXISTS college_due DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS transport_due DECIMAL(10,2) DEFAULT 0;

-- Optional: Comments for clarity
COMMENT ON COLUMN fees.college_due IS 'Sum of academic/college related dues';
COMMENT ON COLUMN fees.transport_due IS 'Sum of transport/bus related dues';
