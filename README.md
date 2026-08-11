# Pitron Employee Management — Facial Recognition Attendance (Frontend)

React + Vite frontend for an AI-powered employee attendance system. This app
opens the camera, watches for a face, captures a frame, and sends it to a
backend API — it does **not** perform any face recognition itself.

## Stack
- React 19, Vite, JavaScript
- React Router DOM
- Axios
- Plain CSS (no framework)

## Getting started
```bash
npm install
cp .env.example .env   # point VITE_API_BASE_URL at your backend
npm run dev
```

## Project structure
```
src/
├── pages/
│   └── Camera.jsx            # page: wires everything together, owns state
├── components/camera/
│   ├── CameraView.jsx         # opens webcam, renders live feed
│   ├── FaceDetector.jsx       # detection loop (stubbed — see comments)
│   ├── CameraControls.jsx     # start / stop / manual capture buttons
│   └── FaceResult.jsx         # renders backend recognition result
├── services/
│   └── cameraService.js       # axios call to POST /api/face/recognize
├── App.jsx
└── main.jsx
```

## Wiring in real face detection
`FaceDetector.jsx` has a single stub function, `detectFaceInFrame()`, where a
lightweight client-side model (face-api.js, MediaPipe, BlazeFace) should be
plugged in. Everything around it — polling loop, cooldown, auto-capture
callback — is already built to use whatever that function returns.

## Backend contract
`POST /api/face/recognize` — multipart form with an `image` field (JPEG).
Expected response shape is documented in `src/services/cameraService.js`.
