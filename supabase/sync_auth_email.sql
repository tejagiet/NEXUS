-- ═══════════════════════════════════════════════
-- NEXUS GIET — Security Sync: Admin Email Management
-- Allows authorized admins to sync authentication emails.
-- ═══════════════════════════════════════════════

-- Create a secure function to update auth.users email
CREATE OR REPLACE FUNCTION sync_user_email(target_user_id UUID, new_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with superuser privileges to access auth schema
SET search_path = public
AS $$
BEGIN
  -- 1. Check if the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (roles @> ARRAY['admin']::text[])
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only institutional administrators can sync authentication emails.';
  END IF;

  -- 2. Update auth.users (authentication table)
  UPDATE auth.users 
  SET email = new_email,
      email_confirmed_at = now(), -- Auto-confirm for administrative changes
      updated_at = now()
  WHERE id = target_user_id;

  -- 3. Update profiles (public schema)
  UPDATE public.profiles
  SET email = new_email,
      updated_at = now()
  WHERE id = target_user_id;
END;
$$;

COMMENT ON FUNCTION sync_user_email IS 'Administratively updates a user email across both auth and profile records.';
