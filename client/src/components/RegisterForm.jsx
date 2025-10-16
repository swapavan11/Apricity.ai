import React, { useState } from 'react';
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
    if (formData.mobile && !/^\d{10}$/.test(formData.mobile.replace(/\D/g, ''))) {
      setError('Please enter a valid 10-digit mobile number');
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

    const result = await register(
      formData.name,
      formData.email,
      formData.password,
      formData.mobile || undefined
    );
    
    if (result.success) {
      setSuccess(result.message);
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
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
      border: '1px solid #1f2b57'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
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
          <input
            type="tel"
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
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
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

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

