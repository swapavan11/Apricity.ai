import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider.jsx';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { completeOAuthLogin } = useAuth();
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
  const token = params.get('token');
    const errorParam = params.get('error');
  const statusParam = params.get('status');
  if (statusParam) setStatus(statusParam);

    const finalize = async () => {
      if (errorParam) {
        setError(errorParam);
        // After short delay, send to login
        setTimeout(() => navigate('/auth?mode=auth'), 1500);
        return;
      }

      const result = await completeOAuthLogin(token);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.message || 'OAuth login failed');
        setTimeout(() => navigate('/auth?mode=auth'), 1500);
      }
    };

    finalize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--bg)'
    }}>
      <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #1f2b57',
          borderTop: '3px solid var(--accent)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }}></div>
        {!error && (
          <div style={{ marginBottom: '0.5rem' }}>
            {status === 'returning' && 'Welcome back! Fetching your profile…'}
            {status === 'new' && 'Creating your account…'}
            {status === 'linked' && 'Linking your account…'}
            {!status && 'Signing you in with Google…'}
          </div>
        )}
        <div>{error ? `Redirecting… (${error})` : ''}</div>
      </div>
    </div>
  );
};

export default OAuthCallback;
