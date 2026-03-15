-- ═══════════════════════════════════════════════
-- NEXUS GIET — Social Ecosystem (Phase 47)
-- Objective: Chat Rooms, Clubs, and Events
-- ═══════════════════════════════════════════════

-- 1. CHAT ROOMS
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name        TEXT NOT NULL,
    section     TEXT NOT NULL, -- 'A', 'B', 'C'
    branch      TEXT NOT NULL, -- 'CME', 'ECE', etc.
    subject_id  UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    created_by  UUID REFERENCES public.profiles(id)
);

-- 2. CHAT MESSAGES
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id     UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    sender_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CLUBS & EVENTS
CREATE TABLE IF NOT EXISTS public.clubs (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    logo_url    TEXT,
    leader_id   UUID REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.event_registrations (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_name    TEXT NOT NULL,
    description   TEXT,
    club_id       UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
    student_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    status        TEXT DEFAULT 'confirmed',
    UNIQUE(event_name, student_id)
);

-- RLS POLICIES
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Chat: Only members of that branch/section can see
DROP POLICY IF EXISTS "chat_rooms_access" ON public.chat_rooms;
CREATE POLICY "chat_rooms_access" ON public.chat_rooms FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND (p.branch = chat_rooms.branch OR p.role IN ('admin', 'principal')))
);

DROP POLICY IF EXISTS "chat_messages_select" ON public.chat_messages;
CREATE POLICY "chat_messages_select" ON public.chat_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM chat_rooms r WHERE r.id = chat_messages.room_id)
);

DROP POLICY IF EXISTS "chat_messages_insert" ON public.chat_messages;
CREATE POLICY "chat_messages_insert" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Clubs: Publicly viewable
DROP POLICY IF EXISTS "clubs_select" ON public.clubs;
CREATE POLICY "clubs_select" ON public.clubs FOR SELECT USING (true);

DROP POLICY IF EXISTS "event_reg_student" ON public.event_registrations;
CREATE POLICY "event_reg_student" ON public.event_registrations FOR ALL USING (auth.uid() = student_id);

-- ═══════════════════════════════════════════════
-- REALTIME SETUP
-- ═══════════════════════════════════════════════
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    END IF;
END $$;
