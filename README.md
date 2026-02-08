# GyroLaser

**Control presentation pointing using real-time mobile gyroscope motion.**

GyroLaser is a web-based presentation tool that turns your smartphone into a **motion‑controlled laser pointer** for desktop slides. By leveraging mobile gyroscope sensors and real‑time communication, presenters can naturally point, highlight, and interact with slides—without requiring any physical laser hardware.

---

# 🚀 Features

- 📱 **Phone as Laser Pointer** – Uses mobile gyroscope/device orientation sensors
- ⚡ **Real‑Time Movement** – Smooth, low‑latency cursor via WebSockets
- 🖥 **Browser‑Based Slides** – Works directly in desktop web browser
- 🔗 **Easy Pairing** – Connect mobile to desktop using QR code or room ID
- 🎯 **Accurate Pointing** – Converts motion into on‑screen X–Y laser position
- 🧩 **Modular Architecture** – Separate frontend, Node.js realtime server, and optional Java backend

---

# 🏗 System Architecture

GyroLaser consists of **three main components**:

### 1. Desktop Presentation Client
- Runs in a web browser on PC/Laptop
- Displays slides and laser pointer overlay
- Receives real‑time motion data from mobile

### 2. Mobile Controller
- Runs in mobile browser
- Accesses **DeviceOrientation / Gyroscope sensors**
- Sends motion data to server using WebSockets

### 3. Backend Services

**Node.js (Primary Realtime Server)**
- Express.js → HTTP server
- Socket.io → Bi‑directional realtime communication
- Session pairing (QR / Room ID)

**Java (Optional Enhancement)**
- Spring Boot API for:
  - Presentation storage
  - User/session management
  - Analytics & logs

---

# 🧰 Tech Stack

## Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- DeviceOrientation API
- Canvas / DOM rendering for laser cursor

## Backend
- Node.js (v18+)
- Express.js
- Socket.io

## Optional Java Layer
- Java 17+
- Spring Boot

---

# 📋 Requirements

## Hardware

**Mobile Device**
- Smartphone with gyroscope sensor
- Modern browser (Chrome, Edge, Safari)
- HTTPS connection required for sensor permission

**Desktop**
- Modern browser with WebSocket support

---

# ⚙️ Installation & Setup

## 1. Clone Repository

```bash
git clone https://github.com/your-username/gyrolaser.git
cd gyrolaser
```

## 2. Install Node.js Dependencies

```bash
npm install
```

## 3. Run Server

```bash
npm start
```

Server will start at:

```
http://localhost:3000
```

---

# 📱 How to Use

1. Open **desktop presentation page** in browser.
2. Scan the **QR code** using your phone.
3. Allow **motion sensor permission** on mobile browser.
4. Move your phone to control the **laser pointer** on slides.

---

# 🧪 Minimum Viable Product (MVP)

### Included
- Slide display in browser
- Mobile gyroscope reading
- Real‑time laser pointer via Socket.io
- QR/room connection

### Planned Enhancements
- Slide upload & management
- Gesture‑based slide switching
- Annotation & drawing tools
- Multi‑user collaboration
- Presentation analytics

---

# 👤 Author

**Adityavardhan Reddy**  
Email: Adityavardhanreddy2006@gmail.com



