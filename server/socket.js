/**
 * Socket.io room and laser relay logic for GyroLaser
 * Handles viewer/controller pairing and real-time laser position forwarding
 */

const { generateRoomId, normalizeRoomId } = require('./utils/room');
const { log: debugLog } = require('./utils/debugLog');

let lastLaserLogTime = 0;
const LASER_LOG_INTERVAL_MS = 1000;

/**
 * Attach Socket.io event handlers to the server
 * @param {object} io - Socket.io server instance
 */
function attachSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    /**
     * Join room as viewer or controller
     * Viewer: no roomId needed; server creates room and emits room-created
     * Controller: roomId required; joins existing room and notifies viewer
     */
    socket.on('join-room', (payload) => {
      const role = payload && payload.role;
      const roomIdParam = payload && payload.roomId;

      if (role === 'viewer') {
        // Viewer: create new room and assign 6-char room ID
        const roomId = generateRoomId();
        socket.join(roomId);
        socket.roomId = roomId;
        socket.role = 'viewer';
        // #region agent log
        const viewerRoom = io.sockets.adapter.rooms.get(roomId);
        const _p = { location: 'server/socket.js:join-room:viewer', message: 'Viewer joined', data: { roomId, roomSize: viewerRoom ? viewerRoom.size : 0 }, timestamp: Date.now(), hypothesisId: 'A,C' };
        fetch('http://127.0.0.1:7242/ingest/ef5c1aef-4ac7-4e4a-b493-a44e9beddc9c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(_p) }).catch(() => {});
        debugLog(_p);
        // #endregion
        socket.emit('room-created', { roomId });
        console.log('Viewer joined room:', roomId);
        return;
      }

      if (role === 'controller') {
        // Controller: validate roomId and join existing room
        const roomId = normalizeRoomId(roomIdParam);
        // #region agent log
        const room = io.sockets.adapter.rooms.get(roomId);
        const _p = { location: 'server/socket.js:join-room:controller', message: 'Controller join check', data: { roomIdParam, roomId, roomExists: !!room, roomSize: room ? room.size : 0, hasMethod: room ? typeof room.has : null }, timestamp: Date.now(), hypothesisId: 'A,E' };
        fetch('http://127.0.0.1:7242/ingest/ef5c1aef-4ac7-4e4a-b493-a44e9beddc9c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(_p) }).catch(() => {});
        debugLog(_p);
        // #endregion
        if (!roomId) {
          socket.emit('error', { message: 'Invalid or missing room ID' });
          return;
        }

        if (!room || room.size === 0) {
          socket.emit('error', { message: 'Room not found. Open the desktop viewer first.' });
          return;
        }

        socket.join(roomId);
        socket.roomId = roomId;
        socket.role = 'controller';
        // Notify viewer(s) in the room that a controller joined
        socket.to(roomId).emit('controller-joined');
        console.log('Controller joined room:', roomId);
        return;
      }

      socket.emit('error', { message: 'Invalid role. Use "viewer" or "controller".' });
    });

    /**
     * Laser movement: forward from controller to viewer(s) in same room
     * Supports 30–60 FPS; no throttling on server to avoid lag
     */
    socket.on('laser-move', (data) => {
      const roomId = socket.roomId;
      if (!roomId || socket.role !== 'controller') return;
      const x = typeof data.x === 'number' ? data.x : 0;
      const y = typeof data.y === 'number' ? data.y : 0;
      // #region agent log
      const now = Date.now();
      if (now - lastLaserLogTime >= LASER_LOG_INTERVAL_MS) {
        lastLaserLogTime = now;
        const _p = { location: 'server/socket.js:laser-move', message: 'Forwarding laser', data: { roomId, role: socket.role, x, y }, timestamp: now, hypothesisId: 'D' };
        fetch('http://127.0.0.1:7242/ingest/ef5c1aef-4ac7-4e4a-b493-a44e9beddc9c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(_p) }).catch(() => {});
        debugLog(_p);
      }
      // #endregion
      socket.to(roomId).emit('laser-move', { x, y });
    });

    /**
     * Disconnection: notify room and clean up
     */
    socket.on('disconnect', (reason) => {
      const roomId = socket.roomId;
      const role = socket.role;

      if (role === 'controller' && roomId) {
        socket.to(roomId).emit('controller-left');
        console.log('Controller left room:', roomId);
      }

      if (role === 'viewer' && roomId) {
        socket.to(roomId).emit('viewer-left');
        console.log('Viewer left room:', roomId);
      }

      console.log('Client disconnected:', socket.id, reason);
    });
  });
}

module.exports = { attachSocketHandlers };
