-- ═══════════════════════════════════════════════
-- NEXUS GIET — Identity Sync Security Patch (v1.0)
-- Ensures email-based identity matching is accurate and fast.
-- ═══════════════════════════════════════════════

-- 1. Ensure email column exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;
END $$;

-- 2. Add Unique constraint if not present (to prevent identity duplicate/overlap)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);

-- 3. Create Index for Gatekeeper performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

COMMENT ON COLUMN public.profiles.email IS 'Primary identifier for identity linking and alternate login methods.';
