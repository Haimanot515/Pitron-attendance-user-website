import { useEffect, useRef, useState } from 'react'
import * as faceapi from 'face-api.js'
import './FaceDetector.css'

/**
 * FaceDetector
 * ------------
 * Watches the live video stream and figures out whether a face is
 * currently in frame using face-api.js's TinyFaceDetector (runs entirely
 * client-side). Reports two things to the parent:
 *
 *   - onStatusChange(status): fires on every state change so the UI can
 *     show the user what's happening in real time. One of:
 *       'idle'      — detection not running (camera off / model not loaded)
 *       'scanning'  — camera on, actively looking, no face seen yet
 *       'detected'  — a face is currently visible, building toward capture
 *       'capturing' — enough consecutive hits reached, capture just fired
 *
 *   - onFaceDetected(): fires once when it's time to actually capture and
 *     submit, debounced by `cooldownMs`.
 *
 * Props:
 *   - videoRef: ref to the <video> element from CameraView
 *   - active: boolean — camera on AND model loaded
 *   - onFaceDetected(): capture trigger
 *   - onStatusChange(status): live status for UI feedback
 *   - pollIntervalMs: how often to check the current frame (default 500ms)
 *   - cooldownMs: minimum time between two triggered captures (default 4000ms)
 *   - requiredConsecutiveHits: detections in a row before firing (default 2)
 */
function FaceDetector({
  videoRef,
  active,
  onFaceDetected,
  onStatusChange,
  pollIntervalMs = 500,
  cooldownMs = 4000,
  requiredConsecutiveHits = 2,
}) {
  const [faceVisible, setFaceVisible] = useState(false)
  const lastTriggeredAtRef = useRef(0)
  const consecutiveHitsRef = useRef(0)
  const lastStatusRef = useRef('idle')

  // Only calls onStatusChange when the status actually changes, so the
  // parent doesn't re-render on every 500ms poll tick.
  const emitStatus = (status) => {
    if (lastStatusRef.current !== status) {
      lastStatusRef.current = status
      onStatusChange?.(status)
    }
  }

  useEffect(() => {
    if (!active) {
      setFaceVisible(false)
      consecutiveHitsRef.current = 0
      emitStatus('idle')
      return
    }

    emitStatus('scanning')
    let cancelled = false
    let checking = false

    const intervalId = setInterval(async () => {
      if (checking) return

      const video = videoRef.current
      if (!video || video.readyState < 2) return

      checking = true
      let detected = false
      try {
        detected = await detectFaceInFrame(video)
      } catch (err) {
        console.error('Face detection error:', err)
      }
      checking = false

      if (cancelled) return

      setFaceVisible(detected)
      consecutiveHitsRef.current = detected ? consecutiveHitsRef.current + 1 : 0

      if (consecutiveHitsRef.current >= requiredConsecutiveHits) {
        const now = Date.now()
        if (now - lastTriggeredAtRef.current > cooldownMs) {
          lastTriggeredAtRef.current = now
          consecutiveHitsRef.current = 0
          emitStatus('capturing')
          onFaceDetected?.()
          return
        }
      }

      emitStatus(detected ? 'detected' : 'scanning')
    }, pollIntervalMs)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, pollIntervalMs, cooldownMs, requiredConsecutiveHits])

  return (
    <div className={`face-detector ${faceVisible ? 'face-detector--visible' : ''}`}>
      <span className="face-detector__dot" aria-hidden="true" />
      <span className="face-detector__label">
        {!active
          ? 'Face detection idle'
          : faceVisible
            ? 'Face detected — capturing'
            : 'Scanning for a face…'}
      </span>
    </div>
  )
}

async function detectFaceInFrame(videoEl) {
  const detection = await faceapi.detectSingleFace(
    videoEl,
    new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
  )
  return Boolean(detection)
}

export default FaceDetector