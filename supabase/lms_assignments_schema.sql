-- ═══════════════════════════════════════════════
-- NEXUS GIET — LMS & Assignments (Phase 46)
-- Objective: Assignments, Submissions, and Grading
-- ═══════════════════════════════════════════════

-- 1. ASSIGNMENTS TABLE
-- Faculty/HOD can create tasks for students
CREATE TABLE IF NOT EXISTS public.assignments (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id  UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    due_date    TIMESTAMPTZ,
    max_points  INT DEFAULT 10,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    created_by  UUID REFERENCES public.profiles(id)
);

-- 2. SUBMISSIONS TABLE
-- Students upload their work here
CREATE TABLE IF NOT EXISTS public.submissions (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_url      TEXT, -- Supabase Storage link
    content       TEXT, -- Optional text content
    grade         DECIMAL(5,2),
    feedback      TEXT,
    status        TEXT CHECK (status IN ('submitted','graded','late','returned')) DEFAULT 'submitted',
    submitted_at  TIMESTAMPTZ DEFAULT NOW(),
    graded_at     TIMESTAMPTZ,
    UNIQUE(assignment_id, student_id)
);

-- 3. RLS POLICIES (Security)
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Assignments: Everyone can see, Faculty/Admin manage
DROP POLICY IF EXISTS "assignments_select" ON public.assignments;
CREATE POLICY "assignments_select" ON public.assignments FOR SELECT USING (true);

DROP POLICY IF EXISTS "assignments_manage" ON public.assignments;
CREATE POLICY "assignments_manage" ON public.assignments FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'faculty', 'hod', 'class_teacher', 'principal'))
);

-- Submissions: Students see/manage their own, Faculty see/grade all for their subjects
DROP POLICY IF EXISTS "submissions_student_all" ON public.submissions;
CREATE POLICY "submissions_student_all" ON public.submissions FOR ALL USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "submissions_faculty_select" ON public.submissions;
CREATE POLICY "submissions_faculty_select" ON public.submissions FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'faculty', 'hod', 'class_teacher', 'principal'))
);

DROP POLICY IF EXISTS "submissions_faculty_update" ON public.submissions;
CREATE POLICY "submissions_faculty_update" ON public.submissions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'faculty', 'hod', 'class_teacher', 'principal'))
);

-- ═══════════════════════════════════════════════
-- STORAGE BUCKET POLICY
-- ═══════════════════════════════════════════════
-- 1. Need a 'submissions' bucket in Supabase Storage
-- 2. Policy: Authenticated users can upload to their own folder: submissions/{auth.uid()}/...

COMMENT ON TABLE public.assignments IS 'Faculty tasks for students.';
COMMENT ON TABLE public.submissions IS 'Student work for assignments.';
