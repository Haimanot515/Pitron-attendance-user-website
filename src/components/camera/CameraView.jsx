import { forwardRef, useEffect, useRef } from 'react'
import './CameraView.css'

const STATUS_TEXT = {
  idle: null,
  scanning: 'Looking for a face…',
  detected: 'Face found — hold still',
  capturing: 'Captured! Checking…',
}

// Maps raw getUserMedia errors to a stable code + friendly message so the
// UI never has to guess. Android Chrome throws a wider variety of these
// than desktop, so each one gets handled explicitly instead of falling
// through to a generic "permission denied" message.
function classifyCameraError(err) {
  switch (err.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return {
        code: 'permission-denied',
        message: 'Camera permission was denied. Please allow camera access for this site in your browser settings, then reload the page.',
      }
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return {
        code: 'no-camera',
        message: 'No camera was found on this device.',
      }
    case 'NotReadableError':
    case 'TrackStartError':
      return {
        code: 'camera-busy',
        message: 'The camera is already in use by another app. Close other apps using the camera and try again.',
      }
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return {
        code: 'overconstrained',
        message: 'The requested camera settings are not supported on this device.',
      }
    case 'SecurityError':
      return {
        code: 'insecure-context',
        message: 'Camera access requires a secure (https) connection.',
      }
    default:
      return {
        code: 'unknown',
        message: `Camera error: ${err.message || err.name || 'unknown error'}`,
      }
  }
}

const CameraView = forwardRef(function CameraView({ active, onReady, onError, detectionStatus = 'idle' }, videoRef) {
  const streamRef = useRef(null)

  useEffect(() => {
    if (!active) {
      stopStream()
      return
    }

    let cancelled = false

    async function requestStream(constraints) {
      return navigator.mediaDevices.getUserMedia(constraints)
    }

    async function startStream() {
      const preferredConstraints = {
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 540 } },
        audio: false,
      }

      let stream
      try {
        stream = await requestStream(preferredConstraints)
      } catch (err) {
        const classified = classifyCameraError(err)

        // Only retry with looser constraints if the failure was about the
        // constraints themselves — not permission, not a busy/missing
        // camera. Retrying those would just fail again.
        if (classified.code === 'overconstrained') {
          try {
            stream = await requestStream({ video: true, audio: false })
          } catch (fallbackErr) {
            if (!cancelled) onError?.(classifyCameraError(fallbackErr))
            return
          }
        } else {
          if (!cancelled) onError?.(classified)
          return
        }
      }

      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      onReady?.(stream)
    }

    startStream()

    return () => {
      cancelled = true
      stopStream()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }

  const statusLabel = STATUS_TEXT[detectionStatus]

  return (
    <div className={`camera-view camera-view--${detectionStatus}`}>
      <video
        ref={videoRef}
        className="camera-view__video"
        autoPlay
        playsInline
        muted
        aria-label="Live camera feed"
      />

      {active && <div className="camera-view__ring" aria-hidden="true" />}

      {active && statusLabel && (
        <div className="camera-view__banner" role="status" aria-live="polite">
          {statusLabel}
        </div>
      )}

      {!active && (
        <div className="camera-view__placeholder">
          <div className="camera-view__placeholder-icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 7a2 2 0 0 1 2-2h2.5l1-1.5h7l1 1.5H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="13" r="3.4" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </div>
          <p>Camera is off</p>
          <span>Start the camera to begin attendance capture</span>
        </div>
      )}
    </div>
  )
})

export default CameraView