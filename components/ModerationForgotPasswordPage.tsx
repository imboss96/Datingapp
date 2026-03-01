import React, { useState } from 'react';
import { useModerationAuth } from '../services/ModerationAuthContext';

interface ModerationForgotPasswordPageProps {
  onSwitchToLogin?: () => void;
  onResetSuccess?: () => void;
}

const ModerationForgotPasswordPage: React.FC<ModerationForgotPasswordPageProps> = ({ onSwitchToLogin, onResetSuccess }) => {
  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!email.trim()) { setLocalError('Email address is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setLocalError('Please enter a valid email address'); return; }
    setIsSubmitting(true);
    try {
      // TODO: wire up actual reset call, e.g. await resetPassword(email)
      await new Promise(res => setTimeout(res, 1200)); // simulate API
      setIsSuccess(true);
      onResetSuccess?.();
    } catch {
      setLocalError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: '#f9fafb',
    border: `1.5px solid ${localError ? '#ef4444' : focusedField === 'email' ? '#1e3a5f' : '#e5e7eb'}`,
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '0.85rem',
    color: '#111827',
    outline: 'none',
    transition: 'border 0.2s, box-shadow 0.2s',
    boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(30,58,95,0.08)' : 'none',
    fontFamily: 'inherit',
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,400&family=Mulish:wght@400;500;600;700&display=swap');

        .fp-page {
          min-height: 100vh;
          width: 100%;
          font-family: 'Mulish', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          background: #0d2137;
        }

        .fp-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 0% 0%, #1a4a6e 0%, transparent 50%),
            radial-gradient(ellipse at 100% 100%, #0f3550 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, #163d5a 0%, transparent 70%),
            linear-gradient(160deg, #0a1f35 0%, #0d3352 40%, #1a4a6e 70%, #0a2540 100%);
        }

        .fp-swoosh1 {
          position: absolute;
          top: -20%; left: -10%;
          width: 70%; height: 80%;
          background: linear-gradient(135deg, rgba(20,80,120,0.5), rgba(10,50,90,0.3));
          border-radius: 0 0 60% 0;
          transform: rotate(-15deg);
        }

        .fp-swoosh2 {
          position: absolute;
          bottom: -20%; right: -10%;
          width: 65%; height: 75%;
          background: linear-gradient(315deg, rgba(15,60,100,0.4), rgba(8,40,70,0.2));
          border-radius: 60% 0 0 0;
          transform: rotate(-15deg);
        }

        .fp-swoosh3 {
          position: absolute;
          top: 20%; right: 5%;
          width: 40%; height: 60%;
          background: rgba(255,255,255,0.02);
          border-radius: 50%;
          transform: rotate(20deg) scaleX(0.6);
        }

        .fp-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 860px;
          margin: 1.5rem;
          background: #fff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 30px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05);
          display: flex;
          min-height: 520px;
        }

        /* ── Left panel ── */
        .fp-image-panel {
          width: 42%;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
        }

        .fp-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(5,25,50,0.3) 0%, rgba(5,25,50,0.1) 100%);
        }

        .fp-panel-badge {
          position: absolute;
          top: 18px; left: 18px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 20px;
          padding: 4px 10px;
          font-size: 10px;
          font-weight: 700;
          color: #5bc4f5;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          backdrop-filter: blur(4px);
        }

        .fp-image-logo {
          position: absolute;
          top: 18px; right: 18px;
        }

        .fp-logo-text {
          font-family: 'Fraunces', serif;
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.01em;
        }

        .fp-logo-accent { color: #5bc4f5; }

        .fp-panel-steps {
          position: absolute;
          bottom: 5.5rem;
          left: 1.5rem;
          right: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .fp-step {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          padding: 8px 10px;
          backdrop-filter: blur(4px);
        }

        .fp-step-num {
          width: 18px;
          height: 18px;
          background: rgba(91,196,245,0.25);
          border: 1px solid rgba(91,196,245,0.4);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 700;
          color: #5bc4f5;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .fp-step-text {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.6);
          line-height: 1.4;
        }

        .fp-step-text strong {
          color: rgba(255,255,255,0.9);
          font-weight: 600;
          display: block;
          font-size: 0.72rem;
          margin-bottom: 1px;
        }

        /* ── Right form panel ── */
        .fp-form-panel {
          flex: 1;
          padding: 2rem 2.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .fp-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.75rem;
          font-weight: 600;
          color: #9ca3af;
          padding: 0;
          margin-bottom: 1.25rem;
          transition: color 0.15s;
          letter-spacing: 0.02em;
        }

        .fp-back-btn:hover { color: #1e3a5f; }

        .fp-icon-wrap {
          width: 44px;
          height: 44px;
          background: #eff6ff;
          border: 1.5px solid #dbeafe;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .fp-title {
          font-family: 'Fraunces', serif;
          font-size: 1.75rem;
          font-weight: 700;
          color: #1c1917;
          margin-bottom: 0.15rem;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .fp-tagline {
          font-size: 0.78rem;
          font-weight: 600;
          color: #1e3a5f;
          margin-bottom: 0.2rem;
          letter-spacing: 0.01em;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .fp-tagline-dot {
          display: inline-block;
          width: 5px;
          height: 5px;
          background: #5bc4f5;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .fp-subtitle {
          font-size: 0.8rem;
          color: #9ca3af;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .fp-label {
          display: block;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: 5px;
        }

        .fp-field { margin-bottom: 0.75rem; }

        .fp-hint {
          font-size: 0.72rem;
          color: #9ca3af;
          margin-top: 5px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .fp-btn {
          width: 100%;
          background: #1e3a5f;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 11px;
          font-size: 0.875rem;
          font-weight: 700;
          font-family: 'Mulish', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          letter-spacing: 0.02em;
          margin-top: 0.25rem;
        }

        .fp-btn:hover:not(:disabled) {
          background: #162d4a;
          transform: translateY(-1px);
          box-shadow: 0 5px 16px rgba(30,58,95,0.3);
        }

        .fp-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .fp-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 9px 12px;
          font-size: 0.78rem;
          color: #dc2626;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Success state */
        .fp-success-wrap {
          text-align: center;
          padding: 1rem 0;
        }

        .fp-success-icon {
          width: 56px;
          height: 56px;
          background: #f0fdf4;
          border: 2px solid #bbf7d0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
        }

        .fp-success-title {
          font-family: 'Fraunces', serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1c1917;
          margin-bottom: 0.5rem;
          letter-spacing: -0.02em;
        }

        .fp-success-text {
          font-size: 0.82rem;
          color: #6b7280;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        .fp-success-email-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          border-radius: 20px;
          padding: 5px 12px;
          font-size: 0.78rem;
          font-weight: 600;
          color: #1e40af;
          margin-bottom: 1.5rem;
        }

        .fp-success-btn {
          width: 100%;
          background: #1e3a5f;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 11px;
          font-size: 0.875rem;
          font-weight: 700;
          font-family: 'Mulish', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          letter-spacing: 0.02em;
        }

        .fp-success-btn:hover {
          background: #162d4a;
          transform: translateY(-1px);
          box-shadow: 0 5px 16px rgba(30,58,95,0.3);
        }

        /* Trust / divider */
        .fp-trust-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 0.75rem;
        }

        .fp-trust-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          color: #9ca3af;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .fp-trust-item i { color: #c5d0de; font-size: 9px; }

        .fp-trust-sep {
          width: 3px;
          height: 3px;
          background: #e5e7eb;
          border-radius: 50%;
        }

        .fp-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 1rem 0 0.5rem;
        }

        .fp-divider-line { flex: 1; height: 1px; background: #f3f4f6; }

        .fp-divider-text {
          font-size: 10px;
          color: #d1d5db;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 600;
        }

        .fp-switch-text {
          font-size: 0.8rem;
          color: #6b7280;
          text-align: center;
        }

        .fp-switch-link {
          color: #1e3a5f;
          font-weight: 700;
          cursor: pointer;
          background: none;
          border: none;
          font-family: inherit;
          font-size: inherit;
          padding: 0;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .fp-spinner {
          animation: fpSpin 0.8s linear infinite;
          display: inline-block;
        }

        @keyframes fpSpin { to { transform: rotate(360deg); } }

        @media (max-width: 640px) {
          .fp-image-panel { display: none; }
          .fp-card { max-width: 420px; }
        }
      `}</style>

      <div className="fp-page">
        <div className="fp-bg" />
        <div className="fp-swoosh1" />
        <div className="fp-swoosh2" />
        <div className="fp-swoosh3" />

        <div className="fp-card">
          {/* Left image panel */}
          <div className="fp-image-panel">
            <div style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(160deg, #0d4060 0%, #1a6a4a 50%, #2a8060 80%, #1a4a30 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="220" height="300" viewBox="0 0 240 320" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.88 }}>
                <ellipse cx="120" cy="310" rx="50" ry="8" fill="rgba(0,0,0,0.2)" />
                <rect x="110" y="220" width="20" height="90" fill="#2d1a0a" rx="4"/>
                <ellipse cx="120" cy="160" rx="80" ry="90" fill="#1a6a4a"/>
                <ellipse cx="120" cy="140" rx="72" ry="80" fill="#1e7a52"/>
                <ellipse cx="85" cy="155" rx="55" ry="65" fill="#1a7050"/>
                <ellipse cx="155" cy="150" rx="50" ry="60" fill="#156040"/>
                <ellipse cx="120" cy="110" rx="65" ry="75" fill="#208055"/>
                <ellipse cx="100" cy="120" rx="50" ry="60" fill="#1d7850"/>
                <ellipse cx="140" cy="115" rx="48" ry="58" fill="#1a7048"/>
                <ellipse cx="105" cy="100" rx="30" ry="35" fill="rgba(100,220,160,0.15)"/>
                <ellipse cx="130" cy="90" rx="25" ry="30" fill="rgba(120,240,180,0.1)"/>
                <rect x="40" y="298" width="160" height="22" rx="8" fill="#1a3a20" opacity="0.5"/>
              </svg>
            </div>
            <div className="fp-image-overlay" />

            <div className="fp-panel-badge">
              <i className="fa-solid fa-key" style={{ marginRight: 4 }}></i>
              Password Reset
            </div>

            <div className="fp-image-logo">
              <span className="fp-logo-text">
                <span className="fp-logo-accent">P</span>lug Auth
              </span>
            </div>

            {/* How it works steps */}
            <div className="fp-panel-steps">
              <div className="fp-step">
                <div className="fp-step-num">1</div>
                <div className="fp-step-text">
                  <strong>Enter your email</strong>
                  We'll look up your account
                </div>
              </div>
              <div className="fp-step">
                <div className="fp-step-num">2</div>
                <div className="fp-step-text">
                  <strong>Check your inbox</strong>
                  A reset link is sent to you
                </div>
              </div>
              <div className="fp-step">
                <div className="fp-step-num">3</div>
                <div className="fp-step-text">
                  <strong>Set a new password</strong>
                  Back in action in seconds
                </div>
              </div>
            </div>

            <div style={{
              position: 'absolute', bottom: '1.5rem', left: '1.5rem', right: '1.5rem',
              color: 'rgba(255,255,255,0.7)', lineHeight: 1.6
            }}>
              <p style={{ fontFamily: 'Fraunces, serif', fontSize: '1.05rem', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                Moderate. Earn.<br /><em>Make an impact.</em>
              </p>
              <p style={{ fontSize: '0.7rem', opacity: 0.55 }}>Secure moderation platform</p>
            </div>
          </div>

          {/* Right form panel */}
          <div className="fp-form-panel">

            {!isSuccess ? (
              <>
                <button className="fp-back-btn" onClick={onSwitchToLogin}>
                  <i className="fa-solid fa-arrow-left" style={{ fontSize: 10 }}></i>
                  Back to Login
                </button>

                <div className="fp-icon-wrap">
                  <i className="fa-solid fa-lock-open" style={{ color: '#3b82f6', fontSize: '1.1rem' }}></i>
                </div>

                <h2 className="fp-title">Forgot Password?</h2>
                <p className="fp-tagline">
                  <span className="fp-tagline-dot" />
                  Earn while doing the task you love
                </p>
                <p className="fp-subtitle">
                  No worries — enter your email and we'll send you a secure reset link right away.
                </p>

                {localError && (
                  <div className="fp-error">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    {localError}
                    <button onClick={() => setLocalError('')}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 12, padding: 0 }}>
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="fp-field">
                    <label className="fp-label">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setLocalError(''); }}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Enter your registered email"
                      disabled={isSubmitting}
                      style={inputStyle}
                    />
                    <p className="fp-hint">
                      <i className="fa-solid fa-circle-info" style={{ color: '#93c5fd', fontSize: 10 }}></i>
                      We'll only send a link if this email is registered.
                    </p>
                  </div>

                  <button type="submit" className="fp-btn" disabled={isSubmitting}>
                    {isSubmitting
                      ? <><span className="fp-spinner"><i className="fa-solid fa-circle-notch"></i></span> Sending Reset Link...</>
                      : <><i className="fa-solid fa-paper-plane"></i> Send Reset Link</>
                    }
                  </button>
                </form>

                <div className="fp-trust-row" style={{ marginTop: '0.75rem' }}>
                  <span className="fp-trust-item"><i className="fa-solid fa-lock"></i> Secure</span>
                  <span className="fp-trust-sep" />
                  <span className="fp-trust-item"><i className="fa-solid fa-clock"></i> Link expires in 15 min</span>
                  <span className="fp-trust-sep" />
                  <span className="fp-trust-item"><i className="fa-solid fa-shield-halved"></i> Encrypted</span>
                </div>

                <div className="fp-divider">
                  <div className="fp-divider-line" />
                  <span className="fp-divider-text">or</span>
                  <div className="fp-divider-line" />
                </div>

                <p className="fp-switch-text">
                  Remembered it?{' '}
                  <button className="fp-switch-link" onClick={onSwitchToLogin}>Back to Login</button>
                </p>
              </>
            ) : (
              /* ── Success state ── */
              <div className="fp-success-wrap">
                <div className="fp-success-icon">
                  <i className="fa-solid fa-envelope-circle-check" style={{ color: '#16a34a', fontSize: '1.4rem' }}></i>
                </div>

                <h2 className="fp-success-title">Check Your Inbox</h2>
                <p className="fp-success-text">
                  We've sent a password reset link to your email address. It may take a moment to arrive — check your spam folder too.
                </p>

                <div className="fp-success-email-chip">
                  <i className="fa-solid fa-envelope" style={{ fontSize: 11 }}></i>
                  {email}
                </div>

                <button className="fp-success-btn" onClick={onSwitchToLogin}>
                  <i className="fa-solid fa-arrow-right-to-bracket"></i>
                  Back to Login
                </button>

                <div className="fp-trust-row" style={{ marginTop: '1rem' }}>
                  <span className="fp-trust-item"><i className="fa-solid fa-clock"></i> Expires in 15 min</span>
                  <span className="fp-trust-sep" />
                  <span className="fp-trust-item"><i className="fa-solid fa-rotate"></i> Resend if needed</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ModerationForgotPasswordPage;