# 🔍 TraceBack v4.0 — Face Scan Edition

## ✨ What's New in v4.0

### 📷 Live AI Face Scan
- Real-time face detection using **face-api.js** (TinyFaceDetector + FaceRecognitionNet)
- Automatically loads ALL missing persons who have photos from the database
- Computes face descriptors and matches live camera feed in real time
- Draws bounding boxes + confidence % on screen
- **Adjustable sensitivity slider** — tune false positives vs accuracy

### 🚨 Multi-Channel Alerts on Match
| Channel | How it works |
|---------|-------------|
| 🔔 **In-app toast** | Instant popup on the scanning device |
| 📡 **Socket.io** | All connected devices (family, police) get real-time alert |
| 🖥️ **Browser notification** | System-level push even if tab is in background |
| 📧 **Email** | Auto-sends HTML alert with photo + GPS location to reporter & police |

### 📍 GPS Location in Alerts
- Asks for location permission when a match is found
- Attaches coordinates to the email and socket broadcast

---

## ⚙️ Setup — 6 Steps

### 1. Install dependencies
```bash
cd traceback-v4-face-scan
npm install
```

### 2. Start MongoDB
Connect to: `mongodb://127.0.0.1:27017`

### 3. Configure Email Alerts (optional but recommended)
Edit `.env`:
```
GMAIL_USER=your_gmail@gmail.com
GMAIL_PASS=your_16_char_app_password
```
> Get App Password: myaccount.google.com → Security → 2-Step Verification → App passwords

### 4. Seed sample data
```bash
node seed.js
```

### 5. Start server
```bash
node server.js
```

### 6. Open browser
```
http://localhost:3000
```

---

## 📷 How to Use Face Scan

1. Go to **FACE SCAN** in the navigation bar
2. Click **START SCAN** — allow camera permission
3. AI loads models + fetches all missing person photos from DB (~5-10 sec)
4. Point camera at a person
5. If face matches → bounding box turns **RED**, match card appears, alerts fire

### Tips
- Upload a **clear, front-facing photo** when filing a missing person report
- Use the **sensitivity slider**: lower = more matches, higher = more accurate
- Use rear camera (📷 flip button) when scanning in the field
- Keep the person's face well-lit and within 1–3 metres

---

## 📡 Real-Time Alert Flow

```
Camera detects match
       ↓
Snapshot captured (JPEG)
       ↓
GPS coordinates fetched
       ↓
POST /api/facescan/alert
       ↓
   ┌───┴────────────────────┐
   │                        │
Socket.io broadcast     Email sent via Gmail
(ALL connected devices)  to reporter + police
   │
   ↓
Browser notification
on every open tab
```

---

## 🌐 API Endpoints Added

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/facescan/cases-with-photos` | All active cases with photos |
| POST | `/api/facescan/alert` | Trigger match alert (socket + email) |

---

## 📡 Share on LAN
```
http://<your-ip>:3000
```
