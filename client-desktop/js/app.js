/**
 * GyroLaser Desktop Viewer
 * Connects to Socket.io server and displays presentation with laser pointer
 */

// Configuration
const SERVER_URL = 'http://localhost:3000';

// DOM Elements
const laserDot = document.getElementById('laserDot');
const roomIdDisplay = document.getElementById('roomId');
const connectionStatus = document.getElementById('connectionStatus');
const qrSection = document.getElementById('qrSection');
const slideContainer = document.getElementById('slideContainer');
const currentSlideDisplay = document.getElementById('currentSlide');
const totalSlidesDisplay = document.getElementById('totalSlides');
const fileInput = document.getElementById('fileInput');
const pdfWrapper = document.getElementById('pdfWrapper');
const pdfCanvas = document.getElementById('pdfCanvas');
const pdfCtx = pdfCanvas ? pdfCanvas.getContext('2d') : null;
const deckWrapper = document.getElementById('deckWrapper');
const pptxWrapper = document.getElementById('pptxWrapper');
const pptxContainer = document.getElementById('pptxContainer');
const slide3Default = document.getElementById('slide3Default');
const presentationStatus = document.getElementById('presentationStatus');
const clearPresentationBtn = document.getElementById('clearPresentationBtn');

// State
let socket = null;
let currentSlide = 1;
const totalSlides = document.querySelectorAll('.slide').length;
let pdfDoc = null;
let pdfCurrentPage = 1;
let pdfTotalPages = 0;
let pdfMode = false;
let pptxMode = false;
let pptxSlides = [];
let pptxCurrentIndex = 0;
let pptxTotal = 0;

// Laser smoothing state
let targetNormX = 0.5;
let targetNormY = 0.5;
let currentNormX = 0.5;
let currentNormY = 0.5;
const SMOOTHING_ALPHA = 0.25;
let animating = false;

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
    // Clamp normalized inputs
    targetNormX = Math.max(0, Math.min(1, x || 0));
    targetNormY = Math.max(0, Math.min(1, y || 0));

    if (!animating) {
        animating = true;
        requestAnimationFrame(animateLaser);
    }

    if (!laserDot.classList.contains('visible')) {
        showLaser();
    }
}

function animateLaser() {
    // Ease current towards target
    currentNormX += (targetNormX - currentNormX) * SMOOTHING_ALPHA;
    currentNormY += (targetNormY - currentNormY) * SMOOTHING_ALPHA;

    // Get active bounds (PDF canvas or PPTX container if loaded, otherwise whole slide container)
    const rect = (pdfMode && pdfCanvas)
        ? pdfCanvas.getBoundingClientRect()
        : (pptxMode && pptxContainer ? pptxContainer.getBoundingClientRect() : slideContainer.getBoundingClientRect());
    const w = rect.width;
    const h = rect.height;

    // Convert to pixels inside container and clamp
    let px = currentNormX * w;
    let py = currentNormY * h;

    // Keep dot within bounds
    const laserSize = 20;
    px = Math.max(0, Math.min(w - laserSize, px));
    py = Math.max(0, Math.min(h - laserSize, py));

    // If using PDF/PPTX, offset by inner container position within slideContainer
    let offsetX = 0, offsetY = 0;
    if ((pdfMode && pdfCanvas) || (pptxMode && pptxContainer)) {
        const contRect = slideContainer.getBoundingClientRect();
        offsetX = rect.left - contRect.left;
        offsetY = rect.top - contRect.top;
    }

    laserDot.style.transform = `translate(${px + offsetX}px, ${py + offsetY}px)`;

    // Continue animation loop if still moving
    if (Math.abs(targetNormX - currentNormX) > 0.0005 || Math.abs(targetNormY - currentNormY) > 0.0005) {
        requestAnimationFrame(animateLaser);
    } else {
        animating = false;
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
    if (pdfMode) {
        currentSlideDisplay.textContent = pdfCurrentPage;
        totalSlidesDisplay.textContent = pdfTotalPages || 0;
    } else if (pptxMode) {
        currentSlideDisplay.textContent = pptxCurrentIndex + 1;
        totalSlidesDisplay.textContent = pptxTotal || 0;
    } else {
        currentSlideDisplay.textContent = currentSlide;
        totalSlidesDisplay.textContent = totalSlides;
    }
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
                if (pdfMode) {
                    nextPdfPage();
                } else if (pptxMode) {
                    nextPptxSlide();
                } else {
                    nextSlide();
                }
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                event.preventDefault();
                if (pdfMode) {
                    prevPdfPage();
                } else if (pptxMode) {
                    prevPptxSlide();
                } else {
                    previousSlide();
                }
                break;
            case 'Home':
                event.preventDefault();
                if (pdfMode) {
                    goToPdfPage(1);
                } else if (pptxMode) {
                    goToPptxSlide(1);
                } else {
                    goToSlide(1);
                }
                break;
            case 'End':
                event.preventDefault();
                if (pdfMode) {
                    goToPdfPage(pdfTotalPages || 1);
                } else if (pptxMode) {
                    goToPptxSlide(pptxTotal || 1);
                } else {
                    goToSlide(totalSlides);
                }
                break;
        }
    });
}

// PDF.js integration
async function loadPdf(arrayBuffer) {
    if (!window['pdfjsLib']) {
        alert('PDF.js failed to load');
        return;
    }
    try {
        if (pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        }
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        pdfDoc = await loadingTask.promise;
        pdfTotalPages = pdfDoc.numPages || 0;
        pdfCurrentPage = 1;
        pdfMode = true;
        pptxMode = false;

        if (deckWrapper) deckWrapper.style.display = 'flex';
        if (pptxWrapper) pptxWrapper.style.display = 'none';
        if (pdfWrapper) pdfWrapper.style.display = 'flex';
        if (slide3Default) slide3Default.style.display = 'none';
        goToSlide(3);
        hideQrForPresentation(true);

        renderPdfPage(pdfCurrentPage);
        updateSlideCounter();
    } catch (e) {
        console.error('PDF load error:', e);
        alert('Failed to open PDF. Please try another file.');
        pdfMode = false;
    }
}

async function renderPdfPage(pageNumber) {
    if (!pdfDoc || !pdfCanvas || !pdfCtx) return;
    const page = await pdfDoc.getPage(pageNumber);
    const containerRect = slideContainer.getBoundingClientRect();
    const desiredW = containerRect.width;
    const desiredH = containerRect.height;
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(desiredW / unscaledViewport.width, desiredH / unscaledViewport.height);
    const viewport = page.getViewport({ scale });
    const dpr = window.devicePixelRatio || 1;
    pdfCanvas.width = Math.floor(viewport.width * dpr);
    pdfCanvas.height = Math.floor(viewport.height * dpr);
    pdfCanvas.style.width = Math.floor(viewport.width) + 'px';
    pdfCanvas.style.height = Math.floor(viewport.height) + 'px';
    const ctx = pdfCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
    await page.render({
        canvasContext: ctx,
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined
    }).promise;
}

function goToPdfPage(n) {
    if (!pdfDoc) return;
    n = Math.max(1, Math.min(pdfTotalPages, n));
    pdfCurrentPage = n;
    renderPdfPage(pdfCurrentPage);
    updateSlideCounter();
}

function nextPdfPage() {
    if (!pdfDoc) return;
    if (pdfCurrentPage < pdfTotalPages) {
        goToPdfPage(pdfCurrentPage + 1);
    }
}

function prevPdfPage() {
    if (!pdfDoc) return;
    if (pdfCurrentPage > 1) {
        goToPdfPage(pdfCurrentPage - 1);
    }
}

// PPTX rendering (via PPTXJS)
async function loadPptx(arrayBuffer) {
    if (!(window.jQuery && jQuery.fn && jQuery.fn.pptxToHtml)) {
        alert('PPTX viewer not available in this browser. Please upload a PDF.');
        return;
    }
    try {
        pptxMode = true;
        pdfMode = false;
        pptxSlides = [];
        pptxCurrentIndex = 0;
        pptxTotal = 0;

        if (deckWrapper) deckWrapper.style.display = 'flex';
        if (pptxWrapper) pptxWrapper.style.display = 'flex';
        if (pdfWrapper) pdfWrapper.style.display = 'none';
        if (slide3Default) slide3Default.style.display = 'none';
        goToSlide(3);
        hideQrForPresentation(true);

        pptxContainer.innerHTML = '';
        // Create a blob URL and let the jQuery plugin load it
        const blobUrl = URL.createObjectURL(new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }));
        const $container = jQuery(pptxContainer);
        $container.pptxToHtml({
            pptxFileUrl: blobUrl,
            slideMode: true,
            keyBoardShortCut: true
        }).then(() => {
            // Gather slides if available for manual nav fallback
            const candidates = pptxContainer.querySelectorAll('[data-slide-index], .slide, .pptx-slide, .pptx-page, .slide-container > div');
            pptxSlides = candidates.length ? Array.from(candidates) : Array.from(pptxContainer.children);
            pptxTotal = pptxSlides.length || 0;
            pptxCurrentIndex = 0;
            updateSlideCounter();
        }).catch((e) => {
            console.error('PPTX render error:', e);
            alert('Failed to render PPTX. Please try another file or upload a PDF.');
            pptxMode = false;
        });
    } catch (e) {
        console.error('PPTX load error:', e);
        alert('Failed to open PPTX. Please try another file or upload a PDF.');
        pptxMode = false;
    }
}

function goToPptxSlide(n) {
    if (!pptxMode || pptxSlides.length === 0) return;
    const idx = Math.max(1, Math.min(pptxSlides.length, n)) - 1;
    pptxSlides.forEach((el, i) => {
        el.style.display = i === idx ? '' : 'none';
    });
    pptxCurrentIndex = idx;
    updateSlideCounter();
}

function nextPptxSlide() {
    if (!pptxMode || pptxSlides.length === 0) return;
    if (pptxCurrentIndex + 1 < pptxSlides.length) {
        goToPptxSlide(pptxCurrentIndex + 2);
    }
}

function prevPptxSlide() {
    if (!pptxMode || pptxSlides.length === 0) return;
    if (pptxCurrentIndex > 0) {
        goToPptxSlide(pptxCurrentIndex);
    }
}

function hideQrForPresentation(presentLoaded) {
    if (qrSection) qrSection.style.display = presentLoaded ? 'none' : '';
    if (presentationStatus) presentationStatus.style.display = presentLoaded ? 'inline-block' : 'none';
    if (clearPresentationBtn) clearPresentationBtn.style.display = presentLoaded ? 'inline-block' : 'none';
}

function clearPresentation() {
    pdfDoc = null;
    pdfMode = false;
    pptxMode = false;
    pptxSlides = [];
    pptxCurrentIndex = 0;
    pptxTotal = 0;
    if (pdfWrapper) pdfWrapper.style.display = 'none';
    if (pptxWrapper) pptxWrapper.style.display = 'none';
    if (deckWrapper) deckWrapper.style.display = 'none';
    if (slide3Default) slide3Default.style.display = '';
    hideQrForPresentation(false);
    if (fileInput) fileInput.value = '';
    updateSlideCounter();
}

function initFileUpload() {
    if (!fileInput) return;
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const lower = (file.name || '').toLowerCase();
        const buf = await file.arrayBuffer();
        if (lower.endsWith('.pdf')) {
            loadPdf(buf);
        } else if (lower.endsWith('.pptx')) {
            loadPptx(buf);
        } else {
            alert('Unsupported file. Please upload a PDF or PPTX.');
        }
    });
    if (clearPresentationBtn) {
        clearPresentationBtn.addEventListener('click', clearPresentation);
    }
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
    // File upload
    initFileUpload();
    // Resize handling for PDF re-render
    window.addEventListener('resize', () => {
        if (pdfMode) {
            renderPdfPage(pdfCurrentPage);
        }
    });
    
    // Connect to Socket.io server
    initSocket();
    
    console.log('Desktop Viewer ready.');
}

// Start application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
