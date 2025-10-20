import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider.jsx';
import { useNavigate } from 'react-router-dom';

const ModeSelection = ({ onModeSelected }) => {
  const { enterGuestMode } = useAuth();
  const navigate = useNavigate();

  // if user presses browser Back while on ModeSelection, go to Home
  useEffect(() => {
    const onPop = () => navigate('/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [navigate]);

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
        maxWidth: '600px',
        width: '100%'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '3rem'
        }}>
            <h1 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '3rem',
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            QuizHive.ai
          </h1>
          <p style={{
            margin: 0,
            color: 'var(--muted)',
            fontSize: '1.2rem'
          }}>
            Your AI-powered study companion
          </p>
        </div>

        {/* Mode Selection Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          {/* Guest Mode Card */}
          <div style={{
            background: 'var(--panel)',
            borderRadius: '16px',
            border: '2px solid var(--border)',
            padding: '2rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = 'var(--accent)';
            e.target.style.transform = 'translateY(-4px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = 'var(--border)';
            e.target.style.transform = 'translateY(0)';
          }}
          onClick={() => {
            enterGuestMode();
            onModeSelected?.();
            // Navigate to study so the app renders the study space for guest users
            navigate('/study');
          }}>
            <div style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: '#6ee7b7',
              color: '#0a0f25',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '0.8rem',
              fontWeight: '600'
            }}>
              FREE
            </div>
            
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</div>
            <h3 style={{
              margin: '0 0 1rem 0',
              color: 'var(--text)',
              fontSize: '1.5rem'
            }}>
              Continue as Guest
            </h3>
            <p style={{
              margin: '0 0 1.5rem 0',
              color: 'var(--muted)',
              lineHeight: '1.6'
            }}>
              Start using QuizHive.ai immediately without creating an account. Perfect for trying out the features.
            </p>
            
            <div style={{
              background: 'var(--input-bg)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
              textAlign: 'left'
            }}>
              <div style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: 'var(--text)',
                marginBottom: '0.5rem'
              }}>
                What you can do:
              </div>
              <ul style={{
                margin: 0,
                paddingLeft: '1.2rem',
                color: 'var(--muted)',
                fontSize: '0.9rem',
                lineHeight: '1.6'
              }}>
                <li>Upload and analyze PDFs</li>
                <li>Chat with AI tutor</li>
                <li>Generate and take quizzes</li>
                <li>Get YouTube recommendations</li>
                <li>View basic progress</li>
              </ul>
            </div>

            <div style={{
              background: '#ff7c7c20',
              border: '1px solid #ff7c7c40',
              borderRadius: '8px',
              padding: '0.8rem',
              marginBottom: '1.5rem',
              fontSize: '0.8rem',
              color: '#ff7c7c'
            }}>
              <strong>Limitations:</strong> Data not saved permanently, limited to current session
            </div>

            <button style={{
              width: '100%',
              padding: '12px',
              background: 'var(--accent)',
              color: '#0a0f25',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}>
              Start as Guest
            </button>
          </div>

          {/* Authenticated Mode Card */}
          <div style={{
            background: 'var(--panel)',
            borderRadius: '16px',
            border: '2px solid var(--border)',
            padding: '2rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = 'var(--accent2)';
            e.target.style.transform = 'translateY(-4px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = 'var(--border)';
            e.target.style.transform = 'translateY(0)';
          }}
          onClick={() => onModeSelected?.('auth')}>
            <div style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'var(--accent2)',
              color: '#0a0f25',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '0.8rem',
              fontWeight: '600'
            }}>
              RECOMMENDED
            </div>
            
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
            <h3 style={{
              margin: '0 0 1rem 0',
              color: 'var(--text)',
              fontSize: '1.5rem'
            }}>
              Create Account
            </h3>
            <p style={{
              margin: '0 0 1.5rem 0',
              color: 'var(--muted)',
              lineHeight: '1.6'
            }}>
              Get the full QuizHive.ai experience with persistent data, progress tracking, and personalized features.
            </p>
            
            <div style={{
              background: 'var(--input-bg)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
              textAlign: 'left'
            }}>
              <div style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: 'var(--text)',
                marginBottom: '0.5rem'
              }}>
                Full features:
              </div>
              <ul style={{
                margin: 0,
                paddingLeft: '1.2rem',
                color: 'var(--muted)',
                fontSize: '0.9rem',
                lineHeight: '1.6'
              }}>
                <li>All guest features +</li>
                <li>Persistent data storage</li>
                <li>Detailed progress tracking</li>
                <li>Personalized recommendations</li>
                <li>Cross-device synchronization</li>
                <li>Email & mobile verification</li>
                <li>Google OAuth login</li>
              </ul>
            </div>

            <div style={{
              background: '#6ee7b720',
              border: '1px solid #6ee7b740',
              borderRadius: '8px',
              padding: '0.8rem',
              marginBottom: '1.5rem',
              fontSize: '0.8rem',
              color: '#6ee7b7'
            }}>
              <strong>Benefits:</strong> Your data is saved and accessible across all devices
            </div>

            <button style={{
              width: '100%',
              padding: '12px',
              background: 'var(--accent2)',
              color: '#0a0f25',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}>
              Create Account
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: '0.9rem'
        }}>
          <p style={{ margin: '0 0 0.5rem 0' }}>
            You can always switch between modes later
          </p>
          <p style={{ margin: 0 }}>
            By using QuizHive.ai, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModeSelection;

