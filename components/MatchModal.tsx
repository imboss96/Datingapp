import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { useAlert } from '../services/AlertContext';

interface Match {
  id: string;
  user1Id: string;
  user2Id: string;
  user1Name: string;
  user2Name: string;
  user1Image?: string;
  user2Image?: string;
  interestMatch: number;
  ageMatch: number;
  mutualInterests: string[];
  createdAt: string;
  lastInteractedAt?: string;
  matchedUser?: {
    id: string;
    name: string;
    profilePicture?: string;
    age?: number;
    location?: string;
    bio?: string;
    interests?: string[];
  };
}

interface MatchesPageProps {
  currentUserId?: string;
}

// Group matches by date label
function groupByDate(matches: Match[]): { label: string; items: Match[] }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const groups: Record<string, Match[]> = {};
  for (const m of matches) {
    const d = new Date(m.createdAt);
    d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = 'Today';
    else if (d.getTime() === yesterday.getTime()) label = 'Yesterday';
    else label = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(m);
  }
  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

const MatchesPage: React.FC<MatchesPageProps> = ({ currentUserId }) => {
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useAlert();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState<'swipe' | 'matches' | 'messages' | 'profile'>('matches');

  useEffect(() => {
    fetchMatches();
  }, [currentUserId]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const uid = currentUserId;
      if (!uid) { setMatches([]); return; }
      const response = await apiClient.getMatches(uid);
      const matchesData = Array.isArray(response) ? response : (response?.matches || []);
      setMatches(matchesData);
    } catch (err: any) {
      console.error('[Matches] Error fetching:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnmatch = async (matchId: string) => {
    showConfirm('Unmatch?', 'Are you sure you want to unmatch this person?', async () => {
      try {
        await apiClient.deleteMatch(matchId);
        setMatches(prev => prev.filter(m => m.id !== matchId));
      } catch (err: any) {
        showAlert('Error', 'Failed to unmatch: ' + err?.message);
      }
    }, true);
  };

  const handleLike = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (match?.matchedUser?.id) {
      navigate(`/chat/new-${match.matchedUser.id}`, { state: { matchedProfile: match.matchedUser } });
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading your matches…</p>
      </div>
    );
  }

  const groups = groupByDate(matches);

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Matches</h1>
          <p style={styles.subtitle}>This is a list of people who have liked you<br />and your matches.</p>
        </div>
        <div style={styles.logoBox}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="#E91E63"/>
          </svg>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={styles.scrollArea}>
        {matches.length === 0 ? (
          <div style={styles.emptyState}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#e8e8e8"/>
            </svg>
            <p style={styles.emptyTitle}>No matches yet</p>
            <p style={styles.emptyBody}>Keep swiping — your matches will appear here when you have mutual likes.</p>
          </div>
        ) : (
          groups.map(({ label, items }) => (
            <div key={label} style={styles.section}>
              {/* Section divider */}
              <div style={styles.sectionHeader}>
                <div style={styles.dividerLine} />
                <span style={styles.sectionLabel}>{label}</span>
                <div style={styles.dividerLine} />
              </div>

              {/* Grid */}
              <div style={styles.grid}>
                {items.map((match) => {
                  const user = match.matchedUser;
                  return (
                    <div key={match.id} style={styles.card}>
                      {/* Photo */}
                      <div style={styles.photoWrap}>
                        {user?.profilePicture ? (
                          <img src={user.profilePicture} alt={user?.name} style={styles.photo} />
                        ) : (
                          <div style={styles.photoPlaceholder}>
                            <span style={styles.photoInitial}>{user?.name?.charAt(0)?.toUpperCase() ?? '?'}</span>
                          </div>
                        )}
                        {/* Name overlay */}
                        <div style={styles.nameOverlay}>
                          <span style={styles.nameText}>
                            {user?.name}{user?.age ? `, ${user.age}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Action bar */}
                      <div style={styles.actionBar}>
                        <button
                          style={styles.actionBtnX}
                          onClick={() => handleUnmatch(match.id)}
                          aria-label="Unmatch"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="#888" strokeWidth="2.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                        <button
                          style={styles.actionBtnHeart}
                          onClick={() => handleLike(match.id)}
                          aria-label="Message"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#E91E63"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div style={{ height: 80 }} />
      </div>

      {/* Bottom Nav */}
      <div style={styles.bottomNav}>
        {[
          {
            key: 'swipe', label: 'Swipe',
            icon: (active: boolean) => (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="16" rx="3" stroke={active ? '#E91E63' : '#aaa'} strokeWidth="2"/>
                <path d="M8 12h8M12 8v8" stroke={active ? '#E91E63' : '#aaa'} strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )
          },
          {
            key: 'matches', label: 'Matches',
            icon: (active: boolean) => (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={active ? '#E91E63' : 'none'} stroke={active ? '#E91E63' : '#aaa'} strokeWidth="2"/>
              </svg>
            )
          },
          {
            key: 'messages', label: 'Messages',
            icon: (active: boolean) => (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke={active ? '#E91E63' : '#aaa'} strokeWidth="2" strokeLinejoin="round"/>
              </svg>
            )
          },
          {
            key: 'profile', label: 'Profile',
            icon: (active: boolean) => (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke={active ? '#E91E63' : '#aaa'} strokeWidth="2"/>
                <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" stroke={active ? '#E91E63' : '#aaa'} strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )
          },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            style={{ ...styles.navBtn, ...(activeNav === key ? styles.navBtnActive : {}) }}
            onClick={() => setActiveNav(key as any)}
          >
            {icon(activeNav === key)}
            <span style={{ ...styles.navLabel, color: activeNav === key ? '#E91E63' : '#aaa' }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100dvh',
    maxWidth: 430,
    margin: '0 auto',
    background: '#fff',
    fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '52px 22px 16px',
    background: '#fff',
    flexShrink: 0,
  },
  title: {
    fontSize: 30,
    fontWeight: 800,
    color: '#111',
    margin: 0,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13.5,
    color: '#888',
    margin: '6px 0 0',
    lineHeight: 1.45,
    fontWeight: 400,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    border: '1.5px solid #f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    flexShrink: 0,
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 16px',
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    margin: '16px 0 14px',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: '#e8e8e8',
  },
  sectionLabel: {
    fontSize: 12.5,
    color: '#aaa',
    fontWeight: 500,
    letterSpacing: 0.3,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    background: '#f5f5f5',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  photoWrap: {
    position: 'relative',
    width: '100%',
    paddingBottom: '118%',
    overflow: 'hidden',
    background: '#ddd',
  },
  photo: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  photoPlaceholder: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f8a4c4 0%, #c084fc 100%)',
  },
  photoInitial: {
    fontSize: 40,
    fontWeight: 800,
    color: '#fff',
  },
  nameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '24px 10px 10px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.62) 0%, transparent 100%)',
  },
  nameText: {
    color: '#fff',
    fontSize: 13.5,
    fontWeight: 700,
    letterSpacing: 0.1,
  },
  actionBar: {
    display: 'flex',
    borderTop: '1px solid #f0f0f0',
    background: '#fff',
  },
  actionBtnX: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 0',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRight: '1px solid #f0f0f0',
    transition: 'background 0.15s',
  },
  actionBtnHeart: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 0',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  bottomNav: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: '10px 0 24px',
    background: '#fff',
    borderTop: '1px solid #f0f0f0',
    flexShrink: 0,
  },
  navBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 16px',
  },
  navBtnActive: {},
  navLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 0.2,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#fff',
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid #f0f0f0',
    borderTop: '3px solid #E91E63',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    marginBottom: 12,
  },
  loadingText: {
    color: '#aaa',
    fontSize: 14,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 32px',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#222',
    margin: 0,
  },
  emptyBody: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    margin: 0,
    lineHeight: 1.5,
  },
};

export default MatchesPage;