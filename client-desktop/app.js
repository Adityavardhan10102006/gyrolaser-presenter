/**
 * GyroLaser - Interactive Desktop Logic
 * Combines Three.js, GSAP Boot Sequence, and PDF.js Engine with Socket.io Laser Sync
 */

// --- 0. Global State ---
let socket = io(); // Connects automatically to origin since we serve statically
let roomId = generateRoomId();

// Presentation state
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');

// Laser state (Smoothed via LERP)
// Target coordinates come from Socket, current coordinates are animated via requestAnimationFrame
let targetLaser = { x: 0.5, y: 0.5 };
let currentLaser = { x: 0.5, y: 0.5 };
let laserVisible = false;
const laserDot = document.getElementById('laserDot');
const laserSpeed = 0.3; // LERP interpolation factor (0 = stuck, 1 = instant/jittery)

// --- 1. Utilities ---
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function updateConnectionStatus(isConnected) {
    const indicator = document.getElementById('connectionStatus');
    const text = indicator.querySelector('.text');
    if (isConnected) {
        indicator.classList.add('connected');
        text.textContent = 'Mobile Connected';
    } else {
        indicator.classList.remove('connected');
        text.textContent = 'Waiting for connection...';
    }
}

document.getElementById('roomIdText').textContent = roomId;

// --- 2. Socket.IO Logic ---
socket.on('connect', () => {
    console.log('Connected to server. Joining as viewer:', roomId);
    socket.emit('join-room', { role: 'viewer', roomId: roomId });
});

socket.on('controller-joined', () => {
    updateConnectionStatus(true);
});

socket.on('controller-left', () => {
    updateConnectionStatus(false);
    laserVisible = false;
    laserDot.style.opacity = 0;
});

socket.on('laser-move', (data) => {
    targetLaser.x = data.x;
    targetLaser.y = data.y;
    
    // First time receiving data, snap to avoid long travel path
    if (!laserVisible) {
        currentLaser.x = data.x;
        currentLaser.y = data.y;
        laserVisible = true;
        laserDot.style.opacity = 1;
    }
});

socket.on('disconnect', () => {
    updateConnectionStatus(false);
});

// --- 3. Animation Loop (Laser Smoothing) ---
function animateLaser() {
    requestAnimationFrame(animateLaser);
    if (!laserVisible) return;

    // Linear Interpolation (LERP) for smoothness
    currentLaser.x += (targetLaser.x - currentLaser.x) * laserSpeed;
    currentLaser.y += (targetLaser.y - currentLaser.y) * laserSpeed;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // Map [0,1] to pixels
    const pxX = currentLaser.x * viewportW;
    const pxY = currentLaser.y * viewportH;

    // Apply via GSAP or direct transform
    laserDot.style.transform = `translate(${pxX}px, ${pxY}px)`;
}
animateLaser(); // Start loop

// --- 4. Presentation Engine (PDF.js & Mammoth) ---
const uploadInput = document.getElementById('fileUpload');
const emptyState = document.getElementById('emptyState');
const counterLabel = document.getElementById('slideCounterLabel');
const pageNumSpan = document.getElementById('pageNum');
const pageCountSpan = document.getElementById('pageCount');
const htmlCanvas = document.getElementById('htmlCanvas');

let currentMode = 'pdf'; // 'pdf' or 'docx'


uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.endsWith('.pdf')) {
        currentMode = 'pdf';
        const fileReader = new FileReader();
        fileReader.onload = function() {
            const typedarray = new Uint8Array(this.result);
            loadPDF(typedarray);
        };
        fileReader.readAsArrayBuffer(file);
    } else if (file.name.endsWith('.docx')) {
        currentMode = 'docx';
        const fileReader = new FileReader();
        fileReader.onload = function() {
            const arrayBuffer = this.result;
            loadDOCX(arrayBuffer);
        };
        fileReader.readAsArrayBuffer(file);
    } else if (file.name.endsWith('.pptx') || file.name.endsWith('.ppt')) {
        alert("Native PPTX parsing in browsers is limited. Please save your presentation as a PDF and upload the PDF for the best experience.");
    } else {
        alert("Unsupported file type.");
    }
});

function loadDOCX(arrayBuffer) {
    mammoth.convertToHtml({arrayBuffer: arrayBuffer})
        .then(function(result){
            const html = result.value; // The generated HTML
            pdfDoc = null; // Clear PDF state
            
            // Switch views
            emptyState.classList.add('hidden');
            canvas.classList.add('hidden');
            counterLabel.classList.add('hidden');
            htmlCanvas.classList.remove('hidden');
            
            htmlCanvas.innerHTML = html;
        })
        .catch(function(err){
            console.error('Error rendering DOCX:', err);
            alert('Failed to load DOCX.');
        });
}

function loadPDF(data) {
    pdfjsLib.getDocument(data).promise.then(pdf => {
        pdfDoc = pdf;
        pageCountSpan.textContent = pdfDoc.numPages;
        
        // Switch views
        emptyState.classList.add('hidden');
        htmlCanvas.classList.add('hidden');
        canvas.classList.remove('hidden');
        counterLabel.classList.remove('hidden');
        
        pageNum = 1;
        renderPage(pageNum);
    }).catch(err => {
        console.error('Error rendering PDF:', err);
        alert('Failed to load PDF.');
    });
}

function renderPage(num) {
    pageRendering = true;
    pdfDoc.getPage(num).then(page => {
        // Calculate scale to fit screen maintaining aspect ratio
        const viewportTemp = page.getViewport({ scale: 1 });
        const scale = Math.min(
            (window.innerWidth * 0.8) / viewportTemp.width,
            (window.innerHeight * 0.8) / viewportTemp.height
        );
        const viewport = page.getViewport({ scale: scale * 1.5 }); // High-DPI scaling
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Visual display scaling down to viewport size for crispness
        canvas.style.height = `${viewport.height / 1.5}px`;
        canvas.style.width = `${viewport.width / 1.5}px`;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        
        const renderTask = page.render(renderContext);
        renderTask.promise.then(() => {
            pageRendering = false;
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });
    });
    
    pageNumSpan.textContent = num;
}

function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

function onPrevPage() {
    if (!pdfDoc || pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
}

function onNextPage() {
    if (!pdfDoc || pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
}

document.addEventListener('keydown', (e) => {
    if (currentMode === 'pdf') {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') onPrevPage();
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') onNextPage();
    } else if (currentMode === 'docx') {
        // Simple scroll fallback for docx
        if (e.key === 'ArrowDown' || e.key === ' ') htmlCanvas.scrollTop += 50;
        if (e.key === 'ArrowUp') htmlCanvas.scrollTop -= 50;
    }
});

// --- 5. Flow Control (Scenes & Animations) ---
// Three.js Scene Setup
const scene1 = document.getElementById('scene1');
const scene2 = document.getElementById('scene2');
const scene3 = document.getElementById('scene3');
const biosLogs = document.getElementById('biosLogs');

function initThreeDesk() {
    const tCanvas = document.getElementById('deskCanvas');
    const renderer = new THREE.WebGLRenderer({ canvas: tCanvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 100);
    camera.position.set(0, 5, 20);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(50, 50, 0x111111, 0x111111);
    scene.add(gridHelper);

    // Simple minimal desk component
    const deskMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.1, metalness: 0.8 });
    const deskGeo = new THREE.BoxGeometry(10, 0.5, 6);
    const desk = new THREE.Mesh(deskGeo, deskMaterial);
    scene.add(desk);

    // Computer screen
    const screenGeo = new THREE.BoxGeometry(4, 2.5, 0.2);
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 1.6, -1);
    scene.add(screen);

    // Glow backing
    const screenLight = new THREE.RectAreaLight(0x0ea5e9, 2, 4, 2.5);
    screenLight.position.set(0, 1.6, -0.9);
    screenLight.lookAt(0, 1.6, 5);
    scene.add(screenLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const pLight = new THREE.PointLight(0xffffff, 0.5);
    pLight.position.set(5, 5, 5);
    scene.add(pLight);

    let animationId;
    function renderThree() {
        animationId = requestAnimationFrame(renderThree);
        // Gentle float
        camera.position.y = 5 + Math.sin(Date.now() * 0.001) * 0.5;
        camera.lookAt(0, 1.5, 0);
        renderer.render(scene, camera);
    }
    renderThree();

    // Resize handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Interaction Trigger
    window.addEventListener('click', () => {
        if(scene1.classList.contains('active')){
            cancelAnimationFrame(animationId);
            startBootSequence();
        }
    });
}
initThreeDesk();

// BIOS Boot Sequence
function startBootSequence() {
    // Fade out Scene 1, Fade in Scene 2
    gsap.to(scene1, { opacity: 0, duration: 0.5, onComplete: () => {
        scene1.classList.remove('active');
        scene2.classList.add('active');
        gsap.to(scene2, { opacity: 1, duration: 0.2 });
        runBiosLogs();
    }});
}

function runBiosLogs() {
    const logs = [
        "GYROLASER KERNEL INITIALIZING...",
        "CPU: ARM 64-bit Architecture",
        "RAM: 16.0 GB OK",
        "Mounting File Systems...",
        "Loading Neural Net Modules [████████░░] 80%",
        "Connecting Socket.IO Channels...",
        "Establishing Room Instance: " + roomId,
        "System Ready. Launching Presentation UI..."
    ];

    let tl = gsap.timeline();
    let currentHtml = "";

    logs.forEach((log, index) => {
        tl.to({}, { 
            duration: 0.4 + Math.random() * 0.6, 
            onComplete: () => {
                currentHtml += `<div>> ${log}</div>`;
                biosLogs.innerHTML = currentHtml;
                
                if(index === logs.length - 1) {
                    setTimeout(transitionToMainUI, 800);
                }
            }
        });
    });
}

function transitionToMainUI() {
    gsap.to(scene2, { opacity: 0, duration: 0.5, onComplete: () => {
        scene2.classList.remove('active');
        scene3.classList.add('active');
        gsap.to(scene3, { opacity: 1, duration: 0.8 });
    }});
}
