-- ═══════════════════════════════════════════════
-- NEXUS GIET — Global Broadcast: RLS Modernization (v2.1)
-- Fixes: "new row violates row-level security policy for table notices"
-- Objective: Support Multi-Role system in Notice management.
-- ═══════════════════════════════════════════════

-- 1. Modernize Notice Management Policy
-- We expand the "FOR ALL" logic to check both legacy 'role' column 
-- and the modern 'roles' array introduced in Phase 58.
DROP POLICY IF EXISTS "notices_manage" ON public.notices;

CREATE POLICY "notices_manage" ON public.notices 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND (
            p.role IN ('admin', 'principal', 'hod', 'faculty', 'vice_principal') 
            OR p.roles && ARRAY['admin', 'principal', 'hod', 'faculty', 'vice_principal']::text[]
        )
    )
);

-- 2. Ensure Author ID integrity (Foreign Key Repair)
-- Ensures that if a staff member is deleted, their notices remain but are orphaned safely.
ALTER TABLE public.notices DROP CONSTRAINT IF EXISTS notices_author_id_fkey;
ALTER TABLE public.notices ADD CONSTRAINT notices_author_id_fkey 
    FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Optimization: Grant permissions to authenticated users for the table
GRANT ALL ON public.notices TO authenticated;

-- Verification query (Run manually to check current notices)
-- SELECT n.*, p.full_name as author FROM public.notices n JOIN public.profiles p ON n.author_id = p.id;
