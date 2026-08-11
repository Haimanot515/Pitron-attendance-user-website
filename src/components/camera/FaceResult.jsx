import './FaceResult.css'

/**
 * Mock recognition result, shown by default so the UI has something
 * meaningful to look at before the backend is wired up. Once real API
 * responses are flowing in from cameraService.recognizeFace(), Camera.jsx
 * will pass those in via the `result` prop instead, and this mock is
 * never used.
 */
export const MOCK_RESULT = {
  matched: true,
  employee: {
    id: 'EMP-1042',
    name: 'Amanuel Tesfaye',
    department: 'Engineering',
    photoUrl: '',
  },
  attendanceStatus: 'Check-In',
  timestamp: new Date().toISOString(),
}

function formatTimestamp(isoString) {
  if (!isoString) return '—'
  try {
    return new Date(isoString).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return isoString
  }
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

/**
 * FaceResult
 * ----------
 * Presentational component that renders whatever recognition result it's
 * given. It has four states:
 *   - loading: a request is in flight
 *   - result present + matched + employee data present: show the employee card
 *   - result present + not matched (or error, or matched but missing
 *     employee data): show a "not recognized" state
 *   - no result yet: show an empty/idle state
 *
 * NOTE: `result.matched` is trusted, but NOT blindly — we still verify
 * `result.employee` actually exists before rendering the matched card.
 * cameraService.recognizeFace() is responsible for only setting
 * `matched: true` when a real employee was returned (the backend's own
 * `success` flag is true for other outcomes too, like an unmatched
 * stranger being logged), but this component doesn't assume that upstream
 * contract always holds — a malformed or future API response with
 * `matched: true` and no employee should fall through to the "not
 * recognized" state instead of crashing on employee.photoUrl.
 *
 * Props:
 *   - result: object | null — see MOCK_RESULT above for shape
 *   - loading: boolean
 *   - error: string | null
 */
function FaceResult({ result, loading, error }) {
  if (loading) {
    return (
      <div className="face-result face-result--loading">
        <div className="face-result__spinner" aria-hidden="true" />
        <p>Identifying employee…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="face-result face-result--error">
        <p className="face-result__title">Recognition failed</p>
        <p className="face-result__subtitle">{error}</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="face-result face-result--empty">
        <p className="face-result__title">No capture yet</p>
        <p className="face-result__subtitle">
          Start the camera and look toward the lens — results will appear here.
        </p>
      </div>
    )
  }

  const isMatchedWithEmployee = result.matched && !!result.employee

  if (!isMatchedWithEmployee) {
    return (
      <div className="face-result face-result--error">
        <p className="face-result__title">Employee not recognized</p>
        <p className="face-result__subtitle">
          {result.message ||
            'Try repositioning in front of the camera, or contact an administrator if this keeps happening.'}
        </p>
      </div>
    )
  }

  const { employee, attendanceStatus, timestamp } = result
  const isCheckIn = attendanceStatus === 'Check-In'

  return (
    <div className="face-result face-result--matched">
      <div className="face-result__photo">
        {employee.photoUrl ? (
          <img src={employee.photoUrl} alt={employee.name} />
        ) : (
          <span>{getInitials(employee.name)}</span>
        )}
      </div>

      <div className="face-result__details">
        <div className="face-result__heading">
          <h3>{employee.name}</h3>
          <span className={`face-result__badge ${isCheckIn ? 'is-checkin' : 'is-checkout'}`}>
            {attendanceStatus}
          </span>
        </div>

        <dl className="face-result__meta">
          <div>
            <dt>Employee ID</dt>
            <dd>{employee.id}</dd>
          </div>
          <div>
            <dt>Department</dt>
            <dd>{employee.department}</dd>
          </div>
          <div>
            <dt>Timestamp</dt>
            <dd>{formatTimestamp(timestamp)}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

export default FaceResult