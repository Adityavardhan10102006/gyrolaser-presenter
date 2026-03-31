/**
 * GyroLaser Backend
 * Express HTTP server + Socket.io for room pairing and real-time laser relay
 */

const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const QRCode = require('qrcode');
const { attachSocketHandlers } = require('./socket');
const cors = require('cors');

const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || 'localhost';

const app = express();
const server = http.createServer(app);

// Enable CORS for API routes if needed
app.use(cors({
  origin: [
    "https://gyrolaser-presenter.vercel.app",
    "http://localhost:8000",
    "https://gyrolaser-presenter-wsg9.vercel.app"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true
}));

app.use(express.json());

// Socket.io standard config
const io = new Server(server, {
  cors: {
    origin: [
      "https://gyrolaser-presenter.vercel.app",
      "http://localhost:8000",
      "https://gyrolaser-presenter-wsg9.vercel.app"
    ],
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true
  },
  pingTimeout: 5000,
  pingInterval: 10000
});

attachSocketHandlers(io);

// Static file serving logic
const rootDir = path.join(__dirname, '..');
const staticDesktop = path.join(rootDir, 'client-desktop');
const staticMobile = path.join(rootDir, 'client-mobile');

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

  // Uses local URL for dev, update if deploying
  const mobileUrl = `http://${HOST}:${PORT}/mobile?room=${roomId}`;

  QRCode.toBuffer(mobileUrl, { type: 'png', margin: 2 })
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
  console.log(`GyroLaser server running at http://${HOST}:${PORT}`);
  console.log('  /         → redirects to /desktop');
  console.log('  /desktop  → viewer (slides + laser)');
  console.log('  /mobile   → controller (gyro laser)');
  console.log('  /api/qrcode/:roomId → QR code PNG');
});
