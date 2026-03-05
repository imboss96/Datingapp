import React, { useState, useRef } from 'react';
import apiClient from '../services/apiClient';
import { UserProfile } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const FONT = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const INTERESTS_LIST = [
  { label: 'Travel',       icon: '✈️' },
  { label: 'Fitness',      icon: '💪' },
  { label: 'Music',        icon: '🎵' },
  { label: 'Art',          icon: '🎨' },
  { label: 'Food',         icon: '🍳' },
  { label: 'Gaming',       icon: '🎮' },
  { label: 'Reading',      icon: '📚' },
  { label: 'Sports',       icon: '⚽' },
  { label: 'Cooking',      icon: '🍽️' },
  { label: 'Photography',  icon: '📷' },
  { label: 'Dance',        icon: '💃' },
  { label: 'Hiking',       icon: '🥾' },
  { label: 'Movies',       icon: '🎬' },
  { label: 'Yoga',         icon: '🧘' },
  { label: 'Fashion',      icon: '👗' },
  { label: 'Technology',   icon: '💻' },
  { label: 'Pets',         icon: '🐾' },
  { label: 'Volunteering', icon: '🤝' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Shared styles
// ─────────────────────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%', padding: '13px 15px',
  border: '1.5px solid #EBEBEB', borderRadius: 14,
  fontSize: 14, color: '#111', background: '#fff',
  outline: 'none', boxSizing: 'border-box',
  fontFamily: FONT, transition: 'border-color 0.2s',
};

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700,
  color: '#999', marginBottom: 6, letterSpacing: 0.5,
  textTransform: 'uppercase',
};

const TABS = ['Profile', 'Photos', 'Interests'] as const;
type Tab = typeof TABS[number];

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface EditProfileModalProps {
  user: UserProfile;
  onClose: () => void;
  onSave: (updated: Partial<UserProfile>) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose, onSave }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab,      setActiveTab]      = useState<Tab>('Profile');
  const [username,       setUsername]       = useState(user.username || '');
  const [bio,            setBio]            = useState(user.bio || '');
  const [age,            setAge]            = useState(String(user.age || ''));
  const [location,       setLocation]       = useState(user.location || '');
  const [images,         setImages]         = useState<string[]>(user.images || []);
  const [interests,      setInterests]      = useState<string[]>(user.interests || []);
  const [saving,         setSaving]         = useState(false);
  const [uploading,      setUploading]      = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error,          setError]          = useState<string | null>(null);
  const [success,        setSuccess]        = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<'checking' | 'available' | 'taken' | null>(null);
  const [usernameTimer,  setUsernameTimer]  = useState<NodeJS.Timeout | null>(null);

  const checkUsername = (val: string) => {
    if (usernameTimer) clearTimeout(usernameTimer);
    if (!val || val.length < 3) { setUsernameStatus(null); return; }
    setUsernameStatus('checking');
    const t = setTimeout(async () => {
      try {
        const result = await apiClient.checkUsernameAvailable(val.toLowerCase(), user.id);
        setUsernameStatus(result.available ? 'available' : 'taken');
      } catch { setUsernameStatus(null); }
    }, 500);
    setUsernameTimer(t);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true); setUploadProgress(0); setError(null);
    try {
      const arr = Array.from(files);
      const urls = await Promise.all(arr.map(async (file, i) => {
        const res = await apiClient.uploadImage(file);
        setUploadProgress(Math.round(((i + 1) / arr.length) * 100));
        return res.imageUrl;
      }));
      setImages(prev => [...prev, ...urls]);
      setTimeout(() => setUploadProgress(0), 600);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true); setError(null); setSuccess(null);
    try {
      const updated = await apiClient.updateProfile(user.id, {
        username: username.trim().toLowerCase() || undefined,
        bio, age: parseInt(age), location, interests, images,
      });
      onSave(updated);
      setSuccess('Profile updated successfully!');
      setTimeout(() => { setSuccess(null); onClose(); }, 1400);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const tabIndex = TABS.indexOf(activeTab);

  return (
    /* Full-screen blurred overlay */
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      fontFamily: FONT,
      padding: 16,
    }}>

      {/* ── Phone outer shell ── */}
      <div style={{
        position: 'relative',
        width: '100%', maxWidth: 390,
        height: 'min(844px, calc(100dvh - 32px))',
        flexShrink: 0,
      }}>

        {/* Power button */}
        <div style={{
          position: 'absolute', right: -5, top: 160,
          width: 4, height: 66,
          background: 'linear-gradient(180deg,#d0d0d0,#b8b8b8)',
          borderRadius: '0 3px 3px 0',
          boxShadow: '2px 0 5px rgba(0,0,0,0.25)', zIndex: 10,
        }} />
        {/* Volume up */}
        <div style={{
          position: 'absolute', right: -5, top: 260,
          width: 4, height: 44,
          background: 'linear-gradient(180deg,#d0d0d0,#b8b8b8)',
          borderRadius: '0 3px 3px 0',
          boxShadow: '2px 0 5px rgba(0,0,0,0.25)', zIndex: 10,
        }} />
        {/* Volume down */}
        <div style={{
          position: 'absolute', right: -5, top: 316,
          width: 4, height: 44,
          background: 'linear-gradient(180deg,#d0d0d0,#b8b8b8)',
          borderRadius: '0 3px 3px 0',
          boxShadow: '2px 0 5px rgba(0,0,0,0.25)', zIndex: 10,
        }} />

        {/* ── White phone screen ── */}
        <div style={{
          width: '100%', height: '100%',
          borderRadius: 44, background: '#fff', overflow: 'hidden',
          boxShadow: '0 0 0 2px #C8C8C8, 0 0 0 3.5px #E8E8E8, 0 40px 100px rgba(0,0,0,0.55)',
          display: 'flex', flexDirection: 'column', position: 'relative',
        }}>

          {/* Dynamic Island */}
          <div style={{
            position: 'absolute', top: 12, left: '50%',
            transform: 'translateX(-50%)',
            width: 120, height: 34,
            background: '#111', borderRadius: 20, zIndex: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <div style={{ width: 10, height: 10, background: '#333', borderRadius: '50%', border: '1.5px solid #444' }} />
            <div style={{ width: 36, height: 8, background: '#222', borderRadius: 4 }} />
          </div>

          {/* Status bar */}
          <div style={{ height: 56, flexShrink: 0 }} />

          {/* ── Header ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 20px 0', flexShrink: 0,
          }}>
            <button onClick={onClose} style={{
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

            <h1 style={{ fontSize: 17, fontWeight: 800, color: '#111', margin: 0, letterSpacing: -0.3 }}>
              Edit Profile
            </h1>

            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '7px 16px', borderRadius: 20, border: 'none',
                background: 'linear-gradient(90deg,#FF4458,#FF7854)',
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1, fontFamily: FONT,
                boxShadow: '0 3px 10px rgba(255,68,88,0.35)',
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>

          {/* ── Tab bar ── */}
          <div style={{
            display: 'flex', gap: 0,
            padding: '14px 20px 0', flexShrink: 0,
          }}>
            {TABS.map((tab, i) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1, paddingBottom: 10, border: 'none', background: 'none',
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    color: active ? '#FF4458' : '#AAAAAA',
                    cursor: 'pointer', fontFamily: FONT,
                    borderBottom: active ? '2.5px solid #FF4458' : '2px solid #F0F0F0',
                    transition: 'all 0.2s',
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* ── Scrollable content ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 0', minHeight: 0 }}>

            {/* ── TAB: Profile ── */}
            {activeTab === 'Profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 16 }}>

                {/* Username */}
                <div>
                  <label style={lbl}>Username</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      style={{ ...inp, paddingRight: 40 }}
                      placeholder="e.g. cool_cat_99"
                      value={username}
                      onChange={e => {
                        const v = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
                        setUsername(v); checkUsername(v);
                      }}
                      maxLength={20}
                    />
                    <div style={{
                      position: 'absolute', right: 14, top: '50%',
                      transform: 'translateY(-50%)', fontSize: 13,
                    }}>
                      {usernameStatus === 'checking' && <span style={{ color: '#aaa' }}>⏳</span>}
                      {usernameStatus === 'available' && <span style={{ color: '#22c55e' }}>✓</span>}
                      {usernameStatus === 'taken'     && <span style={{ color: '#FF4458' }}>✗</span>}
                    </div>
                  </div>
                  <p style={{ fontSize: 11, marginTop: 4, color: usernameStatus === 'available' ? '#22c55e' : usernameStatus === 'taken' ? '#FF4458' : '#bbb' }}>
                    {usernameStatus === 'available' && '✓ Username available'}
                    {usernameStatus === 'taken'     && '✗ Already taken'}
                    {!usernameStatus && username.length > 0 && username.length < 3 && 'Min 3 characters'}
                  </p>
                </div>

                {/* Bio */}
                <div>
                  <label style={lbl}>Bio <span style={{ color: '#bbb', fontWeight: 400 }}>({bio.length}/500)</span></label>
                  <textarea
                    style={{ ...inp, minHeight: 100, resize: 'none', lineHeight: 1.6 }}
                    placeholder="Tell potential matches what makes you unique..."
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    maxLength={500}
                  />
                </div>

                {/* Age + Location row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={lbl}>Age</label>
                    <input
                      style={inp} type="number" min="18" max="120" placeholder="18+"
                      value={age} onChange={e => setAge(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={lbl}>Location</label>
                    <input
                      style={inp} placeholder="City, Country"
                      value={location} onChange={e => setLocation(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: Photos ── */}
            {activeTab === 'Photos' && (
              <div style={{ paddingBottom: 16 }}>

                {/* Upload button */}
                <input
                  ref={fileInputRef}
                  type="file" multiple accept="image/*,video/*"
                  style={{ display: 'none' }}
                  onChange={handleImageUpload}
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    width: '100%', padding: '13px 0',
                    borderRadius: 14, border: '2px dashed #FFBFC6',
                    background: 'linear-gradient(135deg,#fff5f6,#fff0f4)',
                    color: '#FF4458', fontSize: 14, fontWeight: 700,
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    fontFamily: FONT, marginBottom: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#FF4458,#FF7854)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 2v8M2 6h8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  {uploading ? `Uploading… ${uploadProgress}%` : 'Add Photos or Videos'}
                </button>

                {/* Progress bar */}
                {uploading && uploadProgress > 0 && (
                  <div style={{
                    height: 4, background: '#EBEBEB', borderRadius: 2,
                    overflow: 'hidden', marginBottom: 14,
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      background: 'linear-gradient(90deg,#FF4458,#FF7854)',
                      width: `${uploadProgress}%`,
                      transition: 'width 0.3s',
                    }} />
                  </div>
                )}

                {/* Photo grid */}
                {images.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {images.map((img, idx) => (
                      <div key={idx} style={{
                        position: 'relative', borderRadius: 16, overflow: 'hidden',
                        aspectRatio: '3/4', boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
                      }}>
                        <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        {idx === 0 && (
                          <span style={{
                            position: 'absolute', top: 7, left: 7,
                            background: 'linear-gradient(90deg,#FF4458,#FF7854)',
                            color: '#fff', fontSize: 8, fontWeight: 800,
                            padding: '2px 7px', borderRadius: 20, letterSpacing: 0.4,
                          }}>PRIMARY</span>
                        )}
                        <button
                          onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                          style={{
                            position: 'absolute', top: 7, right: 7,
                            width: 22, height: 22, borderRadius: '50%',
                            background: 'rgba(0,0,0,0.5)', color: '#fff',
                            border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 800,
                          }}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '32px 0', color: '#ccc',
                  }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: '50%',
                      background: '#FFF0F2', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                    }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFBFC6" strokeWidth="1.8" strokeLinecap="round">
                        <rect x="3" y="3" width="18" height="18" rx="4"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M21 15l-5-5L5 21"/>
                      </svg>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#bbb' }}>No photos yet</p>
                    <p style={{ fontSize: 12, color: '#ddd', marginTop: 4 }}>Add photos to attract more matches</p>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: Interests ── */}
            {activeTab === 'Interests' && (
              <div style={{ paddingBottom: 16 }}>
                <p style={{ fontSize: 12, color: '#bbb', marginBottom: 14 }}>
                  {interests.length} selected — tap to toggle
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {INTERESTS_LIST.map(({ label, icon }) => {
                    const active = interests.includes(label);
                    return (
                      <button
                        key={label}
                        onClick={() => setInterests(prev =>
                          prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
                        )}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '11px 13px', borderRadius: 14,
                          border: active ? 'none' : '1.5px solid #EBEBEB',
                          background: active
                            ? 'linear-gradient(135deg,#FF4458,#FF7854)'
                            : '#fff',
                          color: active ? '#fff' : '#1a1a1a',
                          cursor: 'pointer', fontFamily: FONT,
                          boxShadow: active
                            ? '0 4px 12px rgba(255,68,88,0.28)'
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
              </div>
            )}
          </div>

          {/* ── Feedback messages ── */}
          {(error || success) && (
            <div style={{
              margin: '0 20px 6px', padding: '9px 13px',
              background: error ? '#fff0f1' : '#f0fff4',
              border: `1px solid ${error ? '#ffc8cc' : '#a7f3c4'}`,
              borderRadius: 11, flexShrink: 0,
            }}>
              <p style={{ fontSize: 12, color: error ? '#d63244' : '#15803d', margin: 0 }}>
                {error || success}
              </p>
            </div>
          )}

          {/* ── Save button ── */}
          <div style={{ padding: '8px 20px 28px', flexShrink: 0 }}>
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              style={{
                width: '100%', padding: '15px 0', borderRadius: 50,
                border: 'none',
                background: 'linear-gradient(90deg,#FF4458 0%,#FF7854 100%)',
                color: '#fff', fontSize: 16, fontWeight: 700,
                cursor: (saving || uploading) ? 'not-allowed' : 'pointer',
                opacity: (saving || uploading) ? 0.7 : 1,
                boxShadow: '0 8px 24px rgba(255,68,88,0.38)',
                fontFamily: FONT, letterSpacing: 0.2,
                transition: 'transform 0.15s, opacity 0.2s',
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {saving ? 'Saving…' : uploading ? `Uploading ${uploadProgress}%…` : 'Save Changes'}
            </button>
          </div>

          {/* Home indicator */}
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
};

export default EditProfileModal;
