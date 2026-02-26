import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const token = searchParams.get('token');
    const encodedEmail = searchParams.get('email');
    const email = encodedEmail ? decodeURIComponent(encodedEmail) : '';
    if (!token || !email) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }
    // Call backend to verify
    apiClient.post('/auth/verify-email', { email, token })
      .then(() => {
        setStatus('success');
        setMessage('Account verified! Redirecting to login...');
        setTimeout(() => navigate('/login'), 1500);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Verification failed. The link may have expired or is invalid.');
      });
  }, [searchParams, navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a0010' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 36, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <h2 style={{ color: status === 'success' ? '#22c55e' : status === 'error' ? '#fd424a' : '#333', marginBottom: 18 }}>
          {status === 'pending' && 'Verifying...'}
          {status === 'success' && 'Email Verified!'}
          {status === 'error' && 'Verification Failed'}
        </h2>
        <p style={{ color: '#444', fontSize: 16 }}>{message}</p>
        {status === 'success' && (
          <button onClick={() => navigate('/login')} style={{ marginTop: 24, background: 'linear-gradient(90deg, #fd424a, #ff8e53)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 32px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Go to Login</button>
        )}
        {status === 'error' && (
          <button onClick={() => navigate('/')} style={{ marginTop: 24, background: '#eee', color: '#222', border: 'none', borderRadius: 8, padding: '10px 32px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Back to Home</button>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
