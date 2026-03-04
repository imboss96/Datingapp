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

// ── Helpers ────────────────────────────────────────────────────────────────────

const isToday = (dateStr: string): boolean => {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
};

const isYesterday = (dateStr: string): boolean => {
  const d = new Date(dateStr);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
};

const getSectionLabel = (dateStr: string): string => {
  if (isToday(dateStr)) return 'Today';
  if (isYesterday(dateStr)) return 'Yesterday';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
};

// ── Skeleton ───────────────────────────────────────────────────────────────────

const MatchSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 gap-3 px-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="rounded-2xl overflow-hidden bg-gray-100 animate-pulse">
        <div className="aspect-[3/4] bg-gray-200" />
        <div className="bg-gray-100 p-2">
          <div className="h-3 bg-gray-200 rounded w-2/3 mb-1" />
          <div className="flex gap-2 mt-2">
            <div className="flex-1 h-8 bg-gray-200 rounded-xl" />
            <div className="flex-1 h-8 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// ── Section Divider ────────────────────────────────────────────────────────────

const SectionDivider: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-3 px-4 py-3">
    <div className="flex-1 h-px bg-gray-200" />
    <span className="text-[12px] font-semibold text-gray-400 tracking-wide">{label}</span>
    <div className="flex-1 h-px bg-gray-200" />
  </div>
);

// ── Match Card ─────────────────────────────────────────────────────────────────

const MatchCard: React.FC<{
  match: Match;
  onChat: () => void;
  onUnmatch: () => void;
}> = ({ match, onChat, onUnmatch }) => {
  const user = match.matchedUser;
  const photo = user?.profilePicture || match.user1Image || match.user2Image;
  const name  = user?.name || match.user1Name || match.user2Name || 'Unknown';
  const age   = user?.age;

  return (
    <div className="rounded-[18px] overflow-hidden shadow-sm" style={{ background: '#1a1a1a' }}>
      {/* Photo */}
      <div className="relative aspect-[3/4] bg-gray-800">
        {photo ? (
          <img
            src={photo}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white text-4xl font-black"
            style={{ background: 'linear-gradient(135deg, #f72585, #c9184a)' }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Name overlay */}
        <div
          className="absolute bottom-0 left-0 right-0 px-3 py-2"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)' }}
        >
          <p className="text-white font-bold text-[14px] leading-tight">
            {name}{age ? `, ${age}` : ''}
          </p>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex" style={{ background: '#1a1a1a' }}>
        {/* Unmatch / X */}
        <button
          onClick={onUnmatch}
          className="flex-1 flex items-center justify-center py-3 transition-colors hover:bg-white/10 active:bg-white/20"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Divider */}
        <div className="w-px bg-white/10 my-2" />

        {/* Like / Chat */}
        <button
          onClick={onChat}
          className="flex-1 flex items-center justify-center py-3 transition-colors hover:bg-white/10 active:bg-white/20"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#f72585">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

const MatchesPage: React.FC<MatchesPageProps> = ({ currentUserId }) => {
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useAlert();
  const [matches, setMatches]   = useState<Match[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => { fetchMatches(); }, [currentUserId]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      if (!currentUserId) { setMatches([]); return; }
      const response   = await apiClient.getMatches(currentUserId);
      const matchesData = Array.isArray(response) ? response : (response?.matches || []);
      setMatches(matchesData);
    } catch (err: any) {
      console.error('[Matches] Error fetching:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnmatch = (matchId: string) => {
    showConfirm('Unmatch?', 'Are you sure you want to unmatch this person?', async () => {
      try {
        await apiClient.deleteMatch(matchId);
        setMatches(prev => prev.filter(m => m.id !== matchId));
      } catch (err: any) {
        showAlert('Error', 'Failed to unmatch: ' + err?.message);
      }
    }, true);
  };

  const handleStartChat = (match: Match) => {
    if (match?.matchedUser?.id) {
      navigate(`/chat/new-${match.matchedUser.id}`, { state: { matchedProfile: match.matchedUser } });
    }
  };

  // ── Group matches by date section ─────────────────────────────────────────────

  const grouped: { label: string; items: Match[] }[] = [];
  for (const match of matches) {
    const label = getSectionLabel(match.createdAt);
    const existing = grouped.find(g => g.label === label);
    if (existing) existing.items.push(match);
    else grouped.push({ label, items: [match] });
  }

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <div
      className="h-full w-full flex flex-col overflow-hidden"
      style={{ background: '#fff' }}
    >
      {/* ── Header ── */}
      <div className="px-5 pt-6 pb-2 flex items-start justify-between shrink-0">
        <div>
          <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight leading-tight">
            Matches
          </h1>
          <p className="text-[14px] text-gray-400 font-medium mt-0.5 leading-snug max-w-[220px]">
            This is a list of people who have liked you and your matches.
          </p>
        </div>

        {/* Icon button top-right */}
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center mt-1 shrink-0"
          style={{ border: '1.5px solid #fdd0e0', background: '#fff9fb' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
              stroke="#f72585"
              strokeWidth="1.8"
              fill="none"
            />
          </svg>
        </div>
      </div>

      {/* ── Body ── */}
      {loading ? (
        <div className="flex-1 overflow-y-auto pt-4">
          <MatchSkeleton />
        </div>
      ) : matches.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center pb-20">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
            style={{ background: '#fff0f5' }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path
                d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                stroke="#f72585"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
          </div>
          <h3 className="text-[18px] font-extrabold text-gray-800 mb-2">No matches yet</h3>
          <p className="text-[14px] text-gray-400 leading-relaxed">
            Keep swiping — your matches will appear here when you have mutual likes.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-6 min-h-0">
          {grouped.map(group => (
            <div key={group.label}>
              <SectionDivider label={group.label} />

              {/* 2-column grid */}
              <div className="grid grid-cols-2 gap-3 px-4">
                {group.items.map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onChat={() => handleStartChat(match)}
                    onUnmatch={() => handleUnmatch(match.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MatchesPage;