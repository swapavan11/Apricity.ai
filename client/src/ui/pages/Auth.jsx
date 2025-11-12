import React, { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider.jsx';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../../components/LoginForm.jsx';
import RegisterForm from '../../components/RegisterForm.jsx';
import ModeSelection from '../../components/ModeSelection.jsx';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  // Legacy verification UI state not required anymore; flows are handled inside forms
  const [showModeSelection, setShowModeSelection] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('mode') !== 'auth';
    } catch (err) {
      return true;
    }
  });
  const navigate = useNavigate();
  const [banner, setBanner] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get('message') || '';
    } catch {
      return '';
    }
  });
  const { user, loading, isGuestMode } = useAuth();

  // If URL has ?mode=auth, skip mode selection and show auth forms directly
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'auth') {
        setShowModeSelection(false);
      }
      const msg = params.get('message');
      if (msg) setBanner(msg);
    } catch (err) {
      // ignore
    }
  }, []);

  // If we arrived with ?mode=auth, handle browser Back to show ModeSelection
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'auth') {
        const onPop = () => {
          // When coming from flows like verification, keep auth forms visible
          setShowModeSelection(false);
          // Keep mode=auth to preserve auth view
          try { window.history.replaceState({}, '', '/auth?mode=auth'); } catch (e) {}
        };
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
      }
    } catch (err) {
      // ignore
    }
  }, []);

  // Redirect if already logged in or in guest mode
  useEffect(() => {
    if ((user || isGuestMode) && !loading) {
      // If we're on the auth page or landed on home, send users to the study space
      const cur = window.location.pathname || '/';
      if (cur === '/' || cur.startsWith('/auth')) {
        navigate('/study');
      }
    }
  }, [user, loading, isGuestMode, navigate]);

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
    );
  }

  // Show mode selection first
  if (showModeSelection) {
    return (
      <ModeSelection 
        onModeSelected={(mode) => {
          if (mode === 'auth') {
            setShowModeSelection(false);
          }
        }}
      />
    );
  }

  // Show auth page if not logged in and not in guest mode
  if (!user && !isGuestMode) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '500px'
        }}>
          {/* Back to Mode Selection */}
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <button
              onClick={() => setShowModeSelection(true)}
              style={{
                background: 'none',
                border: '1px solid #1f2b57',
                color: 'var(--muted)',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 auto'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to Mode Selection
            </button>
          </div>

          {/* Header */}
          <div style={{
            textAlign: 'center',
            marginBottom: '2rem'
          }}>
            {banner && (
              <div style={{
                background: '#0e1a45',
                border: '1px solid #1f2b57',
                color: 'var(--muted)',
                padding: '10px 14px',
                borderRadius: 8,
                marginBottom: '1rem'
              }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                  <span>{banner}</span>
                  <button onClick={() => setBanner('')} style={{
                    background:'none', border:'none', color:'var(--muted)', cursor:'pointer', padding:4
                  }}>Dismiss</button>
                </div>
              </div>
            )}
            <h1 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '2.5rem',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Apricity.ai
            </h1>
            <p style={{
              margin: 0,
              color: 'var(--muted)',
              fontSize: '1rem'
            }}>
              Your AI-powered study companion
            </p>
          </div>

          {/* Auth Forms */}
          {isLogin ? (
            <LoginForm 
              onSwitchToRegister={() => setIsLogin(false)}
              onSuccess={() => navigate('/')}
            />
          ) : (
            <RegisterForm 
              onSwitchToLogin={() => setIsLogin(true)}
              onSuccess={() => navigate('/')}
            />
          )}

          {/* Features */}
          <div style={{
            marginTop: '3rem',
            textAlign: 'center'
          }}>
            <h3 style={{
              margin: '0 0 1rem 0',
              color: 'var(--text)',
              fontSize: '1.1rem'
            }}>
              What you'll get:
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginTop: '1rem'
            }}>
              <div style={{
                padding: '1rem',
                background: 'var(--panel)',
                borderRadius: '8px',
                border: '1px solid #1f2b57'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>PDF Analysis</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  Upload and analyze PDF documents with AI
                </div>
              </div>
              <div style={{
                padding: '1rem',
                background: 'var(--panel)',
                borderRadius: '8px',
                border: '1px solid #1f2b57'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤖</div>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>AI Tutor</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  Chat with your personal AI study assistant
                </div>
              </div>
              <div style={{
                padding: '1rem',
                background: 'var(--panel)',
                borderRadius: '8px',
                border: '1px solid #1f2b57'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Smart Quizzes</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  Generate and take customized quizzes
                </div>
              </div>
              <div style={{
                padding: '1rem',
                background: 'var(--panel)',
                borderRadius: '8px',
                border: '1px solid #1f2b57'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Progress Tracking</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  Monitor your learning progress and performance
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null; // Will redirect
};

export default Auth;
