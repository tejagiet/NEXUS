-- ═══════════════════════════════════════════════
-- NEXUS GIET — Storage & Avatar Repair (Hotfix)
-- Fixes the 400 Bad Request by ensuring bucket and RLS policies.
-- ═══════════════════════════════════════════════

-- 1. Ensure 'avatars' bucket is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public Avatars are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Staff can manage all avatars" ON storage.objects;

-- 3. Create Optimized RLS Policies

-- Public View
CREATE POLICY "Public Avatars are viewable by everyone" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- User Self-Management (Upload to folder named with their UID)
CREATE POLICY "Users can manage their own avatar" 
ON storage.objects FOR ALL 
USING (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Institutional Management (Staff can manage ANY student/staff avatar)
CREATE POLICY "Staff can manage all avatars" 
ON storage.objects FOR ALL 
USING (
  bucket_id = 'avatars' AND 
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (
      role IN ('admin', 'hod', 'principal', 'vice_principal', 'faculty') OR
      roles && ARRAY['admin', 'hod', 'principal', 'vice_principal', 'faculty']::text[]
    )
  ))
);

COMMENT ON TABLE storage.objects IS 'Institutional asset store with Role-Based Access Control.';
