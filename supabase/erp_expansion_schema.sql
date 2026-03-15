-- ═══════════════════════════════════════════════
-- NEXUS GIET — Institutional Intelligence (Phase 44)
-- Objective: Curriculum, Timetable, and Flexible Attendance
-- ═══════════════════════════════════════════════

-- 1. ATTENDANCE ENHANCEMENT
-- Add 'topic' column to track what was taught in each session
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS topic TEXT;

-- 2. CURRICULUM TABLE
-- Stores syllabus topics for each subject
CREATE TABLE IF NOT EXISTS public.curriculum (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id  UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    order_index INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TIMETABLE SLOTS
-- Stores the weekly schedule for subjects, branches, and sections
CREATE TABLE IF NOT EXISTS public.timetable_slots (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id  UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    day_of_week TEXT CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    branch      TEXT NOT NULL,
    section     TEXT NOT NULL,
    room        TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ACADEMIC CALENDAR
-- Unified view for holidays, exams, and events
CREATE TABLE IF NOT EXISTS public.academic_calendar (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date        DATE NOT NULL UNIQUE,
    title       TEXT NOT NULL,
    type        TEXT CHECK (type IN ('holiday','event','exam','academic_day')) DEFAULT 'academic_day',
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. NOTICES & CIRCULARS
-- Official communication channel
CREATE TABLE IF NOT EXISTS public.notices (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title        TEXT NOT NULL,
    content      TEXT NOT NULL,
    author_id    UUID REFERENCES public.profiles(id),
    target_role  TEXT DEFAULT 'ALL', -- ALL, student, faculty
    target_branch TEXT DEFAULT 'ALL',
    attachment_url TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RLS POLICIES (Security)
ALTER TABLE public.curriculum      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices         ENABLE ROW LEVEL SECURITY;

-- Curriculum: Everyone can see, Faculty/Admin manage
DROP POLICY IF EXISTS "curriculum_select" ON public.curriculum;
CREATE POLICY "curriculum_select" ON public.curriculum FOR SELECT USING (true);

DROP POLICY IF EXISTS "curriculum_manage" ON public.curriculum;
CREATE POLICY "curriculum_manage" ON public.curriculum FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'hod', 'principal'))
);

-- Timetable: Everyone can see, Admins manage
DROP POLICY IF EXISTS "timetable_select" ON public.timetable_slots;
CREATE POLICY "timetable_select" ON public.timetable_slots FOR SELECT USING (true);

DROP POLICY IF EXISTS "timetable_manage" ON public.timetable_slots;
CREATE POLICY "timetable_manage" ON public.timetable_slots FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'hod'))
);

-- Calendar: Everyone can see, Admins manage
DROP POLICY IF EXISTS "calendar_select" ON public.academic_calendar;
CREATE POLICY "calendar_select" ON public.academic_calendar FOR SELECT USING (true);

DROP POLICY IF EXISTS "calendar_manage" ON public.academic_calendar;
CREATE POLICY "calendar_manage" ON public.academic_calendar FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'principal'))
);

-- Notices: Everyone can see relevant ones
DROP POLICY IF EXISTS "notices_select" ON public.notices;
CREATE POLICY "notices_select" ON public.notices FOR SELECT USING (true);

DROP POLICY IF EXISTS "notices_manage" ON public.notices;
CREATE POLICY "notices_manage" ON public.notices FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'principal', 'hod'))
);

-- ═══════════════════════════════════════════════
-- FEEDBACK & LOGS
-- ═══════════════════════════════════════════════
COMMENT ON TABLE public.curriculum IS 'Nexus Syllabi storage per subject.';
COMMENT ON TABLE public.timetable_slots IS 'Master schedule for Nexus GIET.';
