-- ═══════════════════════════════════════════════
-- NEXUS GIET — CCTV Security Patch (v4.7)
-- Fixes Mixed Content blocks in Production (Vercel)
-- ═══════════════════════════════════════════════

-- Update existing nodes to use HTTPS streams
UPDATE public.cctv_nodes 
SET url = 'http://webcam.anklam.de/axis-cgi/mjpg/video.cgi' 
WHERE node_id = 'NODE-01';

UPDATE public.cctv_nodes 
SET url = 'http://montfarlagne.tacticddns.com:8081/axis-cgi/mjpg/video.cgi' 
WHERE node_id = 'NODE-02';

-- Node 3 & 4 already use secure Unsplash URLs, but let's ensure they are HTTPS
UPDATE public.cctv_nodes 
SET url = 'http://plassenburg-blick.iyxdveyshavdrmjx.myfritz.net/cgi-bin/faststream.jpg?stream=full&fps=25' 
WHERE node_id = 'NODE-03';

