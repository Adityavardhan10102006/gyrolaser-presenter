/**
 * GyroLaser Mobile Controller
 * Captures gyroscope data and sends to Socket.io server
 */

// Configuration
const SERVER_URL = 'https://gyrolaser-presenter-1.onrender.com';
const UPDATE_RATE = 60; // Updates per second (FPS)
const UPDATE_INTERVAL = 1000 / UPDATE_RATE;

// DOM Elements
const connectBtn = document.getElementById('connectBtn');
const permissionBtn = document.getElementById('permissionBtn');
const stopBtn = document.getElementById('stopBtn');
const roomIdInput = document.getElementById('roomIdInput');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const motionCard = document.getElementById('motionCard');
const instructions = document.getElementById('instructions');
const debugInfo = document.getElementById('debugInfo');

// Debug elements
const debugX = document.getElementById('debugX');
const debugY = document.getElementById('debugY');
const debugAlpha = document.getElementById('debugAlpha');
const debugBeta = document.getElementById('debugBeta');
const debugGamma = document.getElementById('debugGamma');
const sensitivitySlider = document.getElementById("sensitivity");
<<<<<<< HEAD
let sensitivity = 1.2;

sensitivitySlider.oninput = () => {
    sensitivity = parseFloat(sensitivitySlider.value);
=======
const sensitivityValue = document.getElementById("sensitivityValue");

// INCREASED DEFAULT SENSITIVITY
let sensitivity = 2.0;

sensitivitySlider.oninput = () => {
    sensitivity = parseFloat(sensitivitySlider.value);
    if (sensitivityValue) {
        sensitivityValue.textContent = sensitivity.toFixed(1) + 'x';
    }
>>>>>>> 1c1bc0e (updated)
};


// State
let socket = null;
let roomId = null;
let isConnected = false;
let isTracking = false;
let lastUpdateTime = 0;

/**
 * Connect to Socket.io server
 */
function connectToServer() {
<<<<<<< HEAD
    roomId = roomIdInput.value.trim();
    
    if (!roomId) {
        alert('Please enter a room ID');
        return;
    }
    
    // Disable connect button
    connectBtn.disabled = true;
    connectBtn.textContent = 'Connecting...';
    
    // Initialize socket connection
    socket = io(SERVER_URL);
    
    // Connection successful
    socket.on('connect', () => {
        console.log('Connected to server');
        
=======
    roomId = roomIdInput.value.trim().toUpperCase();

    // Validate room ID
    if (!roomId || roomId.length < 3 || roomId.length > 20) {
        alert('Room ID must be between 3 and 20 characters');
        return;
    }

    // Validate characters
    if (!/^[A-Z0-9_-]+$/.test(roomId)) {
        alert('Room ID can only contain letters, numbers, underscores, and hyphens');
        return;
    }

    // Disable connect button
    connectBtn.disabled = true;
    connectBtn.textContent = 'Connecting...';

    // Initialize socket connection
    socket = io(SERVER_URL);

    // Connection successful
    socket.on('connect', () => {
        console.log('Connected to server');

>>>>>>> 1c1bc0e (updated)
        // Join room as controller
        socket.emit('join-room', {
            roomId: roomId,
            role: 'controller'
        });
<<<<<<< HEAD
        
        updateConnectionStatus(true);
        showMotionCard();
    });
    
=======

        updateConnectionStatus(true);
        showMotionCard();
    });

>>>>>>> 1c1bc0e (updated)
    // Connection lost
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        updateConnectionStatus(false);
        stopTracking();
    });
<<<<<<< HEAD
    
    // Server error (e.g. invalid room, room not found)
=======

    // Server error
>>>>>>> 1c1bc0e (updated)
    socket.on('error', (data) => {
        const msg = data && data.message ? data.message : 'Connection error';
        alert(msg);
        resetConnection();
    });
<<<<<<< HEAD
    
=======

>>>>>>> 1c1bc0e (updated)
    // Error handling
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        alert('Failed to connect to server. Make sure the server is running.');
        resetConnection();
    });
}

/**
 * Update connection status UI
<<<<<<< HEAD
 * @param {boolean} connected - Connection state
 */
function updateConnectionStatus(connected) {
    isConnected = connected;
    
=======
 */
function updateConnectionStatus(connected) {
    isConnected = connected;

>>>>>>> 1c1bc0e (updated)
    if (connected) {
        statusText.textContent = 'Connected';
        statusIndicator.classList.add('connected');
    } else {
        statusText.textContent = 'Disconnected';
        statusIndicator.classList.remove('connected');
    }
}

/**
 * Show motion control card
 */
function showMotionCard() {
    motionCard.style.display = 'block';
}

/**
 * Request device motion permissions
 */
async function requestMotionPermission() {
    try {
        // iOS 13+ requires explicit permission
<<<<<<< HEAD
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            
            const permission = await DeviceOrientationEvent.requestPermission();
            
=======
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {

            const permission = await DeviceOrientationEvent.requestPermission();

>>>>>>> 1c1bc0e (updated)
            if (permission === 'granted') {
                startTracking();
            } else {
                alert('Motion permission denied. Please enable in settings.');
            }
        } else {
            // Android or older iOS - no permission needed
            startTracking();
        }
    } catch (error) {
        console.error('Permission error:', error);
        alert('Error requesting motion permission: ' + error.message);
    }
}

/**
 * Start tracking device orientation
 */
function startTracking() {
<<<<<<< HEAD
    if (isTracking) return;
    
    isTracking = true;
    
    // Add orientation event listener
    window.addEventListener('deviceorientation', handleOrientation, true);
    
=======
    if (!isConnected) {
        alert('Please wait for connection...');
        return;
    }

    if (isTracking) return;

    isTracking = true;

    // Add orientation event listener
    window.addEventListener('deviceorientation', handleOrientation, true);

>>>>>>> 1c1bc0e (updated)
    // Update UI
    permissionBtn.style.display = 'none';
    instructions.style.display = 'block';
    stopBtn.style.display = 'block';
    debugInfo.style.display = 'block';
<<<<<<< HEAD
    
=======

>>>>>>> 1c1bc0e (updated)
    console.log('Motion tracking started');
}

/**
 * Stop tracking device orientation
 */
function stopTracking() {
    if (!isTracking) return;
<<<<<<< HEAD
    
    isTracking = false;
    
    // Remove orientation event listener
    window.removeEventListener('deviceorientation', handleOrientation, true);
    
=======

    isTracking = false;

    // Remove orientation event listener
    window.removeEventListener('deviceorientation', handleOrientation, true);

>>>>>>> 1c1bc0e (updated)
    // Update UI
    permissionBtn.style.display = 'block';
    instructions.style.display = 'none';
    stopBtn.style.display = 'none';
    debugInfo.style.display = 'none';
<<<<<<< HEAD
    
=======

>>>>>>> 1c1bc0e (updated)
    console.log('Motion tracking stopped');
}

/**
 * Handle device orientation event
<<<<<<< HEAD
 * @param {DeviceOrientationEvent} event - Orientation data
 */

function handleOrientation(event) {
    if (!isConnected || !isTracking) return;
    
    // Throttle updates based on UPDATE_RATE
=======
 */
function handleOrientation(event) {
    if (!isConnected || !isTracking) return;

    // Throttle updates
>>>>>>> 1c1bc0e (updated)
    const currentTime = Date.now();
    if (currentTime - lastUpdateTime < UPDATE_INTERVAL) {
        return;
    }
    lastUpdateTime = currentTime;
<<<<<<< HEAD
    
    // Get orientation values
    const alpha = event.alpha || 0; // Compass direction (0-360)
    const beta = event.beta || 0;   // Front-to-back tilt (-180 to 180)
    const gamma = event.gamma || 0; // Left-to-right tilt (-90 to 90)
    
    // Convert to normalized coordinates (0-1)
    const coordinates = convertToCoordinates(alpha, beta, gamma);
    
    // Send to server
    sendLaserPosition(coordinates.x, coordinates.y);
    
=======

    // Get orientation values
    const alpha = event.alpha || 0;
    const beta = event.beta || 0;
    const gamma = event.gamma || 0;

    // Convert to normalized coordinates
    const coordinates = convertToCoordinates(alpha, beta, gamma);

    // Send to server
    sendLaserPosition(coordinates.x, coordinates.y);

    // Update phone preview
    updatePhonePreview(coordinates.x, coordinates.y);

>>>>>>> 1c1bc0e (updated)
    // Update debug display
    updateDebugDisplay(coordinates.x, coordinates.y, alpha, beta, gamma);
}

/**
<<<<<<< HEAD
 * Convert gyroscope values to normalized screen coordinates
 * @param {number} alpha - Compass direction (0-360)
 * @param {number} beta - Front-to-back tilt (-180 to 180)
 * @param {number} gamma - Left-to-right tilt (-90 to 90)
 * @returns {{x: number, y: number}} Normalized coordinates (0-1)
 */
function convertToCoordinates(alpha, beta, gamma) {
    // X-axis: Use gamma (left-right tilt)
    let x = (gamma + 45) / 90;

    // Y-axis: Use beta (front-back tilt)
    let y = (beta + 90) / 180;

    // --- ADD SENSITIVITY HERE ---
=======
 * Update phone preview laser dot
 */
function updatePhonePreview(x, y) {
    const laserDot = document.getElementById('laserDot');
    if (laserDot) {
        laserDot.style.left = (x * 100) + '%';
        laserDot.style.top = (y * 100) + '%';
    }
}

/**
 * Convert gyroscope values to normalized screen coordinates
 */
function convertToCoordinates(alpha, beta, gamma) {
    let x = (gamma + 45) / 90;
    let y = (beta + 90) / 180;

    // Apply sensitivity
>>>>>>> 1c1bc0e (updated)
    x = x * sensitivity;
    y = y * sensitivity;

    // Clamp values between 0 and 1
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    return { x, y };
}

/**
 * Send laser position to server
<<<<<<< HEAD
 * @param {number} x - Normalized x coordinate (0-1)
 * @param {number} y - Normalized y coordinate (0-1)
 */
function sendLaserPosition(x, y) {
    if (!socket || !isConnected) return;
    
=======
 */
function sendLaserPosition(x, y) {
    if (!socket || !isConnected) return;

>>>>>>> 1c1bc0e (updated)
    socket.emit('laser-move', {
        x: x,
        y: y
    });
}

/**
 * Update debug display
 */
function updateDebugDisplay(x, y, alpha, beta, gamma) {
    debugX.textContent = x.toFixed(2);
    debugY.textContent = y.toFixed(2);
    debugAlpha.textContent = Math.round(alpha);
    debugBeta.textContent = Math.round(beta);
    debugGamma.textContent = Math.round(gamma);
}

/**
 * Reset connection state
 */
function resetConnection() {
    connectBtn.disabled = false;
    connectBtn.textContent = 'Connect to Room';
    updateConnectionStatus(false);
    stopTracking();
<<<<<<< HEAD
    
=======

>>>>>>> 1c1bc0e (updated)
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
<<<<<<< HEAD
    // Connect button
    connectBtn.addEventListener('click', connectToServer);
    
    // Permission button
    permissionBtn.addEventListener('click', requestMotionPermission);
    
    // Stop button
    stopBtn.addEventListener('click', stopTracking);
    
    // Enter key on room ID input
=======
    connectBtn.addEventListener('click', connectToServer);
    permissionBtn.addEventListener('click', requestMotionPermission);
    stopBtn.addEventListener('click', stopTracking);

>>>>>>> 1c1bc0e (updated)
    roomIdInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            connectToServer();
        }
    });
}

/**
<<<<<<< HEAD
 * Pre-fill room ID from URL query ?room=ROOMID (e.g. from QR code)
=======
 * Pre-fill room ID from URL
>>>>>>> 1c1bc0e (updated)
 */
function initFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room && roomIdInput) {
        roomIdInput.value = room.trim().toUpperCase();
    }
}

/**
 * Initialize application
 */
function init() {
    console.log('Initializing GyroLaser Mobile Controller...');
<<<<<<< HEAD
    
    // Pre-fill room from ?room= (QR code link)
    initFromUrl();
    
    // Check for device orientation support
=======

    initFromUrl();

>>>>>>> 1c1bc0e (updated)
    if (!window.DeviceOrientationEvent) {
        alert('Device orientation not supported on this device');
        return;
    }
<<<<<<< HEAD
    
    // Initialize event listeners
    initEventListeners();
    
    console.log('Mobile Controller ready');
}

// Start application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page hidden - pause tracking
=======

    initEventListeners();

    // Set initial sensitivity value display
    if (sensitivityValue) {
        sensitivityValue.textContent = sensitivity.toFixed(1) + 'x';
    }

    console.log('Mobile Controller ready');
}

document.addEventListener('DOMContentLoaded', init);

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
>>>>>>> 1c1bc0e (updated)
        if (isTracking) {
            console.log('Page hidden - pausing tracking');
        }
    } else {
<<<<<<< HEAD
        // Page visible - resume tracking if was active
=======
>>>>>>> 1c1bc0e (updated)
        if (isTracking) {
            console.log('Page visible - resuming tracking');
        }
    }
<<<<<<< HEAD
});
=======
});
>>>>>>> 1c1bc0e (updated)
