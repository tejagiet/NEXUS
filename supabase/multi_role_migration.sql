-- ═══════════════════════════════════════════════
-- NEXUS GIET — Multi-Role Infrastructure (Phase 58)
-- Enables staff to hold multiple institutional roles.
-- ═══════════════════════════════════════════════

-- 1. Add roles array column if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='roles') THEN
        ALTER TABLE public.profiles ADD COLUMN roles TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- 2. Migrate existing single role to the roles array (if array is empty)
UPDATE public.profiles 
SET roles = ARRAY[role] 
WHERE (roles = '{}' OR roles IS NULL) AND role IS NOT NULL;

-- 3. Create index for performance on roles array
CREATE INDEX IF NOT EXISTS idx_profiles_roles ON public.profiles USING GIN (roles);

COMMENT ON COLUMN public.profiles.roles IS 'Array of assigned institutional roles (e.g., {faculty, hod}).';
