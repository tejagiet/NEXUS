/**
 * 🛰️ NEXUS GIET — CCTV Proxy Bridge
 * ---------------------------------
 * This script allows you to tunnel legacy HTTP camera streams (MJPG, HLS)
 * through a secure HTTPS port so they can be viewed on the Nexus portal.
 * 
 * SETUP:
 * 1. Install Node.js
 * 2. Run: npm install express http-proxy-middleware cors
 * 3. Run: node cctv-proxy-bridge.mjs
 * 
 * CONFIGURATION:
 * - Update the PORT if needed.
 * - For production, use 'https' module with valid SSL certificates.
 */

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());

// Health Check
app.get('/health', (req, res) => res.send('Nexus SOC Proxy: ACTIVE'));

// 🚀 The Proxy Logic
// Usage: http://localhost:3001/domain.com/path/to/stream.m3u8
app.use('/:targetHost/**', (req, res, next) => {
    const targetHost = req.params.targetHost;
    const targetPath = req.params[0] || '';
    
    // Reconstruct the original HTTP URL
    const targetUrl = `http://${targetHost}/${targetPath}`;
    
    console.log(`[Nexus Proxy] Tunneling: ${targetUrl}`);

    createProxyMiddleware({
        target: `http://${targetHost}`,
        changeOrigin: true,
        pathRewrite: {
            [`^/${targetHost}`]: '', // Remove the host prefix from the path
        },
        onError: (err, req, res) => {
            console.error(`[Nexus Proxy] Error: ${err.message}`);
            res.status(502).send('Proxy Error');
        },
        logLevel: 'debug'
    })(req, res, next);
});

app.listen(PORT, () => {
    console.log(`\n✅ NEXUS GIET — CCTV Proxy Bridge is live!`);
    console.log(`📍 Listening on: http://localhost:${PORT}`);
    console.log(`🔗 Example Usage: http://localhost:${PORT}/webcam.anklam.de/axis-cgi/mjpg/video.cgi\n`);
});
