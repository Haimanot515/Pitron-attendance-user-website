import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Camera from './pages/Camera'
import './App.css'

/**
 * App
 * Root of the application. Renders the shared top bar and sets up
 * client-side routing. Currently there's a single page (Camera), but the
 * router and shell are in place so more pages (Employees, Reports, Login)
 * can be added later without restructuring.
 */
function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-topbar">
          <div className="app-brand">
            <div className="app-brand-mark">PT</div>
            <div className="app-brand-text">
              <h1>Pitron</h1>
              <span>Attendance Management</span>
            </div>
          </div>

          
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/camera" replace />} />
            <Route path="/camera" element={<Camera />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
