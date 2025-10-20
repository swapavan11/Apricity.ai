import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider.jsx';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const { resetPassword, forgotPassword } = useAuth();
  const newPassRef = useRef(null);
  const confirmPassRef = useRef(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMessage('');
    setError('');
  }, [token]);

  const onReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!token) {
      setError('Missing or invalid reset token.');
      return;
    }
    const newPassword = newPassRef.current?.value || '';
    const confirmPassword = confirmPassRef.current?.value || '';
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const res = await resetPassword(token, newPassword);
    setLoading(false);
    if (res.success) {
      setMessage('Password reset successful. Redirecting to learning space…');
      // Replace history so back doesn't re-open token page
      setTimeout(() => navigate('/study', { replace: true }), 800);
    } else {
      setError(res.message || 'Failed to reset password');
    }
  };

  const onRequest = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const val = email.trim();
    if (!val) {
      setError('Please enter your email');
      return;
    }
    setLoading(true);
    const res = await forgotPassword(val);
    setLoading(false);
    if (res.success) setMessage(res.message);
    else setError(res.message || 'Failed to send reset link');
  };

  const Card = ({ children }) => (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: 24, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12 }}>
      {children}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, color: 'var(--accent)' }}>{token ? 'Reset Password' : 'Forgot Password'}</h2>
          <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>
            {token ? 'Set a new password for your account.' : 'Enter your email to receive a reset link.'}
          </p>
        </div>
        <Card>
          {message && (
            <div style={{ background: 'var(--success-bg)', color: 'var(--success-text)', border: `1px solid var(--success-border)`, padding: '10px 12px', borderRadius: 8, marginBottom: 12 }}>
              {message}
            </div>
          )}
          {error && (
            <div style={{ background: 'var(--error-bg)', color: 'var(--error-text)', border: `1px solid var(--error-border)`, padding: '10px 12px', borderRadius: 8, marginBottom: 12 }}>
              {error}
            </div>
          )}

          {token ? (
            <form onSubmit={onReset}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6, color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  ref={newPassRef}
                  placeholder="Enter new password"
                  required
                  autoFocus
                  autoComplete="new-password"
                  autoCapitalize="none"
                  spellCheck={false}
                  style={{ width: '100%', display: 'block' }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  ref={confirmPassRef}
                  placeholder="Confirm new password"
                  required
                  autoComplete="new-password"
                  autoCapitalize="none"
                  spellCheck={false}
                  style={{ width: '100%', display: 'block' }}
                />
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px' }}>{loading ? 'Resetting…' : 'Reset Password'}</button>
            </form>
          ) : (
            <form onSubmit={onRequest}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  autoFocus
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  style={{ width: '100%', display: 'block' }}
                />
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px' }}>{loading ? 'Sending…' : 'Send Reset Link'}</button>
              <div style={{ marginTop: 10, textAlign: 'center' }}>
                <button type="button" onClick={()=>navigate('/auth?mode=auth')} className="secondary" style={{ background: 'var(--btn-secondary-bg)' }}>Back to Sign In</button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
