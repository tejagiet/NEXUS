-- ═══════════════════════════════════════════════
-- NEXUS GIET — Fee Sync Initialization (v1)
-- Syncs with GIET CampX Payment Portal
-- ═══════════════════════════════════════════════

-- 1. Extend Fees Table with Breakdown Columns
ALTER TABLE fees 
ADD COLUMN IF NOT EXISTS year_1_due DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS year_2_due DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS year_3_due DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS year_4_due DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS admission_id TEXT, -- CampX Internal ID
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- 2. Add Index for Sync Lookup
CREATE INDEX IF NOT EXISTS idx_fees_last_sync ON fees(last_synced_at);

-- 3. Update RLS (Ensure students can see their own breakdown)
-- (Existing policies already cover select, but let's be explicit if needed)
-- Policy: "fees_student_select" ON fees FOR SELECT USING (auth.uid() = student_id)
-- Note: student_id in 'fees' is linked to 'profiles.id' which is 'auth.uid()' 

-- 4. Initial Seed Correction (Optional)
-- Ensure all students have a fee record if they exist in profiles
INSERT INTO fees (student_id, total_fee, paid_fee, status)
SELECT id, 45000, 0, 'pending'
FROM profiles
WHERE role = 'student'
ON CONFLICT (student_id) DO NOTHING;
