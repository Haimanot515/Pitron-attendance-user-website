import { useCallback, useEffect, useRef, useState } from 'react'
import * as faceapi from 'face-api.js'
import CameraView from '../components/camera/CameraView'
import FaceDetector from '../components/camera/FaceDetector'
import CameraControls from '../components/camera/CameraControls'
import FaceResult from '../components/camera/FaceResult'
import { recognizeFace } from '../services/cameraService'
import './Camera.css'

function Camera() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const [cameraActive, setCameraActive] = useState(true)
  const [cameraError, setCameraError] = useState(null)

  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [modelsError, setModelsError] = useState(null)

  const [detectionStatus, setDetectionStatus] = useState('idle')

  // 'auto' (default): FaceDetector polls the feed and can auto-trigger a
  // capture. 'manual': detection is switched off — only the manual
  // Capture button in CameraControls will submit a frame.
  const [captureMode, setCaptureMode] = useState('auto')

  const [recognitionResult, setRecognitionResult] = useState(null)
  const [recognitionLoading, setRecognitionLoading] = useState(false)
  const [recognitionError, setRecognitionError] = useState(null)

  const [activePanel, setActivePanel] = useState('camera')

  useEffect(() => {
    let cancelled = false

    faceapi.nets.tinyFaceDetector
      .loadFromUri('/models')
      .then(() => {
        if (!cancelled) setModelsLoaded(true)
      })
      .catch((err) => {
        console.error('Failed to load face detection model:', err)
        if (!cancelled) {
          setModelsError('Face detection model failed to load. Auto-capture is unavailable — use the manual Capture button instead.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (activePanel !== 'result') return
    if (recognitionLoading) return
    if (!recognitionResult && !recognitionError) return

    const isSuccess = recognitionResult?.matched
    const delay = isSuccess ? 6000 : 4000

    const timeoutId = setTimeout(() => {
      setActivePanel('camera')
    }, delay)

    return () => clearTimeout(timeoutId)
  }, [activePanel, recognitionLoading, recognitionResult, recognitionError])

  useEffect(() => {
    if (activePanel !== 'result') return
    if (recognitionLoading) return
    if (!recognitionResult?.matched) return
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    const speechText = recognitionResult.message || 'Attendance recorded successfully.'

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(speechText)
    utterance.rate = 1
    utterance.pitch = 1
    window.speechSynthesis.speak(utterance)
  }, [activePanel, recognitionLoading, recognitionResult])

  useEffect(() => {
    if (activePanel !== 'result') return
    if (recognitionLoading) return
    if (recognitionResult?.matched) return
    if (!recognitionResult && !recognitionError) return
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    const speechText = recognitionResult && !recognitionResult.matched
      ? recognitionResult.message || 'Face not recognized. Please try again.'
      : 'Something went wrong. Please try again.'

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(speechText)
    utterance.rate = 1
    utterance.pitch = 1
    window.speechSynthesis.speak(utterance)
  }, [activePanel, recognitionLoading, recognitionResult, recognitionError])

  const handleCameraReady = useCallback(() => {
    setCameraError(null)
  }, [])

  const handleCameraError = useCallback((err) => {
    console.error('Camera error:', err)
    setCameraActive(false)
    setDetectionStatus('idle')
    setCameraError(
      err?.name === 'NotAllowedError'
        ? 'Camera access was denied. Please allow camera permissions and try again.'
        : 'Could not access the camera. Please check your device and try again.'
    )
  }, [])

  const handleRetryCamera = useCallback(() => {
    setCameraError(null)
    setCameraActive(true)
  }, [])

  const grabFrame = useCallback(() => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return Promise.resolve(null)

    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9)
    })
  }, [])

  const submitForRecognition = useCallback(async (blob) => {
    if (recognitionLoading) return
    if (!blob) {
      setRecognitionError('No image to submit.')
      return
    }

    setActivePanel('result')
    setRecognitionLoading(true)
    setRecognitionError(null)

    try {
      const result = await recognizeFace(blob)
      setRecognitionResult(result)
    } catch (err) {
      console.error('Recognition request failed:', err)
      setRecognitionError(
        err?.response?.data?.message ||
          err?.message ||
          'Something went wrong while contacting the recognition service.'
      )
    } finally {
      setRecognitionLoading(false)
    }
  }, [recognitionLoading])

  const handleCapture = useCallback(async () => {
    if (recognitionLoading) return

    try {
      const blob = await grabFrame()
      if (!blob) {
        throw new Error('Camera is not ready yet.')
      }
      await submitForRecognition(blob)
    } catch (err) {
      console.error('Recognition request failed:', err)
      setActivePanel('result')
      setRecognitionError(err?.message || 'Something went wrong while contacting the recognition service.')
    }
  }, [grabFrame, recognitionLoading, submitForRecognition])

  const handleModeChange = useCallback((mode) => {
    setCaptureMode((current) => {
      if (current === mode) return current
      setRecognitionError(null)
      return mode
    })
  }, [])

  const handleBackToCamera = useCallback(() => {
    setActivePanel('camera')
  }, [])

  return (
    <div className="camera-page">
      <div className="camera-page__grid">
        <section className={`camera-page__panel ${activePanel === 'camera' ? 'is-active' : ''}`}>
          <div className="camera-page__mode-toggle" role="tablist" aria-label="Capture method">
            <button
              type="button"
              role="tab"
              aria-selected={captureMode === 'auto'}
              className={`camera-page__mode-btn ${captureMode === 'auto' ? 'is-active' : ''}`}
              onClick={() => handleModeChange('auto')}
            >
              Automatic camera
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={captureMode === 'manual'}
              className={`camera-page__mode-btn ${captureMode === 'manual' ? 'is-active' : ''}`}
              onClick={() => handleModeChange('manual')}
            >
              Manual camera
            </button>
          </div>

          <div className="camera-page__panel-footer camera-page__panel-footer--top">
            <FaceDetector
              videoRef={videoRef}
              active={captureMode === 'auto' && cameraActive && modelsLoaded && activePanel === 'camera'}
              onFaceDetected={handleCapture}
              onStatusChange={setDetectionStatus}
            />
            {captureMode === 'manual' && (
              <CameraControls
                cameraActive={cameraActive}
                onCapture={handleCapture}
                captureDisabled={recognitionLoading}
              />
            )}
          </div>

          <CameraView
            ref={videoRef}
            active={cameraActive}
            onReady={handleCameraReady}
            onError={handleCameraError}
            detectionStatus={captureMode === 'auto' ? detectionStatus : 'idle'}
          />

          {cameraError && (
            <div className="camera-page__error">
              <p>{cameraError}</p>
              <button type="button" className="btn btn--outline" onClick={handleRetryCamera}>
                Retry camera
              </button>
            </div>
          )}
          {modelsError && captureMode === 'auto' && <p className="camera-page__error">{modelsError}</p>}
        </section>

        <section className={`camera-page__panel ${activePanel === 'result' ? 'is-active' : ''}`}>
          <button
            type="button"
            className="camera-page__back-btn"
            onClick={handleBackToCamera}
          >
            ← Back to camera
          </button>

          <h3 className="camera-page__panel-title">Recognition Result</h3>
          <FaceResult
            result={recognitionResult}
            loading={recognitionLoading}
            error={recognitionError}
          />
        </section>
      </div>

      <canvas ref={canvasRef} className="visually-hidden" />
    </div>
  )
}

export default Camera