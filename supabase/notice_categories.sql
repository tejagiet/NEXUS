-- ═══════════════════════════════════════════════
-- NEXUS GIET — Notice Categories (v2.2)
-- Adds support for General, Academics, and Events.
-- ═══════════════════════════════════════════════

-- 1. Add Category Column to Notices Table
ALTER TABLE public.notices 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';

-- 2. Add Check Constraint for Valid Categories
ALTER TABLE public.notices 
DROP CONSTRAINT IF EXISTS notices_category_check;

ALTER TABLE public.notices 
ADD CONSTRAINT notices_category_check 
CHECK (category IN ('General', 'Academics', 'Events'));

-- 3. Categorize Existing Notices (Optional)
-- UPDATE public.notices SET category = 'General' WHERE category IS NULL;

-- 4. Verify Structure
-- SELECT id, title, category FROM public.notices LIMIT 10;
