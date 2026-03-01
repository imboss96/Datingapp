import React, { useState } from 'react';
import ChatModerationView, { ModeratorChat, Message } from './ChatModerationView';
import StandaloneModeratorDashboard from './StandaloneModeratorDashboard';
import { ModerationAuthProvider, useModerationAuth } from '../services/ModerationAuthContext';
import ModerationLoginPage from './ModerationLoginPage';
import ModerationSignupPage from './ModerationSignupPage';

const ModerationAuthenticatedView: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout, accountType } = useModerationAuth();

  React.useEffect(() => {
    if (!isAuthenticated) {
      // Handle logout
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d2137' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ color: '#5bc4f5', fontSize: '2rem' }}></i>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '1rem', fontFamily: 'Mulish, sans-serif', fontSize: '0.85rem' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <StandaloneModeratorDashboard />;
  }

  return null;
};

const ModerationAuthPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useModerationAuth();
  const [currentPage, setCurrentPage] = useState<'landing' | 'login' | 'signup'>('landing');

  if (isAuthenticated && !isLoading) {
    return <ModerationAuthenticatedView />;
  }

  if (isLoading) {
    return (
      <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d2137' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ color: '#5bc4f5', fontSize: '2rem' }}></i>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '1rem', fontFamily: 'Mulish, sans-serif', fontSize: '0.85rem' }}>Authenticating...</p>
        </div>
      </div>
    );
  }

  if (currentPage === 'login') {
    return (
      <ModerationLoginPage
        onSwitchToSignup={() => setCurrentPage('signup')}
        onLoginSuccess={() => setCurrentPage('landing')}
      />
    );
  }

  if (currentPage === 'signup') {
    return (
      <ModerationSignupPage
        onSwitchToLogin={() => setCurrentPage('login')}
        onSignupSuccess={() => setCurrentPage('landing')}
      />
    );
  }

  // Landing page — styled to match login/signup
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,400&family=Mulish:wght@400;500;600;700&display=swap');

        .landing-page {
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

        .landing-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 0% 0%, #1a4a6e 0%, transparent 50%),
            radial-gradient(ellipse at 100% 100%, #0f3550 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, #163d5a 0%, transparent 70%),
            linear-gradient(160deg, #0a1f35 0%, #0d3352 40%, #1a4a6e 70%, #0a2540 100%);
        }

        .landing-swoosh1 {
          position: absolute;
          top: -20%; left: -10%;
          width: 70%; height: 80%;
          background: linear-gradient(135deg, rgba(20,80,120,0.5), rgba(10,50,90,0.3));
          border-radius: 0 0 60% 0;
          transform: rotate(-15deg);
        }

        .landing-swoosh2 {
          position: absolute;
          bottom: -20%; right: -10%;
          width: 65%; height: 75%;
          background: linear-gradient(315deg, rgba(15,60,100,0.4), rgba(8,40,70,0.2));
          border-radius: 60% 0 0 0;
          transform: rotate(-15deg);
        }

        .landing-swoosh3 {
          position: absolute;
          top: 20%; right: 5%;
          width: 40%; height: 60%;
          background: rgba(255,255,255,0.02);
          border-radius: 50%;
          transform: rotate(20deg) scaleX(0.6);
        }

        .landing-card {
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
        .landing-image-panel {
          width: 42%;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
        }

        .landing-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(5,25,50,0.3) 0%, rgba(5,25,50,0.1) 100%);
        }

        .landing-panel-badge {
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

        .landing-image-logo {
          position: absolute;
          top: 18px; right: 18px;
        }

        .landing-logo-text {
          font-family: 'Fraunces', serif;
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.01em;
        }

        .landing-logo-accent { color: #5bc4f5; }

        .landing-panel-stats {
          position: absolute;
          bottom: 5.5rem;
          left: 1.5rem;
          right: 1.5rem;
          display: flex;
          gap: 0.5rem;
        }

        .landing-stat-chip {
          flex: 1;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          padding: 8px 6px;
          text-align: center;
          backdrop-filter: blur(4px);
        }

        .landing-stat-num {
          font-family: 'Fraunces', serif;
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
          line-height: 1;
        }

        .landing-stat-label {
          font-size: 9px;
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-top: 2px;
        }

        /* ── Right form panel ── */
        .landing-form-panel {
          flex: 1;
          padding: 2rem 2.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .landing-title {
          font-family: 'Fraunces', serif;
          font-size: 1.75rem;
          font-weight: 700;
          color: #1c1917;
          margin-bottom: 0.15rem;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .landing-tagline {
          font-size: 0.78rem;
          font-weight: 600;
          color: #1e3a5f;
          margin-bottom: 0.2rem;
          letter-spacing: 0.01em;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .landing-tagline-dot {
          display: inline-block;
          width: 5px;
          height: 5px;
          background: #5bc4f5;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .landing-subtitle {
          font-size: 0.8rem;
          color: #9ca3af;
          margin-bottom: 1.5rem;
        }

        /* CTA buttons */
        .landing-btn-primary {
          width: 100%;
          background: #1e3a5f;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 12px;
          font-size: 0.875rem;
          font-weight: 700;
          font-family: 'Mulish', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 7px;
          letter-spacing: 0.02em;
          margin-bottom: 0.6rem;
        }

        .landing-btn-primary:hover {
          background: #162d4a;
          transform: translateY(-1px);
          box-shadow: 0 5px 16px rgba(30,58,95,0.3);
        }

        .landing-btn-secondary {
          width: 100%;
          background: #f0fdf4;
          color: #166534;
          border: 1.5px solid #bbf7d0;
          border-radius: 8px;
          padding: 12px;
          font-size: 0.875rem;
          font-weight: 700;
          font-family: 'Mulish', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 7px;
          letter-spacing: 0.02em;
        }

        .landing-btn-secondary:hover {
          background: #dcfce7;
          border-color: #86efac;
          transform: translateY(-1px);
          box-shadow: 0 5px 16px rgba(22,101,52,0.12);
        }

        .landing-btn-label {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Info cards */
        .landing-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.6rem;
          margin-top: 1.25rem;
        }

        .landing-info-card {
          border-radius: 10px;
          padding: 12px 14px;
        }

        .landing-info-card-blue {
          background: #eff6ff;
          border: 1px solid #dbeafe;
        }

        .landing-info-card-green {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
        }

        .landing-info-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 5px;
        }

        .landing-info-title-blue { color: #1e40af; }
        .landing-info-title-green { color: #166534; }

        .landing-info-text {
          font-size: 0.72rem;
          line-height: 1.5;
        }

        .landing-info-text-blue { color: #1e40af; opacity: 0.8; }
        .landing-info-text-green { color: #166534; opacity: 0.8; }

        /* Trust row */
        .landing-trust-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 1.25rem;
          padding-top: 1rem;
          border-top: 1px solid #f3f4f6;
        }

        .landing-trust-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          color: #9ca3af;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .landing-trust-item i { color: #c5d0de; font-size: 9px; }

        .landing-trust-sep {
          width: 3px;
          height: 3px;
          background: #e5e7eb;
          border-radius: 50%;
        }

        @media (max-width: 640px) {
          .landing-image-panel { display: none; }
          .landing-card { max-width: 420px; }
          .landing-info-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="landing-page">
        <div className="landing-bg" />
        <div className="landing-swoosh1" />
        <div className="landing-swoosh2" />
        <div className="landing-swoosh3" />

        <div className="landing-card">
          {/* Left image panel */}
          <div className="landing-image-panel">
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
            <div className="landing-image-overlay" />

            <div className="landing-panel-badge">
              <i className="fa-solid fa-shield-halved" style={{ marginRight: 4 }}></i>
              Moderation Portal
            </div>

            <div className="landing-image-logo">
              <span className="landing-logo-text">
                <span className="landing-logo-accent">P</span>lug Auth
              </span>
            </div>

            <div className="landing-panel-stats">
              <div className="landing-stat-chip">
                <div className="landing-stat-num">12k+</div>
                <div className="landing-stat-label">Moderators</div>
              </div>
              <div className="landing-stat-chip">
                <div className="landing-stat-num">$2M+</div>
                <div className="landing-stat-label">Paid Out</div>
              </div>
              <div className="landing-stat-chip">
                <div className="landing-stat-num">4.9★</div>
                <div className="landing-stat-label">Rating</div>
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

          {/* Right panel */}
          <div className="landing-form-panel">
            <h2 className="landing-title">Welcome Back</h2>
            <p className="landing-tagline">
              <span className="landing-tagline-dot" />
              Earn while doing the task you love
            </p>
            <p className="landing-subtitle">Choose how you'd like to access the platform</p>

            <button className="landing-btn-primary" onClick={() => setCurrentPage('login')}>
              <span className="landing-btn-label">
                <i className="fa-solid fa-arrow-right-to-bracket"></i>
                Sign In as Moderator
              </span>
              <i className="fa-solid fa-arrow-right" style={{ fontSize: 12, opacity: 0.7 }}></i>
            </button>

            <button className="landing-btn-secondary" onClick={() => setCurrentPage('signup')}>
              <span className="landing-btn-label">
                <i className="fa-solid fa-user-plus"></i>
                Create New Account
              </span>
              <i className="fa-solid fa-arrow-right" style={{ fontSize: 12, opacity: 0.5 }}></i>
            </button>

            <div className="landing-info-grid">
              <div className="landing-info-card landing-info-card-blue">
                <p className="landing-info-title landing-info-title-blue">
                  <i className="fa-solid fa-check-circle"></i>
                  Existing Users
                </p>
                <p className="landing-info-text landing-info-text-blue">
                  Use your Spark app credentials to access your dashboard instantly.
                </p>
              </div>
              <div className="landing-info-card landing-info-card-green">
                <p className="landing-info-title landing-info-title-green">
                  <i className="fa-solid fa-plus-circle"></i>
                  New Users
                </p>
                <p className="landing-info-text landing-info-text-green">
                  Create an independent account with email and password to get started.
                </p>
              </div>
            </div>

            <div className="landing-trust-row">
              <span className="landing-trust-item"><i className="fa-solid fa-lock"></i> Secure</span>
              <span className="landing-trust-sep" />
              <span className="landing-trust-item"><i className="fa-solid fa-user-shield"></i> Private</span>
              <span className="landing-trust-sep" />
              <span className="landing-trust-item"><i className="fa-solid fa-bolt"></i> Fast Payouts</span>
              <span className="landing-trust-sep" />
              <span className="landing-trust-item"><i className="fa-solid fa-clock"></i> Real-time</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const ModerationTestPage: React.FC = () => {
  return (
    <ModerationAuthProvider>
      <ModerationAuthPage />
    </ModerationAuthProvider>
  );
};

export default ModerationTestPage;