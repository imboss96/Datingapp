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

const MatchesPage: React.FC<MatchesPageProps> = ({ currentUserId }) => {
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useAlert();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // App-like swipe view state (mirrors behavior from SwiperScreen)
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hearts, setHearts] = useState<{ id: string; x: number; y: number }[]>([]);
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const touchStartX = React.useRef(0);
  const touchEndX = React.useRef(0);
  const doubleTapTimeout = React.useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    fetchMatches();
  }, [currentUserId]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const uid = currentUserId;
      if (!uid) {
        setMatches([]);
        return;
      }

      const response = await apiClient.getMatches(uid);
      // apiClient.getMatches returns either an array or an object with { matches }
      const matchesData = Array.isArray(response) ? response : (response?.matches || []);
      setMatches(matchesData);
    } catch (err: any) {
      console.error('[Matches] Error fetching:', err);
      setError(err?.message || 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const handleUnmatch = async (matchId: string) => {
    showConfirm('Unmatch?', 'Are you sure you want to unmatch this person?', async () => {
      try {
        await apiClient.deleteMatch(matchId);
        setMatches(matches.filter(m => m.id !== matchId));
        setCurrentIndex(Math.max(0, currentIndex - 1));
      } catch (err: any) {
        console.error('[Matches] Error unmatching:', err);
        showAlert('Error', 'Failed to unmatch: ' + err?.message);
      }
    }, true);
  };

  const handleStartChat = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (match?.matchedUser?.id) {
      (async () => {
        try {
          const chat = await apiClient.createOrGetChat(match.matchedUser.id);
          const chatId = chat?.id || chat?._id;
          if (chatId) {
            navigate(`/chat/${chatId}`, { state: { matchedProfile: match.matchedUser } });
          } else {
            navigate('/chats');
          }
        } catch (err) {
          console.error('[Matches] Failed to create/get chat:', err);
          navigate('/chats');
        }
      })();
    }
  };

  // Swipe navigation for app-like feel
  const handleSwipe = (direction: 'left' | 'right') => {
    setCurrentIndex((prev) => {
      if (direction === 'right') return Math.min(prev + 1, matches.length - 1);
      return Math.max(prev - 1, 0);
    });
    setSelectedMatch(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) handleSwipe('right');
    else if (diff < -50) handleSwipe('left');
  };

  const addHeart = (x: number, y: number) => {
    const newHeart = { id: `h-${Date.now()}-${Math.random()}`, x, y };
    setHearts((p) => [...p, newHeart]);
    setTimeout(() => setHearts((p) => p.filter((h) => h.id !== newHeart.id)), 900);
  };

  const handleCardTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const timeDiff = now - lastTapTime;
    if (timeDiff < 300 && tapCount > 0) {
      const clientX = 'clientX' in e ? (e as React.MouseEvent).clientX : (e as React.TouchEvent).currentTarget.getBoundingClientRect().left + (e as any).currentTarget.getBoundingClientRect().width / 2;
      const clientY = 'clientY' in e ? (e as React.MouseEvent).clientY : (e as any).currentTarget.getBoundingClientRect().top + (e as any).currentTarget.getBoundingClientRect().height / 2;
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        addHeart(clientX - rect.left, clientY - rect.top);
      }
      // double tap: open chat for current
      const m = matches[currentIndex];
      if (m?.matchedUser?.id) handleStartChat(m.id);
      if (doubleTapTimeout.current) clearTimeout(doubleTapTimeout.current);
      setTapCount(0);
      setLastTapTime(0);
    } else {
      setTapCount((t) => t + 1);
      setLastTapTime(now);
      if (doubleTapTimeout.current) clearTimeout(doubleTapTimeout.current);
      doubleTapTimeout.current = setTimeout(() => setTapCount(0), 500);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mb-4"></div>
          <p className="text-gray-600">Loading your matches...</p>
        </div>
      </div>
    );
  }

  // App-like centered card view
  const current = matches[currentIndex];

  return (
    <div className="h-screen flex items-start justify-center bg-white md:bg-gray-50 p-4 md:p-8">
      <div className="w-full max-w-[420px] h-full flex flex-col items-center">
        <div className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white p-4 rounded-2xl mb-4">
          <h1 className="text-xl font-bold flex items-center gap-2"><i className="fa-solid fa-heart text-lg"></i>Matches</h1>
          <p className="text-pink-100 text-sm">{matches.length} total matches</p>
        </div>

        {matches.length === 0 ? (
          <div className="flex-1 w-full rounded-2xl bg-white shadow-lg p-8 flex flex-col items-center justify-center">
            <div className="mb-4">
              <i className="fa-solid fa-heart text-6xl text-gray-300"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">No matches yet</h3>
            <p className="text-gray-600 text-center">Keep swiping — your matches will appear here when you have mutual likes.</p>
          </div>
        ) : (
          <div className="flex-1 w-full max-h-[80vh] flex flex-col items-center justify-between">
            <div
              ref={cardRef}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onClick={handleCardTap}
              className="relative w-full flex-1 rounded-2xl overflow-hidden shadow-2xl bg-gray-200"
            >
              {current?.matchedUser?.profilePicture && (
                <img src={current.matchedUser.profilePicture} alt={current.matchedUser.name} className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-6 flex flex-col justify-end">
                <div>
                  <h2 className="text-2xl font-extrabold text-white truncate">{current.matchedUser?.name} {current.matchedUser?.age && <span className="text-sm font-medium text-gray-200">{current.matchedUser.age}</span>}</h2>
                  {current.matchedUser?.location && <p className="text-sm text-gray-300"><i className="fa-solid fa-location-dot mr-2"></i>{current.matchedUser.location}</p>}
                </div>
                <div className="mt-4 flex gap-3">
                  <button onClick={() => handleStartChat(current.id)} className="flex-1 py-3 sm:py-4 min-h-[44px] sm:min-h-[48px] bg-white/20 text-white rounded-full font-semibold transition-opacity hover:bg-white/30 active:opacity-75"><i className="fa-solid fa-message mr-2"></i>Message</button>
                  <button onClick={() => handleUnmatch(current.id)} className="flex-1 py-3 sm:py-4 min-h-[44px] sm:min-h-[48px] bg-gray-200 text-gray-800 rounded-full font-semibold transition-opacity hover:bg-gray-300 active:opacity-75"><i className="fa-solid fa-user-slash mr-2"></i>Unmatch</button>
                </div>
                <p className="text-xs text-gray-300 text-center mt-3">Matched {new Date(current.createdAt).toLocaleDateString()}</p>
              </div>

              {/* Hearts overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {hearts.map(h => (
                  <div key={h.id} style={{ left: h.x, top: h.y }} className="absolute animate-pulse">
                    <i className="fa-solid fa-heart text-red-500 text-3xl drop-shadow-lg"></i>
                  </div>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="w-full flex items-center justify-center gap-4 mt-4 sm:mt-6">
              <button onClick={() => handleSwipe('left')} className="w-14 h-14 sm:w-12 sm:h-12 min-h-[48px] min-w-[48px] rounded-full bg-white shadow-md flex items-center justify-center text-lg hover:shadow-lg transition-shadow active:scale-95">◀</button>
              <div className="text-sm text-gray-600 px-4">{currentIndex + 1} / {matches.length}</div>
              <button onClick={() => handleSwipe('right')} className="w-14 h-14 sm:w-12 sm:h-12 min-h-[48px] min-w-[48px] rounded-full bg-white shadow-md flex items-center justify-center text-lg hover:shadow-lg transition-shadow active:scale-95">▶</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchesPage;
