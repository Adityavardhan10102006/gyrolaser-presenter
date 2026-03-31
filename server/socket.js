/**
 * Socket.io room and laser relay logic for GyroLaser
 * Connects 1 Viewer -> 1 Controller
 */

function attachSocketHandlers(io) {
  // Store room state in memory
  // { 'roomId': { viewerId: 'socketId', controllerId: 'socketId' } }
  const roomState = {};

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Ping mechanism exists naturally in socket.io but we can trace connections
    socket.on('join-room', (payload) => {
      const role = payload && payload.role;
      const roomId = payload && payload.roomId && payload.roomId.trim();

      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }

      if (roomId.length > 50) {
        socket.emit('error', { message: 'Room ID too long' });
        return;
      }

      if (!roomState[roomId]) {
        roomState[roomId] = { viewerId: null, controllerId: null };
      }

      if (role === 'viewer') {
        socket.join(roomId);
        socket.roomId = roomId;
        socket.role = 'viewer';
        
        roomState[roomId].viewerId = socket.id;
        console.log(`Viewer joined room: ${roomId}`);
        
        socket.emit('room-joined', { roomId: roomId });
        return;
      }

      if (role === 'controller') {
        // Enforce 1 controller per room ideally
        const currentController = roomState[roomId].controllerId;
        if (currentController && currentController !== socket.id) {
          // You might reject, or override. Overriding is often better for ux if a user reconnects.
          io.to(currentController).emit('error', { message: 'Another controller took over.' });
          // Optionally disconnect the old controller
        }

        socket.join(roomId);
        socket.roomId = roomId;
        socket.role = 'controller';
        roomState[roomId].controllerId = socket.id;
        
        // Notify viewer
        socket.to(roomId).emit('controller-joined');
        console.log(`Controller joined room: ${roomId}`);
        socket.emit('room-joined', { roomId: roomId });
        return;
      }

      socket.emit('error', { message: 'Invalid role.' });
    });

    // Relay laser coordinates
    socket.on('laser-move', (data) => {
      const roomId = socket.roomId;
      
      if (!roomId || socket.role !== 'controller') {
        return;
      }

      // Validating coordinates
      const x = typeof data.x === 'number' ? Math.max(0, Math.min(1, data.x)) : 0;
      const y = typeof data.y === 'number' ? Math.max(0, Math.min(1, data.y)) : 0;

      // Broadcast only to viewer(s) in this room
      socket.to(roomId).emit('laser-move', { x, y });
    });

    socket.on('trigger-disconnect', () => {
       // Controller requests manual disconnect
       const roomId = socket.roomId;
       if (roomId && socket.role === 'controller') {
         socket.to(roomId).emit('controller-left');
         socket.leave(roomId);
         if (roomState[roomId]?.controllerId === socket.id) {
            roomState[roomId].controllerId = null;
         }
         socket.roomId = null;
         socket.role = null;
       }
    });

    socket.on('disconnect', (reason) => {
      const roomId = socket.roomId;
      const role = socket.role;

      if (roomId && roomState[roomId]) {
        if (role === 'controller') {
          socket.to(roomId).emit('controller-left');
          console.log(`Controller left room: ${roomId}`);
          if (roomState[roomId].controllerId === socket.id) {
             roomState[roomId].controllerId = null;
          }
        }
        if (role === 'viewer') {
          socket.to(roomId).emit('viewer-left');
          console.log(`Viewer left room: ${roomId}`);
          if (roomState[roomId].viewerId === socket.id) {
             roomState[roomId].viewerId = null;
          }
        }
        
        // Cleanup empty rooms
        if (!roomState[roomId].viewerId && !roomState[roomId].controllerId) {
           delete roomState[roomId];
        }
      }
      console.log('Client disconnected:', socket.id, 'Reason:', reason);
    });
  });
}

module.exports = { attachSocketHandlers };