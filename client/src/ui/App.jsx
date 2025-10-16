import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, NavLink, useLocation } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '../components/AuthProvider.jsx'
import Home from './pages/Home.jsx'
import Study from './pages/Study.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Auth from './pages/Auth.jsx'

function AppContent() {
  const [sourceSelectorVisible, setSourceSelectorVisible] = useState(false)
  const [docs, setDocs] = useState([])
  const [selected, setSelected] = useState('all')
  const location = useLocation()
  const isHomePage = location.pathname === '/'
  const { user, loading, isGuestMode, exitGuestMode } = useAuth()
  const navigate = useNavigate()

  // On first open in this tab, redirect to Home so initial link opens Home
  React.useEffect(() => {
    try {
      const key = 'quizhive_first_open_done'
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        if (location.pathname !== '/') {
          navigate('/')
        }
      }
    } catch (err) {
      // ignore
    }
  }, [])

  // API functions for source selector
  const useApi = () => {
    const base = ''
    return {
      listDocs: async () => {
        const response = await fetch(`${base}/api/upload`)
        const data = await response.json()
        return data.success ? data.documents : []
      },
      uploadPdf: async (file, title) => {
        const fd = new FormData()
        fd.append('pdf', file)
        if (title) fd.append('title', title)
        const res = await fetch(`${base}/api/upload`, { method: 'POST', body: fd })
        return res.json()
      },
    }
  }

  const api = useApi()

  // Load docs on mount (if user is logged in or in guest mode)
  React.useEffect(() => {
    if ((user || isGuestMode) && !loading) {
      api.listDocs().then(setDocs)
    }
  }, [user, loading, isGuestMode])

  const handleUpload = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const res = await api.uploadPdf(f, f.name)
    if (res.success) {
      const all = await api.listDocs()
      setDocs(all)
      setSelected(res.document.id)
    }
  }

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg)'
      }}>
        <div style={{
          textAlign: 'center',
          color: 'var(--muted)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #1f2b57',
            borderTop: '3px solid var(--accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <div>Loading...</div>
        </div>
      </div>
    )
  }

  // Show auth page if not logged in and not in guest mode
  if (!user && !isGuestMode) {
    return <Auth />
  }

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
            <div style={{
              width:'32px',
              height:'32px',
              background:'linear-gradient(135deg, var(--accent), var(--accent2))',
              borderRadius:'8px',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              fontSize:'16px',
              fontWeight:'bold',
              color:'#0a0f25'
            }}>
              Q
            </div>
            <span>QuizHive.ai</span>
          </div>
        </div>
        
        {/* Centered Source Selector - Hidden on Home Page */}
        {!isHomePage && (
          <div className="source-selector-container">
            <div className="source-controls">
              <div className="select-wrapper">
                <svg className="select-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <select 
                  value={selected} 
                  onChange={(e)=>setSelected(e.target.value)}
                  className="source-select"
                >
                  <option value="all">All uploaded PDFs</option>
                  {docs.map(d => <option key={d._id} value={d._id}>{d.title} ({d.pages}p)</option>)}
                </select>
              </div>
              
              <button 
                className="nav-button secondary" 
                onClick={()=>setSelected('all')}
                title="Reset to all PDFs"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Reset</span>
              </button>
              
              <input 
                id="pdfUpload" 
                type="file" 
                accept="application/pdf" 
                onChange={handleUpload} 
                style={{display:'none'}} 
              />
              <button 
                onClick={()=>document.getElementById('pdfUpload').click()} 
                className="nav-button secondary" 
                title="Upload new PDF"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="12" y1="18" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="9" y1="15" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span>Upload</span>
              </button>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div className="nav-links">
          <NavLink to="/" end className="nav-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Home</span>
          </NavLink>
          <NavLink to="/study" className="nav-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Learning Space</span>
          </NavLink>
          <NavLink to="/dashboard" className="nav-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Dashboard</span>
          </NavLink>
          
              {/* User Menu */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: isGuestMode ? '#ffa500' : 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0a0f25',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>
                  {isGuestMode ? 'G' : (user?.name?.charAt(0)?.toUpperCase() || 'U')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>
                    {isGuestMode ? 'Guest User' : (user?.name || 'User')}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                    {isGuestMode ? 'Limited access mode' : (user?.email || '')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {isGuestMode ? (
                    <button
                      onClick={() => {
                        // Exit guest mode first so the /auth page doesn't auto-redirect back
                        exitGuestMode();
                        // Then navigate to the auth route and request auth mode (client-side)
                        navigate('/auth?mode=auth')
                      }}
                      style={{
                        background: 'var(--accent)',
                        color: '#0a0f25',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      Sign Up
                    </button>
                  ) : null}
                  <button
                    onClick={() => {
                      localStorage.removeItem('token');
                      localStorage.removeItem('guestMode');
                      window.location.reload();
                    }}
                    style={{
                      background: 'none',
                      border: '1px solid #1f2b57',
                      color: 'var(--muted)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {isGuestMode ? 'Exit' : 'Logout'}
                  </button>
                </div>
              </div>
        </div>
      </div>
      <div className="content">
        {/* Use location.key to force remount of route content on navigation (back/forward) */}
        <div key={location.key} style={{height:'100%'}}>
          <Routes location={location}>
            <Route path="/" element={<div className="home-main"><Home /></div>} />
            <Route path="/study" element={<Study selected={selected} docs={docs} />} />
            <Route path="/dashboard" element={<div className="dashboard-main"><Dashboard /></div>} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}


