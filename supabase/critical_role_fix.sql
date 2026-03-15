-- ═══════════════════════════════════════════════
-- NEXUS GIET — CRITICAL ROLE REPAIR (v2.0)
-- Fixes: "violates check constraint profiles_role_check"
-- Run this in: Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════

-- 1. Identify and Drop ANY constraint on the 'role' column
-- We search for any constraint that mentions 'role' in the 'profiles' table
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.constraint_column_usage 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) LOOP
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE';
    END LOOP;
END $$;

-- 2. Add the Master Role Constraint with the full institutional hierarchy
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN (
    'student', 
    'faculty', 
    'admin', 
    'principal', 
    'vice_principal', 
    'hod', 
    'class_teacher'
));

-- 3. Verify the sync
COMMENT ON CONSTRAINT profiles_role_check ON public.profiles IS 'Master Nexus GIET Hierarchy: Student, Faculty, Admin, Principal, Vice-Principal, HOD, Class Teacher.';

-- 4. Audit current data to catch any invalid values that might block the constraint
SELECT id, full_name, role FROM public.profiles WHERE role NOT IN (
    'student', 'faculty', 'admin', 'principal', 'vice_principal', 'hod', 'class_teacher'
);
