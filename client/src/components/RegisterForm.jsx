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
  const { register, registerMobile } = useAuth();
  const { verifyMobile, resendMobileOTP } = useAuth();

  // registration method: 'email' -> email verification link | 'mobile' -> OTP flow
  const [method, setMethod] = useState('email');
  const [otpPhase, setOtpPhase] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // cooldown timer for resend OTP
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
    if (method === 'email' && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (method === 'email' && formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    // In mobile method, mobile is required and must be valid
    const digits = (formData.mobile || '').replace(/\D/g, '');
    if (method === 'mobile') {
      if (!digits || digits.length !== 10) {
        setError('Please enter a valid 10-digit mobile number');
        return false;
      }
    } else {
      // In email method, mobile is optional; if provided, validate format
      if (formData.mobile && digits.length !== 10) {
        setError('Please enter a valid 10-digit mobile number');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    if (method === 'mobile') {
      // Call mobile-only registration API
      const result = await registerMobile(formData.name, formData.mobile);
      if (result.success) {
        setSuccess('We have sent a verification code to your mobile. Please enter it below.');
        setOtpPhase(true);
        setResendCooldown(30);
      } else {
        setError(result.message || 'Registration failed');
      }
    } else {
      // Email/password route
      const result = await register(
        formData.name,
        formData.email,
        formData.password,
        formData.mobile || undefined
      );
      if (result.success) {
        setSuccess(result.message || 'Registration successful. Please check your email for verification.');
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      } else {
        setError(result.message || 'Registration failed');
      }
    }
    
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault?.();
    setError('');
    setSuccess('');
    if (!formData.mobile) {
      setError('Mobile number is missing');
      return;
    }
    if (!otp || otp.trim().length < 4) {
      setError('Please enter the OTP sent to your mobile');
      return;
    }

    setLoading(true);
    const digits = formData.mobile.replace(/\D/g, '');
    const resp = await verifyMobile(digits, otp.trim());
    if (resp.success) {
      setSuccess('Mobile number verified successfully!');
      setTimeout(() => {
        onSuccess?.();
      }, 1200);
    } else {
      setError(resp.message || 'Invalid or expired OTP');
    }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    if (resendCooldown || !formData.mobile) return;
    setError('');
    const digits = formData.mobile.replace(/\D/g, '');
    const resp = await resendMobileOTP(digits);
    if (!resp.success) {
      setError(resp.message || 'Failed to resend OTP');
    } else {
      setSuccess('OTP sent again. Please check your messages.');
      setResendCooldown(30);
    }
  };

  return (
    <div style={{
      maxWidth: '400px',
      margin: '0 auto',
      padding: '2rem',
      background: 'var(--panel)',
      borderRadius: '12px',
      border: '1px solid #1f2b57'
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
          Join QuizHive.ai and start your AI-powered learning journey
        </p>
      </div>

      {/* Registration method toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={() => { setMethod('email'); setOtpPhase(false); setError(''); setSuccess(''); }}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: method === 'email' ? '1px solid var(--accent)' : '1px solid #1f2b57',
            background: method === 'email' ? '#13204a' : '#0f1530',
            color: 'var(--text)',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Email & Password
        </button>
        <button
          type="button"
          onClick={() => { setMethod('mobile'); setOtpPhase(false); setError(''); setSuccess(''); }}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: method === 'mobile' ? '1px solid var(--accent)' : '1px solid #1f2b57',
            background: method === 'mobile' ? '#13204a' : '#0f1530',
            color: 'var(--text)',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Mobile OTP
        </button>
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

      {success && (
        <div style={{
          background: '#6ee7b720',
          border: '1px solid #6ee7b7',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '1rem',
          color: '#6ee7b7',
          fontSize: '0.9rem'
        }}>
          {success}
        </div>
      )}

      {/* Initial registration form */}
      {!otpPhase && (
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
              background: '#0f1530',
              border: '1px solid #1f2b57',
              borderRadius: '8px',
              color: 'var(--text)',
              fontSize: '0.9rem'
            }}
            placeholder="Enter your full name"
          />
        </div>

        {/* Email (Email method only) */}
        {method === 'email' && (
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
              background: '#0f1530',
              border: '1px solid #1f2b57',
              borderRadius: '8px',
              color: 'var(--text)',
              fontSize: '0.9rem'
            }}
            placeholder="Enter your email"
          />
        </div>
        )}
        {/* Mobile, optional in email method, required in mobile method */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            color: 'var(--text)',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            Mobile Number {method === 'mobile' ? '*' : '(Optional)'}
          </label>
          <input
            type="tel"
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
            required={method === 'mobile'}
            style={{
              width: '100%',
              padding: '12px',
              background: '#0f1530',
              border: '1px solid #1f2b57',
              borderRadius: '8px',
              color: 'var(--text)',
              fontSize: '0.9rem'
            }}
            placeholder="Enter your mobile number"
          />
        </div>

        {/* Passwords (Email method only) */}
        {method === 'email' && (
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
              background: '#0f1530',
              border: '1px solid #1f2b57',
              borderRadius: '8px',
              color: 'var(--text)',
              fontSize: '0.9rem'
            }}
            placeholder="Create a password"
          />
        </div>
        )}

        {method === 'email' && (
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
              background: '#0f1530',
              border: '1px solid #1f2b57',
              borderRadius: '8px',
              color: 'var(--text)',
              fontSize: '0.9rem'
            }}
            placeholder="Confirm your password"
          />
        </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: loading ? '#1f2b57' : 'var(--accent)',
            color: loading ? 'var(--muted)' : '#0a0f25',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {loading ? 'Creating Account...' : (method === 'mobile' ? 'Create & Send OTP' : 'Create Account')}
        </button>
      </form>
      )}

      {/* OTP verification phase */}
      {otpPhase && (
        <form onSubmit={handleVerifyOtp} style={{ marginTop: '1rem' }}>
          <div style={{
            padding: '12px',
            background: '#0f1530',
            border: '1px solid #1f2b57',
            borderRadius: '8px',
            color: 'var(--muted)',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            Enter the 6-digit code sent to {formData.mobile}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '1rem' }}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              style={{
                flex: 1,
                padding: '12px',
                background: '#0f1530',
                border: '1px solid #1f2b57',
                borderRadius: '8px',
                color: 'var(--text)',
                fontSize: '1rem',
                letterSpacing: '0.25em',
                textAlign: 'center'
              }}
              placeholder="______"
            />
            <button
              type="button"
              disabled={!!resendCooldown || loading}
              onClick={handleResendOtp}
              style={{
                whiteSpace: 'nowrap',
                background: 'none',
                border: '1px solid #1f2b57',
                color: 'var(--accent)',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                cursor: resendCooldown ? 'not-allowed' : 'pointer'
              }}
            >
              {resendCooldown ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#1f2b57' : 'var(--accent)',
              color: loading ? 'var(--muted)' : '#0a0f25',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? 'Verifying…' : 'Verify OTP'}
          </button>
        </form>
      )}

      <div style={{
        textAlign: 'center',
        marginTop: '1.5rem',
        paddingTop: '1.5rem',
        borderTop: '1px solid #1f2b57'
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
            border: '1px solid #1f2b57',
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
    </div>
  );
};

export default RegisterForm;

