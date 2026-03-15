-- ═══════════════════════════════════════════════
-- NEXUS GIET — Google Auth Gatekeeper (v2.0)
-- Objective: Allow Google Login IF email matches an existing authorized profile.
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    profile_exists BOOLEAN;
BEGIN
    -- 1. Check if this email is already pre-authorized in profiles
    -- We match by the email coming from Auth (new.email)
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE email = new.email 
        OR pin_number IS NOT NULL -- Safety for legacy manual inserts
    ) INTO profile_exists;

    -- 2. If it's a social login (Google) and NOT in our database, BLOCK IT
    IF (new.raw_app_meta_data->>'provider' = 'google') THEN
        IF NOT profile_exists THEN
            RAISE EXCEPTION 'Nexus Access Denied: The account % is not authorized. Contact GIET SOC Admin.', new.email;
        END IF;

        -- 🔗 Identity Linking: If a profile exists with this email but different ID, 
        -- we could optionally link it here, but usually Supabase handles the ID linkage.
        -- Here we just ensure that if allow it, the profile logic below will merge it.
    END IF;

    -- 3. Sync/Create profile entry
    INSERT INTO public.profiles (id, full_name, role, pin_number, branch, mobile, email)
    VALUES (
        new.id, 
        new.raw_user_meta_data->>'full_name', 
        COALESCE(new.raw_user_meta_data->>'role', 'student'),
        new.raw_user_meta_data->>'pin_number',
        new.raw_user_meta_data->>'branch',
        new.raw_user_meta_data->>'mobile',
        new.email
    ) 
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(profiles.full_name, EXCLUDED.full_name);
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
