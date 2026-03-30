-- ═══════════════════════════════════════════════
-- NEXUS GIET — Student Synchronization Repair (v2.3)
-- Ensures the students table is correctly structured for Profile Sync.
-- ═══════════════════════════════════════════════

-- 1. Table Consistency Repair
-- Ensure vital columns exist in the students table for attendance.
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'A';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id);

-- 2. Constraint Initialization
-- We need a UNIQUE constraint on pin_number for the 'upsert' (onConflict) logic to work.
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_pin_number_key;
ALTER TABLE public.students ADD CONSTRAINT students_pin_number_key UNIQUE (pin_number);

-- 3. RLS Policies for Staff Management
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Direct Student Insert for Staff/Admin" ON public.students;
CREATE POLICY "Direct Student Insert for Staff/Admin" ON public.students 
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

DROP POLICY IF EXISTS "Students can view themselves" ON public.students;
CREATE POLICY "Students can view themselves" ON public.students 
FOR SELECT 
USING (auth_id = auth.uid());

-- 4. Granting permissions to authenticated users to interact with students table
GRANT ALL ON public.students TO authenticated;

-- Verification of students table current count
-- SELECT count(*) FROM public.students;
