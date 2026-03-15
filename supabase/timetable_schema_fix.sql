-- ═══════════════════════════════════════════════
-- NEXUS GIET — Timetable Schema Hotfix
-- ═══════════════════════════════════════════════

-- 1. Ensure timetable_slots has the slot-based structure and relaxed constraints
ALTER TABLE public.timetable_slots ADD COLUMN IF NOT EXISTS day TEXT;
ALTER TABLE public.timetable_slots ADD COLUMN IF NOT EXISTS slot INT;
ALTER TABLE public.timetable_slots ADD COLUMN IF NOT EXISTS semester TEXT;

-- Relax old time-based constraints that are no longer strictly mandatory for slot-based system
ALTER TABLE public.timetable_slots ALTER COLUMN start_time DROP NOT NULL;
ALTER TABLE public.timetable_slots ALTER COLUMN end_time DROP NOT NULL;

-- 2. Migrate data from legacy 'timetables' if it exists
-- This prevents data loss during the transition
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'timetables') THEN
        INSERT INTO public.timetable_slots (subject_id, day, slot, branch, section, semester)
        SELECT subject_id, day, slot, branch, section, semester
        FROM public.timetables
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 3. Add UNIQUE constraint to enable upsert (onConflict)
-- This is what prevents the 400 Bad Request
ALTER TABLE public.timetable_slots 
DROP CONSTRAINT IF EXISTS timetable_slots_unique_identity;

ALTER TABLE public.timetable_slots 
ADD CONSTRAINT timetable_slots_unique_identity 
UNIQUE (branch, semester, section, day, slot);

-- 4. RLS for safety
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.timetable_slots IS 'Nexus GIET Unified Timetable — Supports multi-section and personal schedules.';
