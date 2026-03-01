import React, { useState } from 'react';
import { useModerationAuth } from '../services/ModerationAuthContext';

interface ModerationLoginPageProps {
  onSwitchToSignup?: () => void;
  onLoginSuccess?: () => void;
}

const ModerationLoginPage: React.FC<ModerationLoginPageProps> = ({ onSwitchToSignup, onLoginSuccess }) => {
  const { login, error, isLoading, clearError } = useModerationAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!username.trim()) { setLocalError('Email is required'); return; }
    if (!password.trim()) { setLocalError('Password is required'); return; }
    setIsSubmitting(true);
    try {
      await login(username, password);
      onLoginSuccess?.();
    } catch {
      setLocalError(error || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = (id: string, hasError = false): React.CSSProperties => ({
    width: '100%',
    boxSizing: 'border-box' as const,
    background: '#f9fafb',
    border: `1.5px solid ${hasError ? '#ef4444' : focusedField === id ? '#1e3a5f' : '#e5e7eb'}`,
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '0.85rem',
    color: '#111827',
    outline: 'none',
    transition: 'border 0.2s, box-shadow 0.2s',
    boxShadow: focusedField === id ? '0 0 0 3px rgba(30,58,95,0.08)' : 'none',
    fontFamily: 'inherit',
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,400&family=Mulish:wght@400;500;600;700&display=swap');

        .login-page {
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

        .login-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 0% 0%, #1a4a6e 0%, transparent 50%),
            radial-gradient(ellipse at 100% 100%, #0f3550 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, #163d5a 0%, transparent 70%),
            linear-gradient(160deg, #0a1f35 0%, #0d3352 40%, #1a4a6e 70%, #0a2540 100%);
        }

        .login-swoosh1 {
          position: absolute;
          top: -20%; left: -10%;
          width: 70%; height: 80%;
          background: linear-gradient(135deg, rgba(20,80,120,0.5), rgba(10,50,90,0.3));
          border-radius: 0 0 60% 0;
          transform: rotate(-15deg);
        }

        .login-swoosh2 {
          position: absolute;
          bottom: -20%; right: -10%;
          width: 65%; height: 75%;
          background: linear-gradient(315deg, rgba(15,60,100,0.4), rgba(8,40,70,0.2));
          border-radius: 60% 0 0 0;
          transform: rotate(-15deg);
        }

        .login-swoosh3 {
          position: absolute;
          top: 20%; right: 5%;
          width: 40%; height: 60%;
          background: rgba(255,255,255,0.02);
          border-radius: 50%;
          transform: rotate(20deg) scaleX(0.6);
        }

        .login-card {
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

        .login-image-panel {
          width: 42%;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
        }

        .login-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(5,25,50,0.3) 0%, rgba(5,25,50,0.1) 100%);
        }

        .login-image-logo {
          position: absolute;
          top: 18px; right: 18px;
        }

        .login-logo-text {
          font-family: 'Fraunces', serif;
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.01em;
        }

        .login-logo-accent { color: #5bc4f5; }

        .login-panel-badge {
          position: absolute;
          top: 18px;
          left: 18px;
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

        .login-panel-stats {
          position: absolute;
          bottom: 5.5rem;
          left: 1.5rem;
          right: 1.5rem;
          display: flex;
          gap: 0.5rem;
        }

        .login-stat-chip {
          flex: 1;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          padding: 8px 6px;
          text-align: center;
          backdrop-filter: blur(4px);
        }

        .login-stat-num {
          font-family: 'Fraunces', serif;
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
          line-height: 1;
        }

        .login-stat-label {
          font-size: 9px;
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-top: 2px;
        }

        .login-form-panel {
          flex: 1;
          padding: 2rem 2.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow-y: auto;
        }

        .login-title {
          font-family: 'Fraunces', serif;
          font-size: 1.75rem;
          font-weight: 700;
          color: #1c1917;
          margin-bottom: 0.15rem;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .login-tagline {
          font-size: 0.78rem;
          font-weight: 600;
          color: #1e3a5f;
          margin-bottom: 0.2rem;
          letter-spacing: 0.01em;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .login-tagline-dot {
          display: inline-block;
          width: 5px;
          height: 5px;
          background: #5bc4f5;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .login-subtitle {
          font-size: 0.8rem;
          color: #9ca3af;
          margin-bottom: 1.25rem;
        }

        .login-two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.6rem;
        }

        .login-field { margin-bottom: 0.75rem; }

        .login-label {
          display: block;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: 5px;
        }

        .login-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }

        .login-forgot-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #1e3a5f;
          font-weight: 600;
          font-family: inherit;
          font-size: 10px;
          letter-spacing: 0.04em;
          padding: 0;
        }

        .login-btn {
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

        .login-btn:hover:not(:disabled) {
          background: #162d4a;
          transform: translateY(-1px);
          box-shadow: 0 5px 16px rgba(30,58,95,0.3);
        }

        .login-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .login-trust-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 0.6rem;
        }

        .login-trust-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          color: #9ca3af;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .login-trust-item i { color: #c5d0de; font-size: 9px; }

        .login-trust-sep {
          width: 3px;
          height: 3px;
          background: #e5e7eb;
          border-radius: 50%;
        }

        .login-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 1rem 0 0.5rem;
        }

        .login-divider-line { flex: 1; height: 1px; background: #f3f4f6; }

        .login-divider-text {
          font-size: 10px;
          color: #d1d5db;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 600;
        }

        .login-switch-text {
          font-size: 0.8rem;
          color: #6b7280;
          text-align: center;
        }

        .login-switch-link {
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

        .login-error {
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

        .login-spinner {
          animation: loginSpin 0.8s linear infinite;
          display: inline-block;
        }

        @keyframes loginSpin { to { transform: rotate(360deg); } }

        @media (max-width: 640px) {
          .login-image-panel { display: none; }
          .login-card { max-width: 420px; }
          .login-two-col { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="login-page">
        <div className="login-bg" />
        <div className="login-swoosh1" />
        <div className="login-swoosh2" />
        <div className="login-swoosh3" />

        <div className="login-card">
          {/* Left image panel */}
          <div className="login-image-panel">
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
            <div className="login-image-overlay" />

            {/* Top-left badge */}
            <div className="login-panel-badge">
              <i className="fa-solid fa-circle-check" style={{ marginRight: 4 }}></i>
              Moderator Portal
            </div>

            <div className="login-image-logo">
              <span className="login-logo-text">
                <span className="login-logo-accent">P</span>lug Auth
              </span>
            </div>

            {/* Stats row */}
            <div className="login-panel-stats">
              <div className="login-stat-chip">
                <div className="login-stat-num">12k+</div>
                <div className="login-stat-label">Moderators</div>
              </div>
              <div className="login-stat-chip">
                <div className="login-stat-num">$2M+</div>
                <div className="login-stat-label">Paid Out</div>
              </div>
              <div className="login-stat-chip">
                <div className="login-stat-num">4.9★</div>
                <div className="login-stat-label">Rating</div>
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
          <div className="login-form-panel">
            <h2 className="login-title">Login</h2>
            <p className="login-tagline">
              <span className="login-tagline-dot" />
              Earn while doing the task you love
            </p>
            <p className="login-subtitle">Sign in to access your moderation dashboard</p>

            {(localError || error) && (
              <div className="login-error">
                <i className="fa-solid fa-circle-exclamation"></i>
                {localError || error}
                <button onClick={() => { setLocalError(''); clearError(); }}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 12, padding: 0 }}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="login-two-col">
                <div className="login-field">
                  <label className="login-label">Email Address</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setLocalError(''); }}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter your email"
                    disabled={isSubmitting}
                    style={inputStyle('username')}
                  />
                </div>
                <div className="login-field" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <label className="login-label" style={{ visibility: 'hidden' }}>placeholder</label>
                  <div style={{
                    background: '#f0f7ff',
                    border: '1.5px solid #dbeafe',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '0.75rem',
                    color: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 600,
                  }}>
                    <i className="fa-solid fa-shield-halved" style={{ fontSize: 11 }}></i>
                    256-bit encrypted
                  </div>
                </div>
              </div>

              <div className="login-field">
                <div className="login-label-row">
                  <label className="login-label" style={{ margin: 0 }}>Password</label>
                  <button type="button" className="login-forgot-btn">Forgot Password?</button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setLocalError(''); }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                  style={inputStyle('password')}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#1e3a5f' }}
                />
                <label htmlFor="remember" style={{ fontSize: '0.8rem', color: '#6b7280', cursor: 'pointer' }}>Remember me</label>
              </div>

              <button type="submit" className="login-btn" disabled={isSubmitting || isLoading}>
                {isSubmitting || isLoading
                  ? <><span className="login-spinner"><i className="fa-solid fa-circle-notch"></i></span> Signing in...</>
                  : <><i className="fa-solid fa-arrow-right-to-bracket"></i> Log In</>
                }
              </button>
            </form>

            {/* Trust indicators */}
            <div className="login-trust-row">
              <span className="login-trust-item"><i className="fa-solid fa-lock"></i> Secure</span>
              <span className="login-trust-sep" />
              <span className="login-trust-item"><i className="fa-solid fa-user-shield"></i> Private</span>
              <span className="login-trust-sep" />
              <span className="login-trust-item"><i className="fa-solid fa-bolt"></i> Fast Payouts</span>
            </div>

            <div className="login-divider">
              <div className="login-divider-line" />
              <span className="login-divider-text">or</span>
              <div className="login-divider-line" />
            </div>

            <p className="login-switch-text">
              Don't have an account?{' '}
              <button className="login-switch-link" onClick={onSwitchToSignup}>Register</button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModerationLoginPage;