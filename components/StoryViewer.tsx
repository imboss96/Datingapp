import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Story {
  id: string;
  imageUrl: string;
  duration?: number; // ms, default 5000
}

export interface StoryUser {
  id: string;
  name: string;
  avatar: string;
  stories: Story[];
}

interface StoryViewerProps {
  users: StoryUser[];           // all users with stories
  initialUserIndex?: number;    // which user to start on
  onClose: () => void;
  onReply?: (userId: string, message: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const FONT = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const DEFAULT_DURATION = 5000;

// ─────────────────────────────────────────────────────────────────────────────
// StoryViewer
// ─────────────────────────────────────────────────────────────────────────────

const StoryViewer: React.FC<StoryViewerProps> = ({
  users,
  initialUserIndex = 0,
  onClose,
  onReply,
}) => {
  const [userIndex,    setUserIndex]    = useState(initialUserIndex);
  const [storyIndex,   setStoryIndex]   = useState(0);
  const [progress,     setProgress]     = useState(0);       // 0-100
  const [paused,       setPaused]       = useState(false);
  const [message,      setMessage]      = useState('');
  const [sending,      setSending]      = useState(false);
  const [sent,         setSent]         = useState(false);
  const [imgLoaded,    setImgLoaded]    = useState(false);

  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef  = useRef<number>(0);
  const elapsedRef    = useRef<number>(0);
  const inputRef      = useRef<HTMLInputElement>(null);

  const currentUser  = users[userIndex];
  const currentStory = currentUser?.stories[storyIndex];
  const duration     = currentStory?.duration ?? DEFAULT_DURATION;

  // ── Progress timer ────────────────────────────────────────────────────────

  const clearTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const startTimer = useCallback(() => {
    clearTimer();
    startTimeRef.current = Date.now();
    const tick = 50; // ms per tick
    intervalRef.current = setInterval(() => {
      const elapsed = elapsedRef.current + (Date.now() - startTimeRef.current);
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearTimer();
        goNext();
      }
    }, tick);
  }, [duration, userIndex, storyIndex]); // eslint-disable-line

  const pauseTimer = () => {
    elapsedRef.current += Date.now() - startTimeRef.current;
    clearTimer();
  };

  const resumeTimer = () => {
    startTimeRef.current = Date.now();
    startTimer();
  };

  // Reset + start when story changes
  useEffect(() => {
    setProgress(0);
    elapsedRef.current = 0;
    setImgLoaded(false);
    setSent(false);
    if (!paused) startTimer();
    return clearTimer;
  }, [userIndex, storyIndex]);

  useEffect(() => {
    if (paused) pauseTimer();
    else resumeTimer();
  }, [paused]);

  // ── Navigation ────────────────────────────────────────────────────────────

  const goNext = useCallback(() => {
    const user = users[userIndex];
    if (storyIndex < user.stories.length - 1) {
      setStoryIndex(s => s + 1);
    } else if (userIndex < users.length - 1) {
      setUserIndex(u => u + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  }, [userIndex, storyIndex, users, onClose]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex(s => s - 1);
    } else if (userIndex > 0) {
      setUserIndex(u => u - 1);
      setStoryIndex(users[userIndex - 1].stories.length - 1);
    }
  }, [userIndex, storyIndex, users]);

  // ── Tap zones ────────────────────────────────────────────────────────────

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, currentTarget } = e;
    const { left, width } = currentTarget.getBoundingClientRect();
    const rel = (clientX - left) / width;
    if (rel < 0.35) goPrev();
    else goNext();
  };

  // ── Long press = pause ────────────────────────────────────────────────────

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerDown = () => {
    holdTimer.current = setTimeout(() => setPaused(true), 150);
  };

  const handlePointerUp = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (paused) setPaused(false);
  };

  // ── Send reply ────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    await onReply?.(currentUser.id, message.trim());
    setMessage('');
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  };

  if (!currentUser || !currentStory) return null;

  return (
    /* Full-screen blurred overlay */
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      fontFamily: FONT,
      padding: 16,
    }}>

      {/* ── Phone outer shell ── */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 390,
        height: 'min(844px, calc(100dvh - 32px))',
        flexShrink: 0,
      }}>

        {/* Power button */}
        <div style={{
          position: 'absolute', right: -5, top: 160,
          width: 4, height: 66,
          background: 'linear-gradient(180deg,#555,#333)',
          borderRadius: '0 3px 3px 0',
          boxShadow: '2px 0 5px rgba(0,0,0,0.5)', zIndex: 10,
        }} />
        {/* Volume up */}
        <div style={{
          position: 'absolute', right: -5, top: 260,
          width: 4, height: 44,
          background: 'linear-gradient(180deg,#555,#333)',
          borderRadius: '0 3px 3px 0',
          boxShadow: '2px 0 5px rgba(0,0,0,0.5)', zIndex: 10,
        }} />
        {/* Volume down */}
        <div style={{
          position: 'absolute', right: -5, top: 316,
          width: 4, height: 44,
          background: 'linear-gradient(180deg,#555,#333)',
          borderRadius: '0 3px 3px 0',
          boxShadow: '2px 0 5px rgba(0,0,0,0.5)', zIndex: 10,
        }} />

        {/* ── Phone screen ── */}
        <div style={{
          width: '100%', height: '100%',
          borderRadius: 44,
          overflow: 'hidden',
          boxShadow: '0 0 0 2px #444, 0 0 0 3.5px #2a2a2a, 0 40px 100px rgba(0,0,0,0.8)',
          position: 'relative',
          background: '#000',
        }}>

          {/* Story image — full bleed */}
          {currentStory.imageUrl && (
            <img
              key={currentStory.id}
              src={currentStory.imageUrl}
              alt=""
              onLoad={() => setImgLoaded(true)}
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover', display: 'block',
                opacity: imgLoaded ? 1 : 0,
                transition: 'opacity 0.25s',
              }}
            />
          )}

          {/* Dark gradient overlays — top + bottom */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            background: [
              'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 22%)',
              'linear-gradient(to top,    rgba(0,0,0,0.65) 0%, transparent 35%)',
            ].join(', '),
            pointerEvents: 'none',
          }} />

          {/* ── Tap zones (invisible, over entire screen) ── */}
          <div
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onClick={handleTap}
            style={{
              position: 'absolute', inset: 0, zIndex: 2,
              cursor: 'pointer',
            }}
          />

          {/* ── TOP UI (z:3) ── */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            zIndex: 3, padding: '52px 14px 0',
          }}>

            {/* Progress bars */}
            <div style={{
              display: 'flex', gap: 4, marginBottom: 14,
            }}>
              {currentUser.stories.map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 3, borderRadius: 2,
                  background: 'rgba(255,255,255,0.35)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    background: '#fff',
                    width: i < storyIndex ? '100%'
                      : i === storyIndex ? `${progress}%`
                      : '0%',
                    transition: i === storyIndex ? 'none' : 'none',
                  }} />
                </div>
              ))}
            </div>

            {/* Avatar + name + close */}
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Avatar with pink ring */}
                <div style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#FF4458,#FF7854)',
                  padding: 2, flexShrink: 0,
                }}>
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    style={{
                      width: '100%', height: '100%',
                      borderRadius: '50%', objectFit: 'cover',
                      border: '2px solid #000',
                      display: 'block',
                    }}
                  />
                </div>
                <span style={{
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                  letterSpacing: -0.2,
                }}>
                  {currentUser.name}
                </span>
              </div>

              {/* Close button */}
              <button
                onClick={e => { e.stopPropagation(); onClose(); }}
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.18)',
                  border: '1.5px solid rgba(255,255,255,0.25)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff',
                  zIndex: 4,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* ── BOTTOM UI — message bar (z:3) ── */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            zIndex: 3,
            padding: '0 14px 36px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              {/* Message input */}
              <div style={{
                flex: 1,
                background: 'rgba(255,255,255,0.15)',
                border: '1.5px solid rgba(255,255,255,0.25)',
                borderRadius: 28,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center',
                padding: '0 14px',
                height: 48,
                gap: 8,
              }}>
                <input
                  ref={inputRef}
                  value={sent ? '✓ Sent!' : message}
                  onChange={e => setMessage(e.target.value)}
                  onFocus={() => setPaused(true)}
                  onBlur={() => setPaused(false)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                  onClick={e => e.stopPropagation()}
                  placeholder="Your message"
                  readOnly={sent}
                  style={{
                    flex: 1, background: 'none', border: 'none',
                    outline: 'none', color: sent ? '#aef6c7' : '#fff',
                    fontSize: 14, fontFamily: FONT,
                  } as React.CSSProperties}
                />
                {/* Emoji / reaction button */}
                <button
                  onClick={e => { e.stopPropagation(); }}
                  style={{
                    background: 'none', border: 'none',
                    cursor: 'pointer', padding: 0, flexShrink: 0,
                    opacity: 0.75,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                    <line x1="9" y1="9" x2="9.01" y2="9"/>
                    <line x1="15" y1="9" x2="15.01" y2="9"/>
                  </svg>
                </button>
              </div>

              {/* Send button */}
              <button
                onClick={e => { e.stopPropagation(); handleSend(); }}
                disabled={sending || !message.trim()}
                style={{
                  width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                  background: message.trim()
                    ? 'linear-gradient(135deg,#FF4458,#FF7854)'
                    : 'rgba(255,255,255,0.15)',
                  border: '1.5px solid rgba(255,255,255,0.25)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: message.trim() ? 'pointer' : 'default',
                  transition: 'background 0.2s',
                  boxShadow: message.trim()
                    ? '0 4px 16px rgba(255,68,88,0.45)'
                    : 'none',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
                  <path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="#fff" strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Dynamic Island */}
          <div style={{
            position: 'absolute', top: 12, left: '50%',
            transform: 'translateX(-50%)',
            width: 120, height: 34,
            background: '#000', borderRadius: 20,
            zIndex: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <div style={{ width: 10, height: 10, background: '#1a1a1a', borderRadius: '50%', border: '1.5px solid #2a2a2a' }} />
            <div style={{ width: 36, height: 8, background: '#111', borderRadius: 4 }} />
          </div>

          {/* Home indicator */}
          <div style={{
            position: 'absolute', bottom: 10, left: '50%',
            transform: 'translateX(-50%)',
            width: 110, height: 4,
            background: 'rgba(255,255,255,0.35)',
            borderRadius: 2, zIndex: 3,
          }} />

        </div>{/* end phone screen */}
      </div>{/* end phone outer */}
    </div>
  );
};

export default StoryViewer;
