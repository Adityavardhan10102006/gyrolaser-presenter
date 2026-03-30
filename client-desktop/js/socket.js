// OLD — missing or incomplete event handling
socket.on('connect', () => {
  socket.emit('join-room', { roomId, role: 'presenter' });
  // ← no UI update here
});
// ← controller-joined and controller-left never listened to

// NEW — full lifecycle, every event updates UI
socket.on('connect', () => {
  socket.emit('join-room', { roomId, role: 'presenter' });
  UI.setStatus('waiting', 'Waiting for controller');  // ← update UI
});

socket.on('room-state', ({ controllerCount }) => {
  // Server tells us if a controller is already in the room when we join
  if (controllerCount > 0) onControllerJoined(false);
});

socket.on('controller-joined', () => {
  onControllerJoined(true);  // ← this was missing
});

socket.on('controller-left', () => {
  Laser.hide();
  UI.setStatus('waiting', 'Controller disconnected'); // ← this was missing
  UI.showToast('Controller disconnected');
});

socket.on('disconnect', () => {
  Laser.hide();
  UI.setStatus('error', 'Disconnected');  // ← this was missing
});

// Helper that advances the UI to the connected state
function onControllerJoined(showToast) {
  UI.setStatus('connected', 'Controller active');
  Laser.start();
  if (UI.getView() === 'waiting') {
    UI.hideQR();
    setTimeout(() => UI.setView('connected'), 300);
  }
  if (showToast) UI.showToast('Controller connected');
}