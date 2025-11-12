 


import React, { useState, useEffect } from "react";
import { Routes, Route, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../components/AuthProvider.jsx";
import Home from "./pages/Home.jsx";
import Study from "../components/Study/Study.jsx"; // ✅ updated import (from components/Study)
import Dashboard from "./pages/Dashboard.jsx";
import Auth from "./pages/Auth.jsx";
import "./styles.css"; // ✅ import theme styles once globally
import useApi from '../api/useApi'
import OAuthCallback from './pages/OAuthCallback.jsx'
import VerifyEmail from './pages/VerifyEmail.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import ProfileModal from '../components/ProfileModal.jsx'

function AppContent() {
  const [docs, setDocs] = useState([]);
  const [selected, setSelected] = useState("all");
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const isStudyPage = location.pathname === "/study";
  const isDashboardPage = location.pathname === "/dashboard";
  const isOAuthCallback = location.pathname.startsWith('/auth/callback');
  const isVerifyEmail = location.pathname.startsWith('/verify-email');
  const isResetPassword = location.pathname.startsWith('/reset-password');
  const isSpecialRoute = isOAuthCallback || isVerifyEmail || isResetPassword;
  const { user, loading, isGuestMode, exitGuestMode } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [themePref, setThemePref] = useState(() => localStorage.getItem('themePreference') || 'dark');
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const applyTheme = () => {
      // resolve the effective theme from preference
      let resolved = themePref;
      if (themePref === 'system') {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        resolved = prefersDark ? 'dark' : 'light';
      }
      setTheme(resolved);
      try {
        document.body.setAttribute('data-theme', resolved);
      } catch {}
    };

    applyTheme();
    // listen to system changes if on system pref
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const handler = () => { if (themePref === 'system') applyTheme(); };
    if (mq) {
      mq.addEventListener ? mq.addEventListener('change', handler) : mq.addListener && mq.addListener(handler);
    }
    try { localStorage.setItem('themePreference', themePref); } catch {}
    return () => {
      if (mq) {
        mq.removeEventListener ? mq.removeEventListener('change', handler) : mq.removeListener && mq.removeListener(handler);
      }
    };
  }, [themePref]);


  const api = useApi()

  // Keep special routes accessible even while auth is loading

  // Load uploaded PDFs
  useEffect(() => {
    if ((user || isGuestMode) && !loading) {
      api.getDocs().then(setDocs).catch((e)=>{ console.error('Failed to load docs', e); setDocs([]); });
    }
  }, [user, loading, isGuestMode]);

  // Handle PDF upload
  const handleUpload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const res = await api.uploadPdf(f, f.name);
    if (res.success) {
      if (res.document && res.document.isGuest) {
        // Guest upload: not persisted to server. Add a temporary in-memory doc so
        // the source selector and viewer can display it immediately.
        const tempId = `local:${f.name}:${Date.now()}`;
        const tempDoc = {
          _id: tempId,
          title: res.document.title || f.name,
          pages: res.document.pages || 0,
          cloudinaryUrl: res.document.cloudinaryUrl || null,
          localUrl: res.document.localUrl || `/api/upload/local/${encodeURIComponent(res.document.localUrl ? res.document.localUrl.split('/').pop() : f.name)}`
        };
        setDocs(prev => [tempDoc, ...(prev || [])]);
        setSelected(tempId);
      } else {
  const all = await api.getDocs();
  setDocs(all || []);
        // Prefer _id if provided by server
        setSelected(res.document && (res.document._id || res.document.id));
      }
    }
  };

  // Loading screen
  if (loading && !isSpecialRoute) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--bg)",
        }}
      >
        <div style={{ textAlign: "center", color: "var(--muted)" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid var(--border)",
              borderTop: "3px solid var(--accent)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 1rem",
            }}
          ></div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  // Not logged in → Auth page
  if (!isSpecialRoute && !user && !isGuestMode) return <Auth />;

  return (
    <div className="app">
      {/* 🔹 Topbar */}
      <div className="topbar">
        {/* Brand */}
        <div className="brand">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                fontWeight: "bold",
                color: "#0a0f25",
              }}
            >
              Q
            </div>
            <span>Apricity.ai</span>
          </div>
        </div>

        {/* Source Selector (hidden on Home) */}
        {!isHomePage && (
          <div className="source-selector-container">
            <div className="source-controls">
              <div className="select-wrapper">
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="source-select"
                >
                  <option value="all">All uploaded PDFs</option>
                  {docs.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.title} ({d.pages}p)
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="nav-button secondary"
                onClick={() => setSelected("all")}
                title="Reset selection"
              >
                Reset
              </button>

              <input
                id="pdfUpload"
                type="file"
                accept="application/pdf"
                onChange={handleUpload}
                style={{ display: "none" }}
              />
              <button
                onClick={() => document.getElementById("pdfUpload").click()}
                className="nav-button secondary"
                title="Upload new PDF"
              >
                Upload
              </button>
            </div>
          </div>
        )}

        {/* 🔹 Navigation */}
        <div className="nav-links">
          <NavLink to="/" end className="nav-link">
            Home
          </NavLink>
          <NavLink to="/study" className="nav-link">
            Learning Space
          </NavLink>
          <NavLink to="/dashboard" className="nav-link">
            Dashboard
          </NavLink>

          {/* 🔹 User Info */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginLeft: "16px",
            }}
          >
            {/* Theme toggle moved to Profile Modal */}
            {(!isGuestMode && user?.avatar && !avatarError) ? (
              <img src={user.avatar} alt="avatar" onError={()=>setAvatarError(true)} style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover', border:'2px solid var(--border)' }} />
            ) : (
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: isGuestMode ? "#ffa500" : "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0a0f25",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                {isGuestMode ? "G" : user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text)" }}>
                {isGuestMode ? "Guest User" : user?.name || "User"}
              </div>
              <div style={{ fontSize: "10px", color: "var(--muted)" }}>
                {isGuestMode ? "Limited access mode" : user?.email}
              </div>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              {isGuestMode && (
                <button
                  onClick={() => {
                    exitGuestMode();
                    navigate("/auth?mode=auth");
                  }}
                  style={{
                    background: "var(--accent)",
                    color: "#0a0f25",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  Sign Up
                </button>
              )}
              {!isGuestMode && (
                <button
                  onClick={() => setProfileOpen(true)}
                  style={{
                    background: "none",
                    border: "1px solid var(--border)",
                    color: "var(--muted)",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                >
                  Profile
                </button>
              )}
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("guestMode");
                  window.location.reload();
                }}
                style={{
                  background: "none",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
              >
                {isGuestMode ? "Exit" : "Logout"}
              </button>
            </div>
          </div>
        </div>
      </div>
  {profileOpen && <ProfileModal open={profileOpen} onClose={()=>setProfileOpen(false)} themePref={themePref} setThemePref={setThemePref} />}

      {/* 🔹 Main Content */}
      <div 
        className="content" 
        style={{ 
          height: "calc(100vh - 60px)", 
          overflow: (isStudyPage || isDashboardPage) ? "hidden" : "auto"
        }}
      >
        <div style={{ height: "100%" }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/study" element={<Study selected={selected} docs={docs} />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
