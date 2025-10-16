import React, { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider.jsx';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../../components/LoginForm.jsx';
import RegisterForm from '../../components/RegisterForm.jsx';
import ModeSelection from '../../components/ModeSelection.jsx';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationData, setVerificationData] = useState(null);
  const [showModeSelection, setShowModeSelection] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('mode') !== 'auth';
    } catch (err) {
      return true;
    }
  });
  const navigate = useNavigate();
  const { user, loading, isGuestMode } = useAuth();

  // If URL has ?mode=auth, skip mode selection and show auth forms directly
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'auth') {
        setShowModeSelection(false);
      }
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
          // Show mode selection UI
          setShowModeSelection(true);
          // Remove query param from URL for a cleaner state
          try { window.history.replaceState({}, '', '/auth'); } catch (e) {}
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
      navigate('/');
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
            <h1 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '2.5rem',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              QuizHive.ai
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
              onSuccess={() => {
                setShowVerification(true);
                setVerificationData({ email: formData.email, mobile: formData.mobile });
              }}
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
