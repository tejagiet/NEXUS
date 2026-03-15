-- ═══════════════════════════════════════════════
-- NEXUS GIET — Multi-Section Timetable Expansion
-- ═══════════════════════════════════════════════

-- 1. Ensure timetable_slots has semester support
ALTER TABLE public.timetable_slots ADD COLUMN IF NOT EXISTS semester TEXT;

-- 2. Create index for faster lookups by faculty (via subjects)
-- This facilitates the "My Schedule" view
CREATE INDEX IF NOT EXISTS idx_timetable_slots_subject ON public.timetable_slots(subject_id);

-- 3. (Optional) Legacy Migration if 'timetables' table exists
-- If the project was using 'timetables' (plural), handle migration here.
-- For now, we standardize on 'timetable_slots'.

COMMENT ON COLUMN public.timetable_slots.semester IS 'The academic semester (e.g., Sem 1, Sem 4).';
