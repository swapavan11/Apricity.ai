import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider.jsx';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState('Verifying your email…');
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        if (!token) {
          // No token: send user to Login with a helpful message
          navigate(`/auth?mode=auth&message=${encodeURIComponent('Verification link is invalid. Please sign in.')}`);
          return;
        }
        const res = await verifyEmail(token);
        if (res.success) {
          setStatus('Email verified successfully!');
          setVerified(true);
          // After short delay, redirect to study so user lands in learning space with profile
          setTimeout(() => navigate('/study'), 1500);
        } else {
          // Likely link already used or expired: redirect to Login with message
          navigate(`/auth?mode=auth&message=${encodeURIComponent(res.message || 'This verification link is invalid or already used. Please sign in.')}`);
        }
      } catch (e) {
        // On unexpected error, direct user to login with a generic message
        navigate(`/auth?mode=auth&message=${encodeURIComponent('Verification link error. Please sign in.')}`);
      }
    };
    run();
  }, [navigate, verifyEmail]);

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
      <div style={{ textAlign:'center', color:'var(--text)', padding:'2rem', background:'var(--panel)', border:'1px solid #1f2b57', borderRadius:12, maxWidth: 480 }}>
        {!error && !verified && (
          <>
            <div style={{ width:40, height:40, border:'3px solid #1f2b57', borderTop:'3px solid var(--accent)', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 1rem' }} />
            <div style={{ color:'var(--muted)' }}>{status}</div>
          </>
        )}

        {verified && (
          <>
            <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>🎉</div>
            <h2 style={{ margin:'0 0 0.5rem 0', color:'var(--accent)' }}>Registration Successful</h2>
            <p style={{ margin:'0 0 1.25rem 0', color:'var(--muted)' }}>
              Your email has been verified. You can now sign in to your account.
            </p>
            <button
              onClick={() => navigate('/study')}
              style={{
                background:'var(--accent)', color:'#0a0f25', border:'none', padding:'10px 16px', borderRadius:8, fontWeight:600, cursor:'pointer'
              }}
            >
              Go to your learning space now
            </button>
          </>
        )}

        {error && (
          <>
            <div style={{ color:'#ff7c7c', marginBottom:'0.5rem' }}>Verification error</div>
            <div style={{ color:'var(--muted)' }}>{error}</div>
          </>
        )}
      </div>
    </div>
  );
}
