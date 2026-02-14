/**
 * GyroLaser Backend
 * Express HTTP server + Socket.io for room pairing and real-time laser relay
 * Run: npm install && npm start
 */

const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const QRCode = require('qrcode');
const { attachSocketHandlers } = require('./socket');
const { log: debugLog, LOG_PATH } = require('./utils/debugLog');

// #region agent log
debugLog({ location: 'server/index.js:init', message: 'Server module loaded', data: { logPath: LOG_PATH }, timestamp: Date.now(), hypothesisId: 'B' });
// #endregion

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const app = express();
const server = http.createServer(app);

// Socket.io attached to same HTTP server
const io = new Server(server, {
  cors: {
    origin: [
      "https://gyrolaser-presenter.vercel.app",
      "http://localhost:3000",
      "https://gyrolaser-presenter-wsg9.vercel.app"

    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

attachSocketHandlers(io);

// --- Static files: /desktop and /mobile (prefer frontend/ if present)
const fs = require('fs');
const rootDir = path.join(__dirname, '..');
const frontendDesktop = path.join(rootDir, 'frontend', 'client-desktop');
const frontendMobile = path.join(rootDir, 'frontend', 'client-mobile');
const staticDesktop = fs.existsSync(frontendDesktop) ? frontendDesktop : path.join(rootDir, 'client-desktop');
const staticMobile = fs.existsSync(frontendMobile) ? frontendMobile : path.join(rootDir, 'client-mobile');
app.use('/desktop', express.static(staticDesktop));
app.use('/mobile', express.static(staticMobile));

// Root redirect to desktop viewer
app.get('/', (req, res) => {
  res.redirect('/desktop');
});

/**
 * GET /api/qrcode/:roomId
 * Returns PNG QR code linking to mobile join URL for the given room
 */
app.get('/api/qrcode/:roomId', (req, res) => {
  const roomId = (req.params.roomId || '').trim().toUpperCase();
  if (!roomId || roomId.length !== 6) {
    res.status(400).send('Invalid room ID');
    return;
  }

  const mobileUrl = `http://${HOST}:${PORT}/mobile?room=${roomId}`;

  QRCode.toBuffer(mobileUrl, { type: 'png', width: 256, margin: 2 })
    .then((buffer) => {
      res.setHeader('Content-Type', 'image/png');
      res.send(buffer);
    })
    .catch((err) => {
      console.error('QR generation error:', err);
      res.status(500).send('Failed to generate QR code');
    });
});

// Start server
server.listen(PORT, () => {
  // #region agent log
  const _p = { location: 'server/index.js:listen', message: 'Server started', data: { port: PORT, host: HOST }, timestamp: Date.now(), hypothesisId: 'B' };
  fetch('http://127.0.0.1:7242/ingest/ef5c1aef-4ac7-4e4a-b493-a44e9beddc9c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(_p) }).catch(() => {});
  debugLog(_p);
  // #endregion
  console.log(`GyroLaser server running at http://${HOST}:${PORT}`);
  console.log('  /         → redirects to /desktop');
  console.log('  /desktop  → viewer (slides + laser)');
  console.log('  /mobile  → controller (gyro laser)');
  console.log('  /api/qrcode/:roomId → QR code PNG');
});
