-- ═══════════════════════════════════════════════
-- NEXUS GIET — Manual Fee Sync (PIN: 24295-AI-038)
-- Discoverd via CampX SOC: ₹86,811.00
-- ═══════════════════════════════════════════════

-- 1. Ensure the student exists in the fees table
INSERT INTO fees (student_id, total_fee, paid_fee, status)
SELECT id, 86811.00, 0, 'partial'
FROM profiles
WHERE pin_number = '24295-AI-038'
ON CONFLICT (student_id) DO NOTHING;

-- 2. Update with the breakdown captured from CampX
UPDATE fees
SET 
  total_fee = 86811.00,
  year_1_due = 18750.00,
  year_2_due = 38061.00,
  year_3_due = 30000.00,
  year_4_due = 0.00,
  admission_id = '01HYWKJZ80FS93TXMWRKHJ384G',
  last_synced_at = NOW(),
  status = 'partial'
WHERE student_id IN (
  SELECT id FROM profiles WHERE pin_number = '24295-AI-038'
);

-- Verification:
-- SELECT * FROM fees WHERE student_id IN (SELECT id FROM profiles WHERE pin_number = '24295-AI-038');
