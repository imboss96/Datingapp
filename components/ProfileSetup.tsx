import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

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

const ProfileSetup: React.FC<ProfileSetupProps> = ({
  userId, name, email, profilePicture, onComplete, onCancel,
}) => {
  const navigate     = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step,               setStep]               = useState(0);
  const [gender,             setGender]             = useState<Gender>('');
  const [username,           setUsername]           = useState('');
  const [age,                setAge]                = useState('');
  const [location,           setLocation]           = useState('');
  const [latitude,           setLatitude]           = useState<number | null>(null);
  const [longitude,          setLongitude]          = useState<number | null>(null);
  const [bio,                setBio]                = useState('');
  const [uploadedImages,     setUploadedImages]     = useState<string[]>(profilePicture ? [profilePicture] : []);
  const [selectedInterests,  setSelectedInterests]  = useState<string[]>([]);
  const [loading,            setLoading]            = useState(false);
  const [error,              setError]              = useState('');

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lon } }) => {
        setLatitude(lat); setLongitude(lon);
        try {
          const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
          if (r.ok) {
            const d = await r.json();
            setLocation(d.city ? `${d.city}, ${d.countryName}` : d.countryName || `${lat.toFixed(2)}, ${lon.toFixed(2)}`);
          }
        } catch { setLocation(`${lat.toFixed(2)}, ${lon.toFixed(2)}`); }
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
    if (step === 0 && !gender)                              { setError('Please select your gender'); return; }
    if (step === 1 && (!username || username.length < 3))   { setError('Username must be at least 3 characters'); return; }
    if (step === 1 && (!age || parseInt(age) < 18))         { setError('You must be at least 18'); return; }
    if (step === 1 && !location)                            { setError('Please enter your location'); return; }
    if (step === 3 && uploadedImages.length === 0)          { setError('Please add at least one photo'); return; }
    setStep(s => s + 1);
  };

  const goBack = () => {
    setError('');
    if (step === 0) { onCancel?.(); return; }
    setStep(s => s - 1);
  };

  const toggleInterest = (label: string) => {
    setSelectedInterests(prev =>
      prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImages(prev => prev.length < 6 ? [...prev, reader.result as string] : prev);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx: number) => setUploadedImages(prev => prev.filter((_, i) => i !== idx));

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
      if (latitude !== null && longitude !== null) updateData.coordinates = [longitude, latitude];
      const updatedUser = await apiClient.updateProfile(userId, updateData);
      onComplete(updatedUser);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  // ── Shared shell ────────────────────────────────────────────────────────────

  const Shell: React.FC<{
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    onContinue: () => void;
    continueLabel?: string;
  }> = ({ title, subtitle, children, onContinue, continueLabel = 'Continue' }) => (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', maxWidth: 430, margin: '0 auto',
      background: '#fff', position: 'relative', overflow: 'hidden',
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '52px 20px 0' }}>
        {/* Back button */}
        <button
          onClick={goBack}
          style={{
            width: 38, height: 38, borderRadius: 12,
            border: '1.5px solid #f0f0f0', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
          }}
        >
          <svg width="9" height="15" viewBox="0 0 9 15" fill="none">
            <path d="M8 1L1.5 7.5L8 14" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Skip */}
        <button
          onClick={() => step < TOTAL_STEPS - 1 ? goNext() : handleSubmit()}
          style={{ background: 'none', border: 'none', color: '#FF4458', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}
        >
          Skip
        </button>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, padding: '20px 24px 0', alignItems: 'center' }}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 7, borderRadius: 4,
              width: i === step ? 24 : 7,
              background: i <= step
                ? 'linear-gradient(90deg, #FF4458, #FF7B54)'
                : '#F0F0F0',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Title */}
      <div style={{ padding: '24px 24px 0' }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: '#111', margin: 0, letterSpacing: -0.5, lineHeight: 1.15 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 14, color: '#999', margin: '10px 0 0', lineHeight: 1.55, fontWeight: 400 }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
        {children}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          margin: '0 24px 8px', padding: '10px 14px',
          background: '#fff0f1', border: '1px solid #ffc8cc',
          borderRadius: 12, color: '#d63244', fontSize: 13,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Continue button */}
      <div style={{ padding: '8px 24px 40px', flexShrink: 0 }}>
        <button
          onClick={onContinue}
          disabled={loading}
          style={{
            width: '100%', padding: '18px 0', borderRadius: 50,
            border: 'none',
            background: 'linear-gradient(90deg, #FF4458 0%, #FF7854 100%)',
            color: '#fff', fontSize: 16, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.75 : 1,
            boxShadow: '0 8px 28px rgba(255,68,88,0.38)',
            fontFamily: 'inherit', letterSpacing: 0.2,
            transition: 'transform 0.15s, opacity 0.2s',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {loading ? 'Saving...' : continueLabel}
        </button>
      </div>
    </div>
  );

  // ── Step 0: I am a ──────────────────────────────────────────────────────────

  if (step === 0) return (
    <Shell title="I am a" onContinue={goNext}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 36 }}>
        {[
          { label: 'Woman', value: 'Woman' as Gender },
          { label: 'Man',   value: 'Man'   as Gender },
          { label: 'Choose another', value: 'Other' as Gender },
        ].map(({ label, value }) => {
          const selected = gender === value;
          const isOther  = value === 'Other';
          return (
            <button
              key={value}
              onClick={() => setGender(value)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '18px 20px', borderRadius: 18,
                border: selected ? 'none' : '1.5px solid #f0f0f0',
                background: selected
                  ? 'linear-gradient(90deg, #FF4458, #FF7854)'
                  : '#fff',
                color: selected ? '#fff' : '#1a1a1a',
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: selected
                  ? '0 6px 20px rgba(255,68,88,0.28)'
                  : '0 1px 6px rgba(0,0,0,0.04)',
                transition: 'all 0.18s',
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 500 }}>{label}</span>

              {!isOther ? (
                /* Check circle */
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: selected ? 'rgba(255,255,255,0.28)' : '#f4f4f4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s',
                }}>
                  {selected && (
                    <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
                      <path d="M1.5 5l3.5 4L11.5 1" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              ) : (
                /* Chevron right */
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
                  <path d="M1 1l6 6-6 6" stroke={selected ? '#fff' : '#bbb'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
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
    <Shell title="Your details" subtitle="Tell us a bit about yourself." onContinue={goNext}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 28 }}>
        <div>
          <label style={lbl}>Full name</label>
          <input style={{ ...inp, background: '#f8f8f8', color: '#aaa' }} value={name} disabled />
        </div>
        <div>
          <label style={lbl}>Username <span style={{ color: '#FF4458' }}>*</span></label>
          <input style={inp} placeholder="e.g. cool_cat_99" value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>Age <span style={{ color: '#FF4458' }}>*</span></label>
            <input style={inp} type="number" min="18" max="100" placeholder="18+" value={age} onChange={e => setAge(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Location <span style={{ color: '#FF4458' }}>*</span></label>
            <input style={inp} placeholder="City, Country" value={location} onChange={e => setLocation(e.target.value)} />
          </div>
        </div>
      </div>
    </Shell>
  );

  // ── Step 2: Bio ─────────────────────────────────────────────────────────────

  if (step === 2) return (
    <Shell title="About you" subtitle="Write a short bio that shows your personality." onContinue={goNext}>
      <div style={{ marginTop: 28 }}>
        <label style={lbl}>Bio</label>
        <textarea
          style={{ ...inp, minHeight: 150, resize: 'none', lineHeight: 1.65 }}
          placeholder="Tell potential matches what makes you unique..."
          value={bio}
          onChange={e => setBio(e.target.value)}
          maxLength={500}
        />
        <p style={{ fontSize: 12, color: '#ccc', marginTop: 6, textAlign: 'right' }}>{bio.length}/500</p>
      </div>
    </Shell>
  );

  // ── Step 3: Photos ──────────────────────────────────────────────────────────

  if (step === 3) return (
    <Shell
      title="Add Your Best Photos"
      subtitle="Add your best photos to get a higher amount of daily matches."
      onContinue={goNext}
    >
      <input
        ref={fileInputRef}
        type="file" multiple accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 14, marginTop: 28,
      }}>
        {Array.from({ length: 4 }).map((_, idx) => {
          const img = uploadedImages[idx];
          return img ? (
            /* Filled photo cell */
            <div
              key={idx}
              style={{
                position: 'relative', borderRadius: 20, overflow: 'hidden',
                aspectRatio: '3/4', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              }}
            >
              <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {idx === 0 && (
                <span style={{
                  position: 'absolute', top: 10, left: 10,
                  background: '#FF4458', color: '#fff',
                  fontSize: 9, fontWeight: 800, letterSpacing: 0.6,
                  padding: '3px 8px', borderRadius: 20,
                }}>PRIMARY</span>
              )}
              <button
                onClick={() => removeImage(idx)}
                style={{
                  position: 'absolute', top: 10, right: 10,
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.45)', color: '#fff',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                }}
              >✕</button>
            </div>
          ) : (
            /* Empty add cell */
            <button
              key={idx}
              onClick={() => fileInputRef.current?.click()}
              style={{
                aspectRatio: '3/4', borderRadius: 20,
                border: '2px dashed #FFBFC6',
                background: 'linear-gradient(135deg, #fff5f6 0%, #fff0f4 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Pink + circle */}
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF4458, #FF7854)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(255,68,88,0.38)',
              }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M11 4v14M4 11h14" stroke="#fff" strokeWidth="2.8" strokeLinecap="round"/>
                </svg>
              </div>
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 12, color: '#ccc', textAlign: 'center', marginTop: 16 }}>
        Tap + to add photos or videos
      </p>
    </Shell>
  );

  // ── Step 4: Interests ───────────────────────────────────────────────────────

  return (
    <Shell
      title="Your interests"
      subtitle="Select a few of your interests and let everyone know what you're passionate about."
      onContinue={handleSubmit}
      continueLabel={loading ? 'Saving...' : 'Continue'}
    >
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 10, marginTop: 24, paddingBottom: 16,
      }}>
        {INTERESTS.map(({ label, icon }) => {
          const active = selectedInterests.includes(label);
          return (
            <button
              key={label}
              onClick={() => toggleInterest(label)}
              style={{
                display: 'flex', alignItems: 'center',
                padding: '14px 16px', borderRadius: 18,
                border: active ? 'none' : '1.5px solid #F0F0F0',
                background: active
                  ? 'linear-gradient(135deg, #FF4458, #FF7854)'
                  : '#fff',
                color: active ? '#fff' : '#1a1a1a',
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: active
                  ? '0 6px 20px rgba(255,68,88,0.3)'
                  : '0 1px 5px rgba(0,0,0,0.05)',
                transition: 'all 0.18s',
                gap: 10,
              }}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
            </button>
          );
        })}
      </div>
    </Shell>
  );
};

// ── Shared input / label styles ─────────────────────────────────────────────

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700,
  color: '#888', marginBottom: 7, letterSpacing: 0.5,
  textTransform: 'uppercase',
};

const inp: React.CSSProperties = {
  width: '100%', padding: '14px 16px',
  border: '1.5px solid #f0f0f0', borderRadius: 14,
  fontSize: 15, color: '#111', background: '#fff',
  outline: 'none', boxSizing: 'border-box',
  fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
};

export default ProfileSetup;