/**
 * GyroLaser Desktop Viewer
 * Connects to Socket.io server and displays presentation with laser pointer
 */

// Configuration
const SERVER_URL = 'https://gyrolaser-presenter-1.onrender.com';

// DOM Elements
const laserDot = document.getElementById('laserDot');
const roomIdDisplay = document.getElementById('roomId');
const connectionStatus = document.getElementById('connectionStatus');
const qrSection = document.getElementById('qrSection');
const slideContainer = document.getElementById('slideContainer');
const currentSlideDisplay = document.getElementById('currentSlide');
const totalSlidesDisplay = document.getElementById('totalSlides');
const uploadInput = document.getElementById("pptUpload");
const pptStatus = document.getElementById("pptStatus");
const canvas = document.getElementById("pptCanvas");
const ctx = canvas.getContext("2d");

uploadInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    qrSection.style.display = "none";
    pptStatus.textContent = "Presentation Loaded";

    if (file.type === "application/pdf") {
        renderPDF(file);
    } else {
        alert("Only PDF is supported for now.");
    }

    goToSlide(3);
});

async function renderPDF(file) {
    const url = URL.createObjectURL(file);
    const pdf = await pdfjsLib.getDocument(url).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 1.5 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
        canvasContext: ctx,
        viewport: viewport
    }).promise;
}



// State
let socket = null;
let currentSlide = 1;
const totalSlides = document.querySelectorAll('.slide').length;

/**
 * Initialize Socket.io connection
 */
function initSocket() {
    socket = io(SERVER_URL);

    // Connection successful
    socket.on('connect', () => {
        console.log('Connected to server');
        updateConnectionStatus(true);
        roomIdDisplay.textContent = '...';
        // Join as viewer; server will create room and emit room-created
        socket.emit('join-room', { role: 'viewer' });
    });

    // Server assigns room ID (6-char)
    socket.on('room-created', (data) => {
        const roomId = data.roomId || '';
        roomIdDisplay.textContent = roomId;
        showQrCode(roomId);
    });

    socket.on('controller-joined', () => {
        console.log('Controller joined');
    });

    socket.on('controller-left', () => {
        console.log('Controller left');
        hideLaser();
    });

    socket.on('viewer-left', () => {});

    // Connection lost
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        updateConnectionStatus(false);
        hideLaser();
    });

    // Receive laser position updates
    socket.on('laser-move', (data) => {
        updateLaserPosition(data.x, data.y);
    });

    // Error handling
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        updateConnectionStatus(false);
    });
}

/**
 * Update connection status indicator
 * @param {boolean} isConnected - Connection state
 */
function updateConnectionStatus(isConnected) {
    if (isConnected) {
        connectionStatus.textContent = 'Connected';
        connectionStatus.classList.add('connected');
    } else {
        connectionStatus.textContent = 'Disconnected';
        connectionStatus.classList.remove('connected');
    }
}

/**
 * Update laser pointer position
 * @param {number} x - Normalized x coordinate (0-1)
 * @param {number} y - Normalized y coordinate (0-1)
 */
function updateLaserPosition(x, y) {
    // Convert normalized coordinates to pixel values
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const pixelX = x * viewportWidth;
    const pixelY = y * viewportHeight;
    
    // Update laser dot position with smooth transform
    laserDot.style.transform = `translate(${pixelX}px, ${pixelY}px)`;
    let smoothX = 0;
    let smoothY = 0;

    socket.on("laser-move", ({ x, y }) => {
        const rect = canvas.getBoundingClientRect();

        smoothX += (x - smoothX) * 0.2;
        smoothY += (y - smoothY) * 0.2;

        laserDot.style.left = rect.left + smoothX * rect.width + "px";
       laserDot.style.top = rect.top + smoothY * rect.height + "px";
    });

    
    // Show laser if hidden
    if (!laserDot.classList.contains('visible')) {
        showLaser();
    }
}

/**
 * Show laser pointer
 */
function showLaser() {
    laserDot.classList.add('visible');
}

/**
 * Hide laser pointer
 */
function hideLaser() {
    laserDot.classList.remove('visible');
}

/**
 * Show QR code for mobile join URL
 * @param {string} roomId - 6-char room ID
 */
function showQrCode(roomId) {
    if (!qrSection || !roomId) return;
    const img = document.createElement('img');
    img.alt = 'Scan to connect mobile';
    img.src = SERVER_URL + '/api/qrcode/' + encodeURIComponent(roomId);
    qrSection.innerHTML = '';
    qrSection.appendChild(img);
}

/**
 * Navigate to specific slide
 * @param {number} slideNumber - Target slide number
 */
function goToSlide(slideNumber) {
    // Validate slide number
    if (slideNumber < 1 || slideNumber > totalSlides) {
        return;
    }
    
    // Remove active class from current slide
    const currentSlideElement = document.querySelector('.slide.active');
    if (currentSlideElement) {
        currentSlideElement.classList.remove('active');
    }
    
    // Add active class to target slide
    const targetSlide = document.querySelector(`.slide[data-slide="${slideNumber}"]`);
    if (targetSlide) {
        targetSlide.classList.add('active');
        currentSlide = slideNumber;
        updateSlideCounter();
    }
}

/**
 * Navigate to next slide
 */
function nextSlide() {
    if (currentSlide < totalSlides) {
        goToSlide(currentSlide + 1);
    }
}

/**
 * Navigate to previous slide
 */
function previousSlide() {
    if (currentSlide > 1) {
        goToSlide(currentSlide - 1);
    }
}

/**
 * Update slide counter display
 */
function updateSlideCounter() {
    currentSlideDisplay.textContent = currentSlide;
    totalSlidesDisplay.textContent = totalSlides;
}

/**
 * Handle keyboard navigation
 */
function initKeyboardNavigation() {
    document.addEventListener('keydown', (event) => {
        switch(event.key) {
            case 'ArrowRight':
            case 'ArrowDown':
            case ' ': // Space bar
                event.preventDefault();
                nextSlide();
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                event.preventDefault();
                previousSlide();
                break;
            case 'Home':
                event.preventDefault();
                goToSlide(1);
                break;
            case 'End':
                event.preventDefault();
                goToSlide(totalSlides);
                break;
        }
    });
}

/**
 * Initialize application
 */ 
function init() {
    console.log('Initializing GyroLaser Desktop Viewer...');
    
    // Set initial slide counter
    updateSlideCounter();
    
    // Initialize keyboard controls
    initKeyboardNavigation();
    
    // Connect to Socket.io server
    initSocket();
    
    console.log('Desktop Viewer ready.');
}

// Start application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
