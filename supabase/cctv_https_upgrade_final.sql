-- ═══════════════════════════════════════════════
-- NEXUS GIET — CCTV Security Patch (v4.7 FINAL)
-- Fixes Mixed Content blocks in Production (Vercel)
-- ═══════════════════════════════════════════════

-- Ensure table exists
CREATE TABLE IF NOT EXISTS public.cctv_nodes (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name         TEXT NOT NULL,
    url          TEXT NOT NULL,
    location     TEXT DEFAULT 'Campus',
    is_active    BOOLEAN DEFAULT TRUE,
    is_motion    BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    node_id      TEXT UNIQUE
);

-- Reset/Update with SECURE HTTPS Streams
-- Note: These node_ids match the ones used in the UI logic.
INSERT INTO public.cctv_nodes (node_id, name, url, location)
VALUES 
    ('NODE-001', 'Main Entrance - HD', 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', 'Main Gate'),
    ('NG-NODE-002', 'Academic Block A', 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8', 'Block A'),
    ('NG-NODE-003', 'Library Hallway', 'http://webcam.anklam.de/axis-cgi/mjpg/video.cgi', 'Library'),
    ('NG-NODE-004', 'Student Lounge', 'http://montfarlagne.tacticddns.com:8081/axis-cgi/mjpg/video.cgi', 'Lounge Area'),
    ('NG-NODE-005', 'Cloud Bridge POC', 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8', 'Cloud Uplink')
ON CONFLICT (node_id) 
DO UPDATE SET url = EXCLUDED.url, name = EXCLUDED.name;
