/**
 * Socket.io room and laser relay logic for GyroLaser
 * Handles viewer/controller pairing and real-time laser position forwarding
 */

/**
 * Attach Socket.io event handlers to the server
 * @param {object} io - Socket.io server instance
 */
function attachSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    /**
     * Join room as viewer or controller
     * Viewer: provides roomId from frontend (auto-generated client-side)
     * Controller: provides roomId to join existing viewer's room
     */
    socket.on('join-room', (payload) => {
      const role = payload && payload.role;
      const roomId = payload && payload.roomId;

      // Validate room ID
      if (!roomId || typeof roomId !== 'string') {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }

      // Sanitize and limit room ID
      const sanitizedRoomId = roomId.trim();
      if (sanitizedRoomId.length > 50) {
        socket.emit('error', { message: 'Room ID too long' });
        return;
      }

      if (role === 'viewer') {
        // Viewer: join room with their generated room ID
        socket.join(sanitizedRoomId);
        socket.roomId = sanitizedRoomId;
        socket.role = 'viewer';
        
        console.log('Viewer joined room:', sanitizedRoomId);
        socket.emit('room-joined', { roomId: sanitizedRoomId });
        return;
      }

      if (role === 'controller') {
        // Controller: validate that room exists before joining
        const room = io.sockets.adapter.rooms.get(sanitizedRoomId);
        
        if (!room || room.size === 0) {
          socket.emit('error', { message: 'Room not found. Make sure the desktop viewer is open first.' });
          return;
        }

        socket.join(sanitizedRoomId);
        socket.roomId = sanitizedRoomId;
        socket.role = 'controller';
        
        // Notify viewer(s) in the room that a controller joined
        socket.to(sanitizedRoomId).emit('controller-joined');
        console.log('Controller joined room:', sanitizedRoomId);
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
      
      // Only controllers can send laser movements
      if (!roomId || socket.role !== 'controller') {
        return;
      }

      // Validate and clamp coordinates
      const x = typeof data.x === 'number' ? Math.max(0, Math.min(1, data.x)) : 0;
      const y = typeof data.y === 'number' ? Math.max(0, Math.min(1, data.y)) : 0;

      // Broadcast to all other clients in the room (viewers)
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

      console.log('Client disconnected:', socket.id, 'Reason:', reason);
    });
  });
}

module.exports = { attachSocketHandlers };