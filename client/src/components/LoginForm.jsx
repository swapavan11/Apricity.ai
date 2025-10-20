import React, { useState } from 'react';
import { useAuth } from './AuthProvider.jsx';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const LoginForm = ({ onSwitchToRegister, onSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const navigate = useNavigate();
  // Simplified login: accept email OR mobile number in the same field
  const [useMobile, setUseMobile] = useState(false);
  const [countryDial, setCountryDial] = useState('1');
  const COUNTRY_OPTIONS = [
    { code: 'US', dial: '1' }, { code: 'IN', dial: '91' }, { code: 'GB', dial: '44' }, { code: 'CA', dial: '1' }, { code: 'AU', dial: '61' }, { code: 'SG', dial: '65' }, { code: 'DE', dial: '49' }, { code: 'FR', dial: '33' }, { code: 'ZA', dial: '27' }, { code: 'BR', dial: '55' }
  ];
  const buildE164 = (dial, number) => {
    const raw = (number || '').trim();
    if (raw.startsWith('+')) {
      const digits = raw.replace(/\D/g, '');
      return digits ? `+${digits}` : '';
    }
    const digits = raw.replace(/\D/g, '');
    const cc = String(dial || '').replace(/\D/g, '');
    if (!digits) return '';
    return `+${cc}${digits}`;
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const identifier = useMobile
      ? buildE164(countryDial, formData.email.trim())
      : formData.email.trim();
    const result = await login(identifier, formData.password);
    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  return (
    <div style={{
      maxWidth: '400px',
      margin: '0 auto',
      padding: '2rem',
      background: 'var(--panel)',
      borderRadius: '12px',
  border: '1px solid var(--border)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ 
          margin: '0 0 0.5rem 0', 
          color: 'var(--accent)',
          fontSize: '1.5rem'
        }}>
          Welcome Back
        </h2>
        <p style={{ 
          margin: 0, 
          color: 'var(--muted)',
          fontSize: '0.9rem'
        }}>
          Sign in to your QuizHive.ai account
        </p>
      </div>

      {error && (
        <div style={{
          background: '#ff7c7c20',
          border: '1px solid #ff7c7c',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '1rem',
          color: '#ff7c7c',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

      {/* Identifier hint toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={() => { setUseMobile(false); setError(''); }}
          style={{ flex: 1, padding: 10, borderRadius: 8, border: !useMobile?'1px solid var(--accent)':'1px solid var(--border)', background: !useMobile?'#5e82f5ff':'var(--input-bg)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}>
          Use Email
        </button>
        <button type="button" onClick={() => { setUseMobile(true); setError(''); }}
          style={{ flex: 1, padding: 10, borderRadius: 8, border: useMobile?'1px solid var(--accent)':'1px solid var(--border)', background: useMobile?'#5e82f5ff':'var(--input-bg)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}>
          Use Mobile
        </button>
      </div>

      <form onSubmit={handleSubmit}>
         <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            color: 'var(--text)',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            {useMobile ? 'Mobile Number' : 'Email Address or Mobile'}
          </label>
          {useMobile ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={countryDial}
                onChange={(e) => setCountryDial(e.target.value)}
                style={{
                  padding: '12px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                  flex: '0 0 120px',
                  minWidth: 0
                }}
              >
                {COUNTRY_OPTIONS.map(opt => (
                  <option key={opt.code} value={opt.dial}>+{opt.dial} {opt.code}</option>
                ))}
              </select>
              <input
                type="tel"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                  minWidth: 0
                }}
                placeholder="Enter your mobile number"
              />
            </div>
          ) : (
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--input-bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text)',
                fontSize: '0.9rem'
              }}
              placeholder="Enter your email or mobile"
            />
          )}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            color: 'var(--text)',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            Password
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--input-bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text)',
              fontSize: '0.9rem'
            }}
            placeholder="Enter your password"
          />
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', marginTop: '4px', marginBottom: '12px' }}>
          <button
            type="button"
            onClick={() => navigate('/reset-password')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              padding: 0,
              fontSize: '0.85rem',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Forgot password?
          </button>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: loading ? 'var(--border)' : 'var(--accent)',
            color: loading ? 'var(--muted)' : '#0a0f25',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      <div style={{
        textAlign: 'center',
        marginTop: '1.5rem',
        paddingTop: '1.5rem',
  borderTop: '1px solid var(--border)'
      }}>
        <p style={{ 
          margin: '0 0 1rem 0', 
          color: 'var(--muted)',
          fontSize: '0.9rem'
        }}>
          Don't have an account?
        </p>
        <button
          onClick={onSwitchToRegister}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            color: 'var(--accent)',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Create Account
        </button>
      </div>

      <div style={{
        textAlign: 'center',
        marginTop: '1rem'
      }}>
        {(() => {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          const isDev = origin.includes('localhost:5173');
          const backendBase = isDev ? 'http://localhost:5000' : '';
          const googleUrl = `${backendBase}/api/auth/google`;
          const onClick = () => {
            try { setRedirecting(true); } catch {}
          };
          return (
            <a
              href={googleUrl}
              onClick={onClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--input-bg)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            padding: '10px 16px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '0.9rem',
            transition: 'all 0.2s ease'
          }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </a>
          );
        })()}
      </div>

      {redirecting && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(10, 15, 37, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'var(--panel)',
            border: '1px solid #1f2b57',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #1f2b57',
              borderTop: '3px solid var(--accent)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <div style={{ color: 'var(--muted)' }}>Redirecting to Google…</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginForm;

