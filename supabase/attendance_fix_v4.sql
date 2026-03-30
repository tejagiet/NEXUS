-- ═══════════════════════════════════════════════
-- NEXUS GIET — Attendance Database Integrity Fix (v4)
-- Resolves Error 23503 by re-linking records correctly.
-- ═══════════════════════════════════════════════

-- 1. Identify and Drop Inconsistent Constraints
-- We need to change the student_id reference from 'students' table to 'profiles' table.
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'attendance_student_id_fkey') THEN
        ALTER TABLE public.attendance DROP CONSTRAINT attendance_student_id_fkey;
    END IF;
END $$;

-- 2. Establish Modern Integrity Link
-- Attendance now links directly to the master Profile system for 100% sync reliability.
ALTER TABLE public.attendance 
ADD CONSTRAINT attendance_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- 3. Verify Unique Constraints for Upsert Logic
-- This ensures that marking attendance for the same student/subject/date 
-- correctly updates the existing record instead of throwing a conflict.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'attendance_upsert_idx') THEN
        CREATE UNIQUE INDEX attendance_upsert_idx ON public.attendance (student_id, subject_id, date);
    END IF;
END $$;

-- 4. Set RLS Permissions for Faculty
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Faculty can mark attendance" ON public.attendance;
CREATE POLICY "Faculty can mark attendance" ON public.attendance 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND (
            p.role IN ('admin', 'principal', 'hod', 'faculty') 
            OR p.roles && ARRAY['admin', 'principal', 'hod', 'faculty']::text[]
        )
    )
);

-- 5. Data Backfill (Optional)
-- Ensure all students in 'profiles' exist as attendance candidates.
-- This is handled by our switch to using 'profiles' as the source in the UI.

-- Grant access to authenticated users
GRANT ALL ON public.attendance TO authenticated;

-- Verification
-- SELECT count(*) FROM public.attendance;
