import React, { useState, useEffect } from 'react';
import { useWebSocketContext } from '../services/WebSocketProvider';

interface MatchNotification {
  matchId: string;
  matchedWith: {
    id: string;
    name: string;
    profilePicture?: string;
    bio?: string;
    age?: number;
    location?: string;
    interests?: string[];
  };
  compatibility: {
    interestMatch: number;
    ageMatch: number;
    mutualInterests?: string[];
  };
  timestamp: string;
}

interface MatchNotificationCenterProps {
  userId: string;
  currentUserPhoto?: string;
}

export const MatchNotificationCenter: React.FC<MatchNotificationCenterProps> = ({ userId, currentUserPhoto }) => {
  const [notification, setNotification] = useState<MatchNotification | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [visible, setVisible] = useState(false);
  const { addMessageHandler } = useWebSocketContext();

  useEffect(() => {
    const unsubscribe = addMessageHandler((data: any) => {
      if (data.type === 'match') {
        setNotification({
          matchId: data.matchId,
          matchedWith: data.matchedWith,
          compatibility: data.compatibility,
          timestamp: data.timestamp,
        });
        setShowModal(true);
        setTimeout(() => setVisible(true), 10);
        setTimeout(() => handleClose(), 10000);
      }
    });
    return unsubscribe;
  }, [userId, addMessageHandler]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      setShowModal(false);
      setNotification(null);
    }, 400);
  };

  const handleSendMessage = () => {
    if (notification?.matchedWith.id) {
      window.location.href = `/#/chat/new-${notification.matchedWith.id}`;
    }
  };

  if (!showModal || !notification) return null;

  const matched = notification.matchedWith;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.82)',
      backdropFilter: 'blur(6px)',
      transition: 'opacity 0.4s ease',
      opacity: visible ? 1 : 0,
    }}>
      {/* Particle burst (static decorative dots) */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {Array.from({ length: 28 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: 4 + (i % 3) * 2,
            height: 4 + (i % 3) * 2,
            borderRadius: '50%',
            background: ['#FF4B7B','#FF6B95','#fff','#FFB3C6','#FF2D55'][i % 5],
            left: `${5 + (i * 3.3) % 90}%`,
            top: `${5 + (i * 7.1) % 80}%`,
            opacity: 0.25 + (i % 4) * 0.1,
          }} />
        ))}
      </div>

      <div style={{
        width: '100%', maxWidth: 380,
        padding: '0 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.95)',
        transition: 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1)',
      }}>

        {/* Title */}
        <h1 style={{
          fontFamily: "'Dancing Script', 'Brush Script MT', cursive",
          fontSize: 58,
          fontWeight: 700,
          color: '#fff',
          margin: '0 0 12px',
          textAlign: 'center',
          lineHeight: 1.1,
          textShadow: '0 2px 20px rgba(255,75,123,0.4)',
          letterSpacing: -1,
        }}>
          It's a Match!
        </h1>

        {/* Subtitle */}
        <p style={{
          color: 'rgba(255,255,255,0.82)',
          fontSize: 17,
          textAlign: 'center',
          margin: '0 0 44px',
          lineHeight: 1.5,
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontWeight: 400,
          maxWidth: 280,
        }}>
          You and <strong style={{ color: '#fff', fontWeight: 600 }}>{matched.name}</strong> have liked each other.
        </p>

        {/* Two circular photos */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          marginBottom: 52,
        }}>
          {/* Current user */}
          <div style={photoRingStyle}>
            <div style={photoInnerStyle}>
              {currentUserPhoto ? (
                <img src={currentUserPhoto} alt="You" style={photoImgStyle} />
              ) : (
                <div style={{ ...photoImgStyle, background: 'linear-gradient(135deg,#FF4B7B,#FF8CAB)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize: 36, color: '#fff', fontWeight: 700 }}>Y</span>
                </div>
              )}
            </div>
          </div>

          {/* Heart between */}
          <div style={{
            width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1,
          }}>
            <svg width="32" height="28" viewBox="0 0 24 21" fill="none">
              <path d="M12 20.5C12 20.5 1 13.5 1 6.5C1 3.46 3.46 1 6.5 1C8.24 1 9.79 1.81 10.88 3.09L12 4.5L13.12 3.09C14.21 1.81 15.76 1 17.5 1C20.54 1 23 3.46 23 6.5C23 13.5 12 20.5 12 20.5Z" fill="#FF4B7B" />
            </svg>
          </div>

          {/* Matched user */}
          <div style={photoRingStyle}>
            <div style={photoInnerStyle}>
              {matched.profilePicture ? (
                <img src={matched.profilePicture} alt={matched.name} style={photoImgStyle} />
              ) : (
                <div style={{ ...photoImgStyle, background: 'linear-gradient(135deg,#a18cd1,#fbc2eb)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize: 36, color: '#fff', fontWeight: 700 }}>{matched.name.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SEND MESSAGE button */}
        <button
          onClick={handleSendMessage}
          style={{
            width: '100%',
            padding: '18px 0',
            borderRadius: 50,
            border: 'none',
            background: 'linear-gradient(90deg, #FF4B7B 0%, #FF8C42 100%)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: 2,
            cursor: 'pointer',
            marginBottom: 14,
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            boxShadow: '0 4px 24px rgba(255,75,123,0.45)',
            transition: 'transform 0.12s, box-shadow 0.12s',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          SEND MESSAGE
        </button>

        {/* KEEP SWIPING button */}
        <button
          onClick={handleClose}
          style={{
            width: '100%',
            padding: '16px 0',
            borderRadius: 50,
            border: '2px solid rgba(255,75,123,0.7)',
            background: 'transparent',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: 2,
            cursor: 'pointer',
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            transition: 'border-color 0.2s, transform 0.12s',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          KEEP SWIPING
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');
      `}</style>
    </div>
  );
};

const photoRingStyle: React.CSSProperties = {
  width: 140,
  height: 140,
  borderRadius: '50%',
  padding: 4,
  background: 'linear-gradient(135deg, #FF4B7B, #FF8C42)',
  boxShadow: '0 6px 32px rgba(255,75,123,0.35)',
  flexShrink: 0,
};

const photoInnerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  overflow: 'hidden',
  border: '3px solid #1a1a1a',
};

const photoImgStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
  filter: 'grayscale(20%)',
};

export default MatchNotificationCenter;