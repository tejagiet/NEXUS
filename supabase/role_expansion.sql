-- ═══════════════════════════════════════════════
-- NEXUS GIET — Role Expansion Security Patch (v5.0)
-- Adds hierarchical roles: Principal, HOD, Vice Principal, Class Teacher
-- ═══════════════════════════════════════════════

-- 1. Drop existing constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Add expanded role constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('student', 'faculty', 'admin', 'principal', 'vice_principal', 'hod', 'class_teacher'));

-- 3. (Optional) Audit current roles
-- SELECT role, count(*) FROM public.profiles GROUP BY role;

COMMENT ON CONSTRAINT profiles_role_check ON public.profiles IS 'Restricts roles to valid Nexus GIET institutional positions.';
