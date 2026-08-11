import { forwardRef, useEffect, useRef } from 'react'
import './CameraView.css'

const STATUS_TEXT = {
  idle: null,
  scanning: 'Looking for a face…',
  detected: 'Face found — hold still',
  capturing: 'Captured! Checking…',
}

const CameraView = forwardRef(function CameraView({ active, onReady, onError, detectionStatus = 'idle' }, videoRef) {
  const streamRef = useRef(null)

  useEffect(() => {
    if (!active) {
      stopStream()
      return
    }

    let cancelled = false

    async function startStream() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 540 } },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        onReady?.(stream)
      } catch (err) {
        onError?.(err)
      }
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

      {/* Colored ring that hugs the video edges — the primary "am I being
          seen?" signal. Styled per-status in CameraView.css: grey dashed
          while scanning, green solid once a face is found, brief white
          flash on capture. */}
      {active && <div className="camera-view__ring" aria-hidden="true" />}

      {/* Banner pinned to the top of the feed with the current status in
          plain language. This is the piece that removes the "silent"
          feeling — it's large, high-contrast, and impossible to miss. */}
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