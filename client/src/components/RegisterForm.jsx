import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider.jsx';

const RegisterForm = ({ onSwitchToLogin, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobile: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { register } = useAuth();

  // single registration flow (email/password); mobile is optional and stored as-is
  const [resendCooldown, setResendCooldown] = useState(0);
  const [countryDial, setCountryDial] = useState('1'); // default US
  const [redirectingGoogle, setRedirectingGoogle] = useState(false);

  const COUNTRY_OPTIONS = [
    { code: 'US', dial: '1' },
    { code: 'IN', dial: '91' },
    { code: 'GB', dial: '44' },
    { code: 'CA', dial: '1' },
    { code: 'AU', dial: '61' },
    { code: 'SG', dial: '65' },
    { code: 'DE', dial: '49' },
    { code: 'FR', dial: '33' },
    { code: 'ZA', dial: '27' },
    { code: 'BR', dial: '55' }
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

  // cooldown timer (legacy, not used but kept if needed for future)
  useEffect(() => {
    if (!resendCooldown) return;
    const t = setInterval(() => setResendCooldown((x) => (x > 0 ? x - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    // Mobile optional; if provided, allow + prefixed or digits
    const digits = (formData.mobile || '').replace(/\D/g, '');
    if (formData.mobile && digits.length < 7) {
      setError('Please enter a valid mobile number');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    // Email/password route only; mobile optional
    const mobileE164 = formData.mobile ? buildE164(countryDial, formData.mobile) : undefined;
    const result = await register(
      formData.name,
      formData.email,
      formData.password,
      mobileE164
    );
    if (result.success) {
      setSuccess(result.message || 'Registration successful. Please check your email for verification.');
      // If backend resent verification for an already-registered but unverified user,
      // do not auto-redirect; let the user read the message and act.
      // Keep the success message visible and skip onSuccess redirect here.
    } else {
      setError(result.message || 'Registration failed');
    }
    
    setLoading(false);
  };

  // Removed OTP handlers

  return (
    <div style={{
      maxWidth: '400px',
      margin: '0 auto',
      padding: '2rem',
      background: 'var(--panel)',
      borderRadius: '12px',
      border: '1px solid var(--border)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ 
          margin: '0 0 0.5rem 0', 
          color: 'var(--accent)',
          fontSize: '1.5rem'
        }}>
          Create Account
        </h2>
        <p style={{ 
          margin: 0, 
          color: 'var(--muted)',
          fontSize: '0.9rem'
        }}>
          Join Apricity.ai and start your AI-powered learning journey
        </p>
      </div>

      {/* Single registration flow (email/password); mobile optional */}

      {error && (
        <div style={{
          background: 'var(--error-bg)',
          border: '1px solid var(--error-border)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '1rem',
          color: 'var(--error-text)',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          background: 'var(--success-bg)',
          border: '1px solid var(--success-border)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '1rem',
          color: 'var(--success-text)',
          fontSize: '0.9rem'
        }}>
          {success}
        </div>
      )}

  {/* Registration form */}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            color: 'var(--text)',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            Full Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
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
            placeholder="Enter your full name"
          />
        </div>

  {/* Email */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            color: 'var(--text)',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            Email Address *
          </label>
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
            placeholder="Enter your email"
          />
        </div>
        {/* Mobile, optional in email method, required in mobile method */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            color: 'var(--text)',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            Mobile Number (Optional)
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={countryDial}
              onChange={(e) => setCountryDial(e.target.value)}
              style={{ padding: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)' }}
            >
              {COUNTRY_OPTIONS.map(opt => (
                <option key={opt.code} value={opt.dial}>+{opt.dial} {opt.code}</option>
              ))}
            </select>
            <input
              type="tel"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              required={false}
              style={{
                flex: 1,
                padding: '12px',
                background: 'var(--input-bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text)',
                fontSize: '0.9rem'
              }}
              placeholder="Enter your mobile number"
            />
          </div>
        </div>

  {/* Password */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            color: 'var(--text)',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            Password *
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
            placeholder="Create a password"
          />
  </div>

  {/* Confirm Password */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            color: 'var(--text)',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            Confirm Password *
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
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
            placeholder="Confirm your password"
          />
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
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
      {/* Removed OTP verification phase */}

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
          Already have an account?
        </p>
        <button
          onClick={onSwitchToLogin}
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
          Sign In
        </button>
      </div>

      {/* Continue with Google under create account */}
      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        {(() => {
          // Use environment variable for API base URL, fallback to empty string for Vite proxy
          const backendBase = import.meta.env.VITE_API_BASE_URL || '';
          const googleUrl = `${backendBase}/api/auth/google`;
          return (
            <a
              href={googleUrl}
              onClick={() => setRedirectingGoogle(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)',
                padding: '10px 16px', borderRadius: 8, textDecoration: 'none', fontSize: '0.9rem'
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
    </div>
  );
};

export default RegisterForm;

