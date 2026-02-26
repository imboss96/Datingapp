import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

// Floating particle type
interface Particle {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  isHeart: boolean;
  color: string;
}

const COLORS = ['#fd424a', '#ff6b6b', '#ff8e53', '#ffb3ba', '#ff4d6d'];

const HeartIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

const StarIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const VerifyEmailInfoPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  const justResent = location.state?.justResent;

  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [showSuccessPrompt, setShowSuccessPrompt] = useState(justResent ? false : true);
  const [startTime] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);

  // Generate floating particles
  useEffect(() => {
    const generated: Particle[] = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 16 + 8,
      duration: Math.random() * 10 + 8,
      delay: Math.random() * 12,
      isHeart: Math.random() > 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    setParticles(generated);
    setTimeout(() => setVisible(true), 80);
  }, []);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;

    const elapsed = Date.now() - startTime;
    if (elapsed < 15 * 60 * 1000) {
      setError('Please wait 15 minutes before resending the verification email.');
      return;
    }

    setResendLoading(true);
    setError(null);
    try {
      await apiClient.requestEmailVerification(email);
      setResendDone(true);
      setResendCooldown(60);
      setTimeout(() => setResendDone(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email.');
    } finally {
      setResendLoading(false);
    }
  };

  // If redirected due to unverified email, auto-show resend success
  useEffect(() => {
    if (justResent) {
      setResendDone(true);
      setResendCooldown(60);
      const t = setTimeout(() => setResendDone(false), 4000);
      return () => clearTimeout(t);
    }
  }, [justResent]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #1a0010 0%, #2d0018 40%, #1a0a00 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Georgia', 'Times New Roman', serif",
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* In-page registration success prompt */}
      {showSuccessPrompt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.32)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '18px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            padding: '36px 32px 28px',
            maxWidth: '90vw',
            minWidth: '320px',
            textAlign: 'center',
            border: '1.5px solid #ff8e53',
          }}>
            <div style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#2d0018',
              marginBottom: '12px',
              letterSpacing: '-0.5px',
            }}>
              {justResent ? 'Email already registered, but not verified.' : 'Registration successful!'}
            </div>
            <div style={{
              fontSize: '15.5px',
              color: '#4b2e2e',
              marginBottom: '24px',
              lineHeight: 1.7,
            }}>
              {justResent
                ? 'We have re-sent a verification email. Please check your inbox to verify your account.'
                : 'Please check your email to verify your account.'}
            </div>
            <button
              onClick={() => setShowSuccessPrompt(false)}
              style={{
                background: 'linear-gradient(90deg, #fd424a, #ff8e53)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 32px',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(253,66,74,0.12)',
                transition: 'background 0.2s',
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Ambient glow blobs */}
      <div style={{
        position: 'fixed', top: '-10%', left: '-10%',
        width: '50vw', height: '50vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(253,66,74,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '-10%', right: '-10%',
        width: '45vw', height: '45vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,142,83,0.14) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Floating particles */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {particles.map(p => (
          <div key={p.id} style={{
            position: 'absolute',
            left: `${p.x}vw`,
            bottom: '-40px',
            opacity: 0,
            animation: `floatUp ${p.duration}s ${p.delay}s linear infinite`,
          }}>
            {p.isHeart
              ? <HeartIcon size={p.size} color={p.color} />
              : <StarIcon size={p.size} color={p.color} />
            }
          </div>
        ))}
      </div>

      {/* Card */}
      <div style={{
        position: 'relative',
        maxWidth: '460px',
        width: '100%',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(253,66,74,0.25)',
        borderRadius: '28px',
        padding: '52px 40px 44px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.96)',
        opacity: visible ? 1 : 0,
        transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        textAlign: 'center',
      }}>

        {/* Icon */}
        <div style={{
          width: '80px', height: '80px',
          background: 'linear-gradient(135deg, #fd424a, #ff8e53)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
          boxShadow: '0 8px 32px rgba(253,66,74,0.5)',
          animation: 'pulse 2.5s ease-in-out infinite',
        }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
            <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M22 6l-10 7L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Brand */}
        <div style={{
          fontSize: '13px',
          fontFamily: "'Trebuchet MS', sans-serif",
          letterSpacing: '4px',
          textTransform: 'uppercase',
          background: 'linear-gradient(135deg, #fd424a, #ff8e53)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '12px',
          fontWeight: '700',
        }}>
          Lunesa
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#fff',
          margin: '0 0 16px',
          lineHeight: 1.2,
          letterSpacing: '-0.5px',
        }}>
          Check Your Inbox
        </h1>

        {/* Divider */}
        <div style={{
          width: '48px', height: '3px',
          background: 'linear-gradient(90deg, #fd424a, #ff8e53)',
          borderRadius: '2px',
          margin: '0 auto 24px',
        }} />

        {/* Body text */}
        <p style={{
          fontSize: '15.5px',
          color: 'rgba(255,255,255,0.72)',
          lineHeight: 1.75,
          margin: '0 0 10px',
          fontFamily: "'Trebuchet MS', sans-serif",
        }}>
          We've sent a verification link to
        </p>

        {email && (
          <div style={{
            display: 'inline-block',
            background: 'rgba(253,66,74,0.12)',
            border: '1px solid rgba(253,66,74,0.3)',
            borderRadius: '50px',
            padding: '8px 20px',
            marginBottom: '16px',
            fontSize: '15px',
            fontWeight: '700',
            color: '#ff8e8e',
            fontFamily: "'Courier New', monospace",
            letterSpacing: '0.3px',
          }}>
            {email}
          </div>
        )}

        <p style={{
          fontSize: '14.5px',
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.7,
          margin: '0 0 32px',
          fontFamily: "'Trebuchet MS', sans-serif",
        }}>
          Click the link in the email to activate your account and start your journey.
        </p>

        {/* Info box */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          textAlign: 'left',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: '2px' }}>
            <circle cx="12" cy="12" r="10" stroke="#ff8e53" strokeWidth="2"/>
            <path d="M12 8v4M12 16h.01" stroke="#ff8e53" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.5)',
            margin: 0,
            lineHeight: 1.6,
            fontFamily: "'Trebuchet MS', sans-serif",
          }}>
            Can't find it? Check your <strong style={{ color: 'rgba(255,255,255,0.75)' }}>spam or junk folder</strong>. The link expires in <strong style={{ color: 'rgba(255,255,255,0.75)' }}>15 minutes</strong>.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255,59,48,0.1)',
            border: '1px solid rgba(255,59,48,0.3)',
            borderRadius: '14px',
            padding: '12px 16px',
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            <p style={{
              fontSize: '13px',
              color: '#ff3b30',
              margin: 0,
              fontFamily: "'Trebuchet MS', sans-serif",
            }}>
              {error}
            </p>
          </div>
        )}

        {/* Resend button */}
        <button
          onClick={handleResend}
          disabled={resendCooldown > 0 || resendLoading}
          style={{
            width: '100%',
            padding: '15px',
            borderRadius: '50px',
            border: 'none',
            cursor: resendCooldown > 0 || resendLoading ? 'not-allowed' : 'pointer',
            background: resendDone
              ? 'linear-gradient(135deg, #22c55e, #16a34a)'
              : resendCooldown > 0
              ? 'rgba(255,255,255,0.08)'
              : 'linear-gradient(135deg, #fd424a, #ff8e53)',
            color: resendCooldown > 0 && !resendDone ? 'rgba(255,255,255,0.4)' : 'white',
            fontSize: '15px',
            fontWeight: '700',
            fontFamily: "'Trebuchet MS', sans-serif",
            letterSpacing: '0.3px',
            boxShadow: resendCooldown > 0 || resendLoading ? 'none' : '0 6px 24px rgba(253,66,74,0.4)',
            transition: 'all 0.3s ease',
            marginBottom: '16px',
          }}
        >
          {resendLoading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{
                width: '16px', height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.7s linear infinite',
              }} />
              Sending...
            </span>
          ) : resendDone ? (
            '✓ Email Sent!'
          ) : resendCooldown > 0 ? (
            `Resend in ${resendCooldown}s`
          ) : (
            'Resend Verification Email'
          )}
        </button>

        {/* Back to login */}
        <button
          onClick={() => navigate('/login')}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.35)',
            fontSize: '13.5px',
            cursor: 'pointer',
            fontFamily: "'Trebuchet MS', sans-serif",
            transition: 'color 0.2s',
            padding: '4px',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
        >
          ← Back to Login
        </button>
      </div>

      {/* CSS keyframes */}
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) rotate(0deg) scale(0.7); opacity: 0; }
          10%  { opacity: 0.85; }
          90%  { opacity: 0.5; }
          100% { transform: translateY(-105vh) rotate(360deg) scale(1.1); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(253,66,74,0.5); }
          50%       { box-shadow: 0 8px 48px rgba(253,66,74,0.8); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default VerifyEmailInfoPage;