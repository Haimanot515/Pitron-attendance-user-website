import './CameraControls.css'

/**
 * CameraControls
 * ---------------
 * In a kiosk/real-life attendance setup the camera starts automatically
 * and runs continuously — there's no "Start"/"Stop" for a walk-up device.
 * This now only exposes a manual capture button, useful for testing the
 * upload flow without waiting on auto-detection.
 *
 * Props:
 *   - cameraActive: boolean
 *   - onCapture: () => void
 *   - captureDisabled: boolean — disable manual capture while a request is in flight
 */
function CameraControls({ cameraActive, onCapture, captureDisabled }) {
  return (
    <div className="camera-controls">
      <button
        type="button"
        className="btn btn--ghost"
        onClick={onCapture}
        disabled={!cameraActive || captureDisabled}
        title="Manually capture a frame for testing, without waiting for auto-detection"
      >
        <svg
          className="camera-controls__icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 7a2 2 0 0 1 2-2h2.5l1-1.5h7l1 1.5H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="13" r="3.4" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        Capture (manual test)
      </button>
    </div>
  )
}

export default CameraControls