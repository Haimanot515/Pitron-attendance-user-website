import axios from 'axios'

/**
 * cameraService.js
 * -----------------
 * All network/API logic for the camera + face recognition flow lives here,
 * kept separate from the presentational components. This makes it easy to:
 *   - swap the base URL / auth strategy in one place
 *   - mock the API in tests
 *   - reuse the upload logic outside the Camera page later
 */

// Base URL for the backend API. In a real deployment this should come from
// an environment variable so the same build can point at different
// environments (dev / staging / prod).
//
// NOTE: the NestJS backend does NOT have a global '/api' prefix — its
// controller is @Controller('face-recognition'), so routes are
// '/face-recognition/check' and '/face-recognition/enroll/:id', not
// '/api/face/recognize'. Don't add '/api' here unless you also add
// app.setGlobalPrefix('api') on the Nest side.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

// Single fixed kiosk camera. Set VITE_CAMERA_ID in the frontend's .env to
// whatever identifier you want stored on AttendanceEvent.cameraId /
// UnknownPersonEvent.cameraId in the DB. Falls back to 'kiosk-01' so local
// dev without a .env entry still sends a non-empty value.
const CAMERA_ID = import.meta.env.VITE_CAMERA_ID || 'kiosk-01'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
})

// No auth header here on purpose: /face-recognition/check is a public
// kiosk endpoint (employees aren't logged in when checking in), so no
// JwtAuthGuard sits in front of it on the backend.

/**
 * Uploads a captured face image to the backend for recognition.
 *
 * The frontend does NOT perform any recognition itself — it only captures
 * a frame from the camera and forwards it. The backend (NestJS + AI service)
 * is responsible for identifying the employee and returning attendance info.
 *
 * @param {Blob} imageBlob - The captured frame, as a JPEG/PNG Blob.
 * @returns {Promise<Object>} Normalized recognition result:
 *   {
 *     matched: boolean,
 *     employee: { id, firstName, lastName, department, ... } | null,
 *     confidence: number,
 *     attendanceStatus: 'Check-In' | 'Check-Out' | null,
 *     timestamp: string | null,
 *     message: string
 *   }
 */
export async function recognizeFace(imageBlob) {
  const formData = new FormData()
  formData.append('image', imageBlob, `capture-${Date.now()}.jpg`)
  // Required by the backend's CheckDetectionDto — must be a non-empty
  // string field alongside the image, not JSON, not a query param.
  formData.append('cameraId', CAMERA_ID)

  // Actual backend route: POST /face-recognition/check
  const response = await apiClient.post('/face-recognition/check', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  // The Nest service (verifyAndLogAttendance) actually returns:
  //   { success, message, confidence, employee, event, session }
  // NOT `attendance` — that field never existed on the real response,
  // which is why attendanceStatus/timestamp were always null. `event` is
  // the AttendanceEvent row: { type: 'IN' | 'OUT', timestamp, ... }.
  //
  // `employee` here is the raw Prisma row — employee.department is a full
  // { id, name, description, createdAt } object, not a string, and there's
  // no `name` field (it's firstName/lastName). FaceResult.jsx expects a
  // flat { id, name, department, photoUrl } shape, so normalize it here
  // rather than passing the raw row through — that mismatch was what threw
  // "Objects are not valid as a React child" and blanked the page.
  const { success, message, confidence, employee, event } = response.data

  const normalizedEmployee = employee
    ? {
        id: employee.employeeCode ?? String(employee.id),
        name: [employee.firstName, employee.lastName].filter(Boolean).join(' '),
        department: employee.department?.name ?? '',
        photoUrl: employee.photoUrl ?? '',
      }
    : null

  return {
    matched: !!success,
    employee: normalizedEmployee,
    confidence: typeof confidence === 'number' ? confidence : 0,
    attendanceStatus: event?.type === 'OUT' ? 'Check-Out' : event?.type === 'IN' ? 'Check-In' : null,
    timestamp: event?.timestamp || null,
    message: message || (success ? 'Attendance recorded.' : 'Face not recognized.'),
  }
}

export default {
  recognizeFace,
}