/**
 * GyroLaser Mobile Controller logic
 */

const socket = io();

// DOM Elements
const connectionPanel = document.getElementById('connectionPanel');
const roomIdInput = document.getElementById('roomIdInput');
const connectBtn = document.getElementById('connectBtn');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');

const controlPanel = document.getElementById('controlPanel');
const permissionBtn = document.getElementById('permissionBtn');
const activeControls = document.getElementById('activeControls');
const disconnectBtn = document.getElementById('disconnectBtn');

const valX = document.getElementById('valX');
const valY = document.getElementById('valY');
const sensitivitySlider = document.getElementById('sensitivitySlider');
const sensValue = document.getElementById('sensValue');

// State
let isConnected = false;
let isTracking = false;
let roomId = null;
let sensitivity = 1.0;

// Base center anchor to map relative movement
let baseX = null;
let baseY = null;

// The current calculated laser pos (normalized 0-1)
let laserX = 0.5;
let laserY = 0.5;

// Read query params for auto-fill ROOM ID
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('room')) {
    roomIdInput.value = urlParams.get('room');
}

// ------ Socket Logic ------ //
socket.on('connect', () => {
    console.log('Connected to server socket');
});

socket.on('room-joined', () => {
    updateConnectionStatus(true);
    connectionPanel.classList.add('hidden');
    controlPanel.classList.remove('hidden');
});

socket.on('error', (err) => {
    alert('Error: ' + err.message);
    resetState();
});

socket.on('disconnect', () => {
    resetState();
});

// ------ UI Handlers ------ //
connectBtn.addEventListener('click', () => {
    const val = roomIdInput.value.trim().toUpperCase();
    if (val.length !== 6) {
        alert("Please enter a valid 6-character room ID.");
        return;
    }
    roomId = val;
    socket.emit('join-room', { role: 'controller', roomId: roomId });
});

disconnectBtn.addEventListener('click', () => {
    socket.emit('trigger-disconnect');
    resetState();
});

sensitivitySlider.addEventListener('input', (e) => {
    sensitivity = parseFloat(e.target.value);
    sensValue.textContent = sensitivity.toFixed(1);
    
    // Recalibrate on sensitivity change
    baseX = null;
    baseY = null;
});

permissionBtn.addEventListener('click', async () => {
    try {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission === 'granted') {
                enableTracking();
            } else {
                alert('Permission denied. Cannot control the laser without gyroscope access.');
            }
        } else {
            // Android / Non-iOS 13+
            enableTracking();
        }
    } catch (e) {
        alert('Error accessing motion sensors: ' + e.message);
    }
});

// ------ Orientation Logic ------ //
function enableTracking() {
    isTracking = true;
    permissionBtn.classList.add('hidden');
    activeControls.classList.remove('hidden');
    
    // Reset calibration
    baseX = null;
    baseY = null;
    laserX = 0.5;
    laserY = 0.5;

    window.addEventListener('deviceorientation', handleOrientation);
}

function disableTracking() {
    isTracking = false;
    permissionBtn.classList.remove('hidden');
    activeControls.classList.add('hidden');
    window.removeEventListener('deviceorientation', handleOrientation);
}

// Emitting data at a locked frame rate (e.g., 30 fps) to avoid socket flood
let lastEmit = 0;
const EMIT_INTERVAL = 1000 / 30;

function handleOrientation(event) {
    if (!isConnected || !isTracking) return;
    
    // gamma is left-to-right (-90 to 90)
    // beta is front-to-back (-180 to 180)
    let b = event.beta;
    let g = event.gamma;
    
    // Calibration pass
    if (baseX === null || baseY === null) {
        baseX = g;
        baseY = b;
        return;
    }

    // Delta mapping (relative to when calibrated)
    // deltaG (X movement), deltaB (Y movement)
    let deltaG = g - baseX;
    let deltaB = b - baseY;

    // Apply sensitivity mapping
    // We assume roughly 40 degrees of tilt corresponds to a full screen sweep
    let mapSize = 40 / sensitivity;

    laserX = 0.5 + (deltaG / mapSize);
    laserY = 0.5 + (deltaB / mapSize); // inverted depending on grip

    // Clamp values 0 to 1
    laserX = Math.max(0, Math.min(1, laserX));
    laserY = Math.max(0, Math.min(1, laserY));

    // Update HUD visually
    valX.textContent = laserX.toFixed(2);
    valY.textContent = laserY.toFixed(2);

    // Throttle emit
    const now = Date.now();
    if (now - lastEmit > EMIT_INTERVAL) {
        socket.emit('laser-move', { x: laserX, y: laserY });
        lastEmit = now;
    }
}

function updateConnectionStatus(connected) {
    isConnected = connected;
    if (connected) {
        statusText.textContent = 'Linked to ' + roomId;
        statusIndicator.classList.add('connected');
    } else {
        statusText.textContent = 'Disconnected';
        statusIndicator.classList.remove('connected');
    }
}

function resetState() {
    updateConnectionStatus(false);
    disableTracking();
    connectionPanel.classList.remove('hidden');
    controlPanel.classList.add('hidden');
    roomId = null;
}