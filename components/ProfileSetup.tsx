import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

// ─────────────────────────────────────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────────────────────────────────────

interface ProfileSetupProps {
  userId: string;
  name: string;
  email: string;
  profilePicture?: string;
  onComplete: (userData: any) => void;
  onCancel?: () => void;
}

type Gender = 'Woman' | 'Man' | 'Other' | '';

const INTERESTS = [
  { label: 'Photography', icon: '📷' },
  { label: 'Shopping',    icon: '🛍️' },
  { label: 'Karaoke',     icon: '🎤' },
  { label: 'Yoga',        icon: '🧘' },
  { label: 'Cooking',     icon: '🍳' },
  { label: 'Tennis',      icon: '🎾' },
  { label: 'Run',         icon: '🏃' },
  { label: 'Swimming',    icon: '🏊' },
  { label: 'Art',         icon: '🎨' },
  { label: 'Traveling',   icon: '✈️' },
  { label: 'Extreme',     icon: '🪂' },
  { label: 'Music',       icon: '🎵' },
  { label: 'Drink',       icon: '🍷' },
  { label: 'Video games', icon: '🎮' },
];

const TOTAL_STEPS = 5;
const FONT = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// ─────────────────────────────────────────────────────────────────────────────
// Shared styles — module-level so identity never changes between renders
// ─────────────────────────────────────────────────────────────────────────────

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700,
  color: '#888', marginBottom: 7, letterSpacing: 0.5,
  textTransform: 'uppercase',
};

const inp: React.CSSProperties = {
  width: '100%', padding: '14px 16px',
  border: '1.5px solid #EBEBEB', borderRadius: 14,
  fontSize: 15, color: '#111', background: '#fff',
  outline: 'none', boxSizing: 'border-box',
  fontFamily: FONT,
  transition: 'border-color 0.2s',
};

// ─────────────────────────────────────────────────────────────────────────────
// Shell — defined OUTSIDE ProfileSetup so its identity never changes.
// Defining components inside another component causes them to unmount+remount
// on every render, which is why inputs lost focus after the first keystroke.
// ─────────────────────────────────────────────────────────────────────────────

interface ShellProps {
  step: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  error: string;
  loading: boolean;
  onBack: () => void;
  onSkip: () => void;
  onContinue: () => void;
  continueLabel?: string;
}

const Shell: React.FC<ShellProps> = ({
  step, title, subtitle, children, error, loading,
  onBack, onSkip, onContinue, continueLabel = 'Continue',
}) => (
  /* Full-screen blurred overlay */
  <div style={{
    position: 'fixed', inset: 0, zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    fontFamily: FONT,
    padding: '16px',
  }}>

    {/* ── Phone outer shell ── */}
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: 390,
      height: 'min(844px, calc(100dvh - 32px))',
      flexShrink: 0,
    }}>

      {/* Power button (right side) */}
      <div style={{
        position: 'absolute', right: -5, top: 160,
        width: 4, height: 66,
        background: 'linear-gradient(180deg, #d0d0d0, #b8b8b8)',
        borderRadius: '0 3px 3px 0',
        boxShadow: '2px 0 5px rgba(0,0,0,0.25)',
        zIndex: 10,
      }} />

      {/* Volume up button (right side) */}
      <div style={{
        position: 'absolute', right: -5, top: 260,
        width: 4, height: 44,
        background: 'linear-gradient(180deg, #d0d0d0, #b8b8b8)',
        borderRadius: '0 3px 3px 0',
        boxShadow: '2px 0 5px rgba(0,0,0,0.25)',
        zIndex: 10,
      }} />

      {/* Volume down button (right side) */}
      <div style={{
        position: 'absolute', right: -5, top: 316,
        width: 4, height: 44,
        background: 'linear-gradient(180deg, #d0d0d0, #b8b8b8)',
        borderRadius: '0 3px 3px 0',
        boxShadow: '2px 0 5px rgba(0,0,0,0.25)',
        zIndex: 10,
      }} />

      {/* ── White phone screen ── */}
      <div style={{
        width: '100%', height: '100%',
        borderRadius: 44,
        background: '#fff',
        overflow: 'hidden',
        boxShadow: '0 0 0 2px #C8C8C8, 0 0 0 3.5px #E8E8E8, 0 40px 100px rgba(0,0,0,0.55)',
        display: 'flex', flexDirection: 'column',
        position: 'relative',
      }}>

        {/* Dynamic Island / Notch */}
        <div style={{
          position: 'absolute', top: 12, left: '50%',
          transform: 'translateX(-50%)',
          width: 120, height: 34,
          background: '#111',
          borderRadius: 20,
          zIndex: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8,
        }}>
          <div style={{ width: 10, height: 10, background: '#333', borderRadius: '50%', border: '1.5px solid #444' }} />
          <div style={{ width: 36, height: 8, background: '#222', borderRadius: 4 }} />
        </div>

        {/* Status bar spacer */}
        <div style={{ height: 56, flexShrink: 0 }} />

        {/* Top bar: back + skip */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 20px 0', flexShrink: 0,
        }}>
          <button onClick={onBack} style={{
            width: 36, height: 36, borderRadius: 11,
            border: '1.5px solid #EBEBEB', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          }}>
            <svg width="9" height="14" viewBox="0 0 9 14" fill="none">
              <path d="M8 1L1.5 7L8 13" stroke="#222" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <button onClick={onSkip} style={{
            background: 'none', border: 'none',
            color: '#FF4458', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: FONT,
          }}>
            Skip
          </button>
        </div>

        {/* Progress dots */}
        <div style={{
          display: 'flex', gap: 5, padding: '12px 20px 0',
          alignItems: 'center', flexShrink: 0,
        }}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} style={{
              height: 6, borderRadius: 3,
              width: i === step ? 22 : 6,
              background: i <= step
                ? 'linear-gradient(90deg,#FF4458,#FF7B54)'
                : '#EBEBEB',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        {/* Title */}
        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
          <h1 style={{
            fontSize: 26, fontWeight: 800, color: '#111',
            margin: 0, letterSpacing: -0.5, lineHeight: 1.15,
          }}>{title}</h1>
          {subtitle && (
            <p style={{
              fontSize: 13, color: '#999', margin: '7px 0 0',
              lineHeight: 1.5, fontWeight: 400,
            }}>{subtitle}</p>
          )}
        </div>

        {/* Scrollable content area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px', minHeight: 0 }}>
          {children}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            margin: '0 20px 6px', padding: '8px 12px',
            background: '#fff0f1', border: '1px solid #ffc8cc',
            borderRadius: 10, color: '#d63244', fontSize: 12, flexShrink: 0,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Continue button */}
        <div style={{ padding: '8px 20px 16px', flexShrink: 0 }}>
          <button
            onClick={onContinue}
            disabled={loading}
            style={{
              width: '100%', padding: '15px 0', borderRadius: 50,
              border: 'none',
              background: 'linear-gradient(90deg,#FF4458 0%,#FF7854 100%)',
              color: '#fff', fontSize: 16, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              boxShadow: '0 8px 24px rgba(255,68,88,0.38)',
              fontFamily: FONT, letterSpacing: 0.2,
              transition: 'transform 0.15s, opacity 0.2s',
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {loading ? 'Saving...' : continueLabel}
          </button>
        </div>

        {/* Home indicator bar */}
        <div style={{
          height: 24, display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <div style={{ width: 110, height: 4, background: '#DCDCDC', borderRadius: 2 }} />
        </div>

      </div>{/* end phone screen */}
    </div>{/* end phone outer */}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const ProfileSetup: React.FC<ProfileSetupProps> = ({
  userId, name, email, profilePicture, onComplete, onCancel,
}) => {
  const navigate     = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step,              setStep]              = useState(0);
  const [gender,            setGender]            = useState<Gender>('');
  const [username,          setUsername]          = useState('');
  const [age,               setAge]               = useState('');
  const [location,          setLocation]          = useState('');
  const [latitude,          setLatitude]          = useState<number | null>(null);
  const [longitude,         setLongitude]         = useState<number | null>(null);
  const [bio,               setBio]               = useState('');
  const [uploadedImages,    setUploadedImages]    = useState<string[]>(profilePicture ? [profilePicture] : []);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState('');

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lon } }) => {
        setLatitude(lat); setLongitude(lon);
        try {
          const r = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
          );
          if (r.ok) {
            const d = await r.json();
            setLocation(d.city ? `${d.city}, ${d.countryName}` : d.countryName || `${lat.toFixed(2)},${lon.toFixed(2)}`);
          }
        } catch { setLocation(`${lat.toFixed(2)},${lon.toFixed(2)}`); }
      },
      () => {
        fetch('https://ipapi.co/json/').then(r => r.json()).then(d => {
          setLocation(d.city && d.country_name ? `${d.city}, ${d.country_name}` : '');
        }).catch(() => {});
      }
    );
  }, []);

  const goNext = () => {
    setError('');
    if (step === 0 && !gender)                            { setError('Please select your gender'); return; }
    if (step === 1 && (!username || username.length < 3)) { setError('Username must be at least 3 characters'); return; }
    if (step === 1 && (!age || parseInt(age) < 18))       { setError('You must be at least 18'); return; }
    if (step === 1 && !location)                          { setError('Please enter your location'); return; }
    if (step === 3 && uploadedImages.length === 0)        { setError('Please add at least one photo'); return; }
    setStep(s => s + 1);
  };

  const goBack = () => {
    setError('');
    if (step === 0) { onCancel?.(); return; }
    setStep(s => s - 1);
  };

  const toggleInterest = (label: string) =>
    setSelectedInterests(prev =>
      prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
    );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () =>
        setUploadedImages(prev => prev.length < 6 ? [...prev, reader.result as string] : prev);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx: number) =>
    setUploadedImages(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (selectedInterests.length === 0) { setError('Please select at least one interest'); return; }
    setLoading(true); setError('');
    try {
      const updateData: any = {
        username, name, age: parseInt(age), bio, location, gender,
        interests: selectedInterests,
        images: uploadedImages,
        profilePicture: uploadedImages[0] || profilePicture,
      };
      if (latitude !== null && longitude !== null)
        updateData.coordinates = [longitude, latitude];
      const updatedUser = await apiClient.updateProfile(userId, updateData);
      onComplete(updatedUser);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const shell = {
    step, error, loading,
    onBack: goBack,
    onSkip: () => step < TOTAL_STEPS - 1 ? goNext() : handleSubmit(),
  };

  // ── Step 0: I am a ──────────────────────────────────────────────────────────

  if (step === 0) return (
    <Shell {...shell} title="I am a" onContinue={goNext}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
        {([
          { label: 'Woman',          value: 'Woman' as Gender },
          { label: 'Man',            value: 'Man'   as Gender },
          { label: 'Choose another', value: 'Other' as Gender },
        ]).map(({ label, value }) => {
          const selected = gender === value;
          const isOther  = value === 'Other';
          return (
            <button
              key={value}
              onClick={() => setGender(value)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '15px 16px', borderRadius: 14,
                border: selected ? 'none' : '1.5px solid #EBEBEB',
                background: selected
                  ? 'linear-gradient(90deg,#FF4458,#FF7854)'
                  : '#fff',
                color: selected ? '#fff' : '#1a1a1a',
                cursor: 'pointer', fontFamily: FONT,
                boxShadow: selected
                  ? '0 6px 18px rgba(255,68,88,0.28)'
                  : '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'all 0.18s',
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 500 }}>{label}</span>
              {!isOther ? (
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: selected ? 'rgba(255,255,255,0.28)' : '#F4F4F4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {selected && (
                    <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                      <path d="M1 4.5l3.2 3.5L11 1" stroke="#fff" strokeWidth="2.2"
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              ) : (
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                  <path d="M1 1l5 5L1 11" stroke={selected ? '#fff' : '#bbb'}
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </Shell>
  );

  // ── Step 1: Basics ──────────────────────────────────────────────────────────

  if (step === 1) return (
    <Shell {...shell} title="Your details" subtitle="Tell us a bit about yourself." onContinue={goNext}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
        <div>
          <label style={lbl}>Full name</label>
          <input style={{ ...inp, background: '#f8f8f8', color: '#aaa' }} value={name} disabled />
        </div>
        <div>
          <label style={lbl}>Username <span style={{ color: '#FF4458' }}>*</span></label>
          <input
            style={inp}
            placeholder="e.g. cool_cat_99"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>Age <span style={{ color: '#FF4458' }}>*</span></label>
            <input
              style={inp}
              type="number" min="18" max="100" placeholder="18+"
              value={age}
              onChange={e => setAge(e.target.value)}
            />
          </div>
          <div>
            <label style={lbl}>Location <span style={{ color: '#FF4458' }}>*</span></label>
            <input
              style={inp}
              placeholder="City, Country"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>
        </div>
      </div>
    </Shell>
  );

  // ── Step 2: Bio ─────────────────────────────────────────────────────────────

  if (step === 2) return (
    <Shell {...shell} title="About you" subtitle="Write a short bio that shows your personality." onContinue={goNext}>
      <div style={{ marginTop: 20 }}>
        <label style={lbl}>Bio</label>
        <textarea
          style={{ ...inp, minHeight: 130, resize: 'none', lineHeight: 1.6 }}
          placeholder="Tell potential matches what makes you unique..."
          value={bio}
          onChange={e => setBio(e.target.value)}
          maxLength={500}
        />
        <p style={{ fontSize: 11, color: '#ccc', marginTop: 4, textAlign: 'right' }}>{bio.length}/500</p>
      </div>
    </Shell>
  );

  // ── Step 3: Photos ──────────────────────────────────────────────────────────

  if (step === 3) return (
    <Shell
      {...shell}
      title="Add Your Best Photos"
      subtitle="Add your best photos to get more daily matches."
      onContinue={goNext}
    >
      <input
        ref={fileInputRef}
        type="file" multiple accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
        {Array.from({ length: 4 }).map((_, idx) => {
          const img = uploadedImages[idx];
          return img ? (
            <div key={idx} style={{
              position: 'relative', borderRadius: 16, overflow: 'hidden',
              aspectRatio: '3/4', boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            }}>
              <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {idx === 0 && (
                <span style={{
                  position: 'absolute', top: 7, left: 7,
                  background: '#FF4458', color: '#fff',
                  fontSize: 8, fontWeight: 800, letterSpacing: 0.5,
                  padding: '2px 6px', borderRadius: 20,
                }}>PRIMARY</span>
              )}
              <button onClick={() => removeImage(idx)} style={{
                position: 'absolute', top: 7, right: 7,
                width: 22, height: 22, borderRadius: '50%',
                background: 'rgba(0,0,0,0.45)', color: '#fff',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700,
              }}>✕</button>
            </div>
          ) : (
            <button key={idx} onClick={() => fileInputRef.current?.click()} style={{
              aspectRatio: '3/4', borderRadius: 16,
              border: '2px dashed #FFBFC6',
              background: 'linear-gradient(135deg,#fff5f6,#fff0f4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'linear-gradient(135deg,#FF4458,#FF7854)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 5px 14px rgba(255,68,88,0.38)',
              }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 3v12M3 9h12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: '#ccc', textAlign: 'center', marginTop: 10 }}>
        Tap + to add photos or videos
      </p>
    </Shell>
  );

  // ── Step 4: Interests ───────────────────────────────────────────────────────

  return (
    <Shell
      {...shell}
      title="Your interests"
      subtitle="Select a few interests to let others know what you're passionate about."
      onContinue={handleSubmit}
      continueLabel={loading ? 'Saving...' : 'Continue'}
    >
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 8, marginTop: 18, paddingBottom: 10,
      }}>
        {INTERESTS.map(({ label, icon }) => {
          const active = selectedInterests.includes(label);
          return (
            <button
              key={label}
              onClick={() => toggleInterest(label)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '11px 12px', borderRadius: 14,
                border: active ? 'none' : '1.5px solid #EBEBEB',
                background: active
                  ? 'linear-gradient(135deg,#FF4458,#FF7854)'
                  : '#fff',
                color: active ? '#fff' : '#1a1a1a',
                cursor: 'pointer', fontFamily: FONT,
                boxShadow: active
                  ? '0 5px 14px rgba(255,68,88,0.3)'
                  : '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.18s',
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
            </button>
          );
        })}
      </div>
    </Shell>
  );
};

export default ProfileSetup;