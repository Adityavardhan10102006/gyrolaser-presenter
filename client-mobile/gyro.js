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
let sensitivity = 1.2;

sensitivitySlider.oninput = () => {
    sensitivity = parseFloat(sensitivitySlider.value);
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
        
        // Join room as controller
        socket.emit('join-room', {
            roomId: roomId,
            role: 'controller'
        });
        
        updateConnectionStatus(true);
        showMotionCard();
    });
    
    // Connection lost
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        updateConnectionStatus(false);
        stopTracking();
    });
    
    // Server error (e.g. invalid room, room not found)
    socket.on('error', (data) => {
        const msg = data && data.message ? data.message : 'Connection error';
        alert(msg);
        resetConnection();
    });
    
    // Error handling
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        alert('Failed to connect to server. Make sure the server is running.');
        resetConnection();
    });
}

/**
 * Update connection status UI
 * @param {boolean} connected - Connection state
 */
function updateConnectionStatus(connected) {
    isConnected = connected;
    
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
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            
            const permission = await DeviceOrientationEvent.requestPermission();
            
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
    if (isTracking) return;
    
    isTracking = true;
    
    // Add orientation event listener
    window.addEventListener('deviceorientation', handleOrientation, true);
    
    // Update UI
    permissionBtn.style.display = 'none';
    instructions.style.display = 'block';
    stopBtn.style.display = 'block';
    debugInfo.style.display = 'block';
    
    console.log('Motion tracking started');
}

/**
 * Stop tracking device orientation
 */
function stopTracking() {
    if (!isTracking) return;
    
    isTracking = false;
    
    // Remove orientation event listener
    window.removeEventListener('deviceorientation', handleOrientation, true);
    
    // Update UI
    permissionBtn.style.display = 'block';
    instructions.style.display = 'none';
    stopBtn.style.display = 'none';
    debugInfo.style.display = 'none';
    
    console.log('Motion tracking stopped');
}

/**
 * Handle device orientation event
 * @param {DeviceOrientationEvent} event - Orientation data
 */

function handleOrientation(event) {
    if (!isConnected || !isTracking) return;
    
    // Throttle updates based on UPDATE_RATE
    const currentTime = Date.now();
    if (currentTime - lastUpdateTime < UPDATE_INTERVAL) {
        return;
    }
    lastUpdateTime = currentTime;
    
    // Get orientation values
    const alpha = event.alpha || 0; // Compass direction (0-360)
    const beta = event.beta || 0;   // Front-to-back tilt (-180 to 180)
    const gamma = event.gamma || 0; // Left-to-right tilt (-90 to 90)
    
    // Convert to normalized coordinates (0-1)
    const coordinates = convertToCoordinates(alpha, beta, gamma);
    
    // Send to server
    sendLaserPosition(coordinates.x, coordinates.y);
    
    // Update debug display
    updateDebugDisplay(coordinates.x, coordinates.y, alpha, beta, gamma);
}

/**
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
    x = x * sensitivity;
    y = y * sensitivity;

    // Clamp values between 0 and 1
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    return { x, y };
}

/**
 * Send laser position to server
 * @param {number} x - Normalized x coordinate (0-1)
 * @param {number} y - Normalized y coordinate (0-1)
 */
function sendLaserPosition(x, y) {
    if (!socket || !isConnected) return;
    
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
    
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
    // Connect button
    connectBtn.addEventListener('click', connectToServer);
    
    // Permission button
    permissionBtn.addEventListener('click', requestMotionPermission);
    
    // Stop button
    stopBtn.addEventListener('click', stopTracking);
    
    // Enter key on room ID input
    roomIdInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            connectToServer();
        }
    });
}

/**
 * Pre-fill room ID from URL query ?room=ROOMID (e.g. from QR code)
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
    
    // Pre-fill room from ?room= (QR code link)
    initFromUrl();
    
    // Check for device orientation support
    if (!window.DeviceOrientationEvent) {
        alert('Device orientation not supported on this device');
        return;
    }
    
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
        if (isTracking) {
            console.log('Page hidden - pausing tracking');
        }
    } else {
        // Page visible - resume tracking if was active
        if (isTracking) {
            console.log('Page visible - resuming tracking');
        }
    }
});
