-- ═══════════════════════════════════════════════
-- NEXUS GIET — Security Sync: Admin Password Management
-- Allows authorized admins to reset user credentials.
-- ═══════════════════════════════════════════════

-- Ensure pgcrypto is enabled for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a secure function to reset user passwords
CREATE OR REPLACE FUNCTION admin_reset_password(target_user_id UUID, new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with superuser privileges to access auth schema
SET search_path = public
AS $$
DECLARE
  hashed_password TEXT;
BEGIN
  -- 1. Check if the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (roles @> ARRAY['admin']::text[])
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only institutional administrators can reset authentication credentials.';
  END IF;

  -- 2. Hash the new password (Compatible with Supabase/PostgreSQL crypt format)
  -- Supabase Auth typically uses Blowfish (bf) hashing
  -- We use extensions.crypt to ensure the function is found regardless of search_path
  hashed_password := extensions.crypt(new_password, extensions.gen_salt('bf'));

  -- 3. Update auth.users (authentication table)
  UPDATE auth.users 
  SET encrypted_password = hashed_password,
      updated_at = now()
  WHERE id = target_user_id;

  -- 4. Log the administrative action (Optional, but good for security trails)
  RAISE NOTICE 'Administrative password reset performed for user % by admin %', target_user_id, auth.uid();
END;
$$;

COMMENT ON FUNCTION admin_reset_password IS 'Administratively resets a user password in the authentication system.';
