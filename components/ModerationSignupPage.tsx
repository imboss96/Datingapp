import React, { useState } from 'react';
import { useModerationAuth } from '../services/ModerationAuthContext';

interface ModerationSignupPageProps {
  onSwitchToLogin?: () => void;
  onSignupSuccess?: () => void;
}

// Field component extracted outside to prevent re-definition on every render
interface FieldProps {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  fieldKey: 'name' | 'email' | 'username' | 'password' | 'passwordConfirmation';
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  error?: string;
  disabled: boolean;
  focusedField: string | null;
  inputStyle: (id: string, hasErr: boolean) => React.CSSProperties;
}

const Field: React.FC<FieldProps> = ({
  id, label, type, placeholder, value, onChange,
  onFocus, onBlur, error, disabled, focusedField, inputStyle
}) => (
  <div style={{ marginBottom: '0.75rem' }}>
    <label style={{
      display: 'block', fontSize: '10px', fontWeight: 600,
      letterSpacing: '0.08em', textTransform: 'uppercase' as const,
      color: '#6b7280', marginBottom: '5px'
    }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
      style={inputStyle(id, !!error)}
    />
    {error && (
      <p style={{ fontSize: '10px', color: '#ef4444', marginTop: '3px', fontWeight: 500 }}>
        {error}
      </p>
    )}
  </div>
);

const ModerationSignupPage: React.FC<ModerationSignupPageProps> = ({ onSwitchToLogin, onSignupSuccess }) => {
  const { register, error, isLoading, clearError } = useModerationAuth();
  const [formData, setFormData] = useState({
    name: '', email: '', username: '', password: '', passwordConfirmation: ''
  });
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = 'Required';
    if (!formData.email.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Invalid email';
    if (!formData.username.trim()) e.username = 'Required';
    else if (formData.username.length < 3) e.username = 'Min 3 chars';
    if (!formData.password) e.password = 'Required';
    else if (formData.password.length < 8) e.password = 'Min 8 chars';
    if (!formData.passwordConfirmation) e.passwordConfirmation = 'Required';
    else if (formData.password !== formData.passwordConfirmation) e.passwordConfirmation = 'No match';
    setLocalErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (localErrors[field]) setLocalErrors(prev => { const u = { ...prev }; delete u[field]; return u; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await register(formData.email, formData.username, formData.password, formData.passwordConfirmation, formData.name);
      onSignupSuccess?.();
    } catch {}
    finally { setIsSubmitting(false); }
  };

  const inputStyle = (id: string, hasErr = false): React.CSSProperties => ({
    width: '100%',
    boxSizing: 'border-box' as const,
    background: '#f9fafb',
    border: `1.5px solid ${hasErr ? '#ef4444' : focusedField === id ? '#1e3a5f' : '#e5e7eb'}`,
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

        .signup-page {
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

        .signup-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 0% 0%, #1a4a6e 0%, transparent 50%),
            radial-gradient(ellipse at 100% 100%, #0f3550 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, #163d5a 0%, transparent 70%),
            linear-gradient(160deg, #0a1f35 0%, #0d3352 40%, #1a4a6e 70%, #0a2540 100%);
        }

        .signup-swoosh1 {
          position: absolute;
          top: -20%; left: -10%;
          width: 70%; height: 80%;
          background: linear-gradient(135deg, rgba(20,80,120,0.5), rgba(10,50,90,0.3));
          border-radius: 0 0 60% 0;
          transform: rotate(-15deg);
        }

        .signup-swoosh2 {
          position: absolute;
          bottom: -20%; right: -10%;
          width: 65%; height: 75%;
          background: linear-gradient(315deg, rgba(15,60,100,0.4), rgba(8,40,70,0.2));
          border-radius: 60% 0 0 0;
          transform: rotate(-15deg);
        }

        .signup-swoosh3 {
          position: absolute;
          top: 20%; right: 5%;
          width: 40%; height: 60%;
          background: rgba(255,255,255,0.02);
          border-radius: 50%;
          transform: rotate(20deg) scaleX(0.6);
        }

        .signup-card {
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

        .signup-image-panel {
          width: 42%;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
        }

        .signup-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(5,25,50,0.3) 0%, rgba(5,25,50,0.1) 100%);
        }

        .signup-image-logo {
          position: absolute;
          top: 18px; right: 18px;
        }

        .signup-logo-text {
          font-family: 'Fraunces', serif;
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.01em;
        }

        .signup-logo-accent { color: #5bc4f5; }

        .signup-panel-badge {
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

        .signup-panel-stats {
          position: absolute;
          bottom: 5.5rem;
          left: 1.5rem;
          right: 1.5rem;
          display: flex;
          gap: 0.5rem;
        }

        .signup-stat-chip {
          flex: 1;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          padding: 8px 6px;
          text-align: center;
          backdrop-filter: blur(4px);
        }

        .signup-stat-num {
          font-family: 'Fraunces', serif;
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
          line-height: 1;
        }

        .signup-stat-label {
          font-size: 9px;
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-top: 2px;
        }

        .signup-form-panel {
          flex: 1;
          padding: 2rem 2.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow-y: auto;
        }

        .signup-title {
          font-family: 'Fraunces', serif;
          font-size: 1.75rem;
          font-weight: 700;
          color: #1c1917;
          margin-bottom: 0.15rem;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .signup-tagline {
          font-size: 0.78rem;
          font-weight: 600;
          color: #1e3a5f;
          margin-bottom: 0.2rem;
          letter-spacing: 0.01em;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .signup-tagline-dot {
          display: inline-block;
          width: 5px;
          height: 5px;
          background: #5bc4f5;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .signup-subtitle {
          font-size: 0.8rem;
          color: #9ca3af;
          margin-bottom: 1.25rem;
        }

        .signup-two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.6rem;
        }

        .signup-btn {
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

        .signup-btn:hover:not(:disabled) {
          background: #162d4a;
          transform: translateY(-1px);
          box-shadow: 0 5px 16px rgba(30,58,95,0.3);
        }

        .signup-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .signup-trust-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 0.6rem;
        }

        .signup-trust-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          color: #9ca3af;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .signup-trust-item i { color: #c5d0de; font-size: 9px; }

        .signup-trust-sep {
          width: 3px;
          height: 3px;
          background: #e5e7eb;
          border-radius: 50%;
        }

        .signup-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 1rem 0 0.5rem;
        }

        .signup-divider-line { flex: 1; height: 1px; background: #f3f4f6; }

        .signup-divider-text {
          font-size: 10px;
          color: #d1d5db;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 600;
        }

        .signup-switch-text {
          font-size: 0.8rem;
          color: #6b7280;
          text-align: center;
        }

        .signup-switch-link {
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

        .signup-error {
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

        .signup-spinner {
          animation: signupSpin 0.8s linear infinite;
          display: inline-block;
        }

        @keyframes signupSpin { to { transform: rotate(360deg); } }

        @media (max-width: 640px) {
          .signup-image-panel { display: none; }
          .signup-card { max-width: 420px; }
          .signup-two-col { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="signup-page">
        <div className="signup-bg" />
        <div className="signup-swoosh1" />
        <div className="signup-swoosh2" />
        <div className="signup-swoosh3" />

        <div className="signup-card">
          {/* Left image panel */}
          <div className="signup-image-panel">
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
            <div className="signup-image-overlay" />

            {/* Top-left badge */}
            <div className="signup-panel-badge">
              <i className="fa-solid fa-star" style={{ marginRight: 4 }}></i>
              Join Today
            </div>

            <div className="signup-image-logo">
              <span className="signup-logo-text">
                <span className="signup-logo-accent">P</span>lug Auth
              </span>
            </div>

            {/* Stats row */}
            <div className="signup-panel-stats">
              <div className="signup-stat-chip">
                <div className="signup-stat-num">12k+</div>
                <div className="signup-stat-label">Moderators</div>
              </div>
              <div className="signup-stat-chip">
                <div className="signup-stat-num">$2M+</div>
                <div className="signup-stat-label">Paid Out</div>
              </div>
              <div className="signup-stat-chip">
                <div className="signup-stat-num">4.9★</div>
                <div className="signup-stat-label">Rating</div>
              </div>
            </div>

            <div style={{
              position: 'absolute', bottom: '1.5rem', left: '1.5rem', right: '1.5rem',
              color: 'rgba(255,255,255,0.7)', lineHeight: 1.6
            }}>
              <p style={{ fontFamily: 'Fraunces, serif', fontSize: '1.05rem', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                Join the team.<br /><em>Make an impact.</em>
              </p>
              <p style={{ fontSize: '0.7rem', opacity: 0.55 }}>Secure moderation platform</p>
            </div>
          </div>

          {/* Right form panel */}
          <div className="signup-form-panel">
            <h2 className="signup-title">Register</h2>
            <p className="signup-tagline">
              <span className="signup-tagline-dot" />
              Earn while doing the task you love
            </p>
            <p className="signup-subtitle">Create your moderation account</p>

            {error && (
              <div className="signup-error">
                <i className="fa-solid fa-circle-exclamation"></i>
                {error}
                <button onClick={clearError}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 12, padding: 0 }}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="signup-two-col">
                <Field 
                  id="s-name" label="Name" type="text" placeholder="Enter your name" 
                  fieldKey="name" value={formData.name} onChange={(v) => handleChange('name', v)}
                  onFocus={() => setFocusedField('s-name')} onBlur={() => setFocusedField(null)}
                  error={localErrors.name} disabled={isSubmitting} focusedField={focusedField} inputStyle={inputStyle}
                />
                <Field 
                  id="s-email" label="Email Address" type="email" placeholder="Enter your email" 
                  fieldKey="email" value={formData.email} onChange={(v) => handleChange('email', v)}
                  onFocus={() => setFocusedField('s-email')} onBlur={() => setFocusedField(null)}
                  error={localErrors.email} disabled={isSubmitting} focusedField={focusedField} inputStyle={inputStyle}
                />
              </div>

              <Field 
                id="s-username" label="Username" type="text" placeholder="Choose a username" 
                fieldKey="username" value={formData.username} onChange={(v) => handleChange('username', v)}
                onFocus={() => setFocusedField('s-username')} onBlur={() => setFocusedField(null)}
                error={localErrors.username} disabled={isSubmitting} focusedField={focusedField} inputStyle={inputStyle}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
                <input type="checkbox" id="remember-me" style={{ accentColor: '#1e3a5f' }} />
                <label htmlFor="remember-me" style={{ fontSize: '0.8rem', color: '#6b7280', cursor: 'pointer' }}>Remember me</label>
              </div>

              <div className="signup-two-col">
                <Field 
                  id="s-password" label="Password" type="password" placeholder="Min 8 characters" 
                  fieldKey="password" value={formData.password} onChange={(v) => handleChange('password', v)}
                  onFocus={() => setFocusedField('s-password')} onBlur={() => setFocusedField(null)}
                  error={localErrors.password} disabled={isSubmitting} focusedField={focusedField} inputStyle={inputStyle}
                />
                <Field 
                  id="s-confirm" label="Confirm Password" type="password" placeholder="Re-enter password" 
                  fieldKey="passwordConfirmation" value={formData.passwordConfirmation} onChange={(v) => handleChange('passwordConfirmation', v)}
                  onFocus={() => setFocusedField('s-confirm')} onBlur={() => setFocusedField(null)}
                  error={localErrors.passwordConfirmation} disabled={isSubmitting} focusedField={focusedField} inputStyle={inputStyle}
                />
              </div>

              <button type="submit" className="signup-btn" disabled={isSubmitting || isLoading}>
                {isSubmitting || isLoading
                  ? <><span className="signup-spinner"><i className="fa-solid fa-circle-notch"></i></span> Creating Account...</>
                  : <><i className="fa-solid fa-user-plus"></i> Register Now</>
                }
              </button>
            </form>

            {/* Trust indicators */}
            <div className="signup-trust-row">
              <span className="signup-trust-item"><i className="fa-solid fa-lock"></i> Secure</span>
              <span className="signup-trust-sep" />
              <span className="signup-trust-item"><i className="fa-solid fa-user-shield"></i> Private</span>
              <span className="signup-trust-sep" />
              <span className="signup-trust-item"><i className="fa-solid fa-bolt"></i> Fast Payouts</span>
            </div>

            <div className="signup-divider">
              <div className="signup-divider-line" />
              <span className="signup-divider-text">or</span>
              <div className="signup-divider-line" />
            </div>

            <p className="signup-switch-text">
              Already have an account?{' '}
              <button className="signup-switch-link" onClick={onSwitchToLogin}>Login</button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModerationSignupPage;