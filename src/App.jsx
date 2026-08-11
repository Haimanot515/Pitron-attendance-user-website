import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Camera from './pages/Camera'
import './App.css'

function App() {
  return (
    <HashRouter>
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
    </HashRouter>
  )
}

export default App