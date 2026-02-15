
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, UserRole } from '../types';
import apiClient from '../services/apiClient';
import { useAlert } from '../services/AlertContext';
import MatchModal from './MatchModal';

interface SwiperScreenProps {
  currentUser: UserProfile;
  onDeductCoin: () => void;
}

interface Heart {
  id: string;
  x: number;
  y: number;
}

const SwiperScreen: React.FC<SwiperScreenProps> = ({ currentUser, onDeductCoin }) => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedUser, setMatchedUser] = useState<UserProfile | null>(null);
  const [interestMatch, setInterestMatch] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const doubleTapTimeout = useRef<NodeJS.Timeout | null>(null);

  // Calculate match score based on location and interests
  const calculateMatchScore = (profile: UserProfile): number => {
    let score = 0;
    
    // Location match (30 points)
    if (profile.location === currentUser.location) {
      score += 30;
    }
    
    // Interest overlap (70 points max)
    const commonInterests = profile.interests.filter(interest => 
      currentUser.interests.includes(interest)
    ).length;
    if (commonInterests > 0) {
      score += Math.min(commonInterests * 10, 70);
    }
    
    return score;
  };

  // Sort profiles by match score (highest first)
  const sortByMatchScore = (profiles: UserProfile[]): UserProfile[] => {
    return profiles.sort((a, b) => calculateMatchScore(b) - calculateMatchScore(a));
  };

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('[DEBUG SwiperScreen] Fetching profiles from API');
        
        // Get all users from the backend
        const allUsers = await apiClient.getAllUsers();
        console.log('[DEBUG SwiperScreen] Fetched', allUsers.length, 'total users');
        
        // Filter out current user and sort by match score
        const otherProfiles = allUsers.filter((user: UserProfile) => user.id !== currentUser.id);
        const sortedProfiles = sortByMatchScore(otherProfiles);
        
        console.log('[DEBUG SwiperScreen] Displaying', sortedProfiles.length, 'profiles (sorted by match score)');
        setProfiles(sortedProfiles);
      } catch (err: any) {
        console.error('[ERROR SwiperScreen] Failed to fetch profiles:', err);
        setError(err.message || 'Failed to load profiles');
        setProfiles([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, [currentUser.id]);

  const handleSwipe = (direction: 'left' | 'right') => {
    setCurrentIndex(prev => prev + 1);
  };

  const handleLike = async () => {
    const profile = profiles[currentIndex];
    if (profile && profile.id) {
      try {
        // Record the like action
        const response = await apiClient.recordSwipe(currentUser.id, profile.id, 'like');
        console.log('[DEBUG SwiperScreen] Liked profile:', profile.id, response);
        
        // Check if there's a match (demo matches or real mutual likes)
        if (response.matched && response.matchedUser) {
          console.log('[DEBUG SwiperScreen] MATCH FOUND!', response);
          setMatchedUser(response.matchedUser);
          setInterestMatch(response.interestMatch);
          setShowMatchModal(true);
        }
      } catch (err) {
        console.error('[ERROR SwiperScreen] Failed to record like:', err);
      }
    }
    handleSwipe('right');
  };

  const handleMatchModalClose = () => {
    setShowMatchModal(false);
    setMatchedUser(null);
    setInterestMatch(0);
  };

  const handleMatchMessage = () => {
    if (matchedUser) {
      handleMatchModalClose();
      navigate(`/chat/${matchedUser.id}`, { state: { matchedProfile: matchedUser } });
    }
  };

  const handleSuperLike = async () => {
    if (!currentUser.isPremium && currentUser.coins < 1) {
      showAlert('Out of Coins', 'Top up in your profile to keep swiping.');
      return;
    }
    
    const profile = profiles[currentIndex];
    if (profile && profile.id) {
      try {
        // Record the super like action
        await apiClient.recordSwipe(currentUser.id, profile.id, 'superlike');
        console.log('[DEBUG SwiperScreen] Super liked profile:', profile.id);
      } catch (err) {
        console.error('[ERROR SwiperScreen] Failed to record super like:', err);
      }
    }
    
    if (!currentUser.isPremium) onDeductCoin();
    handleSwipe('right');
  };

  const handleRewind = () => {
    if (currentIndex === 0) return;
    if (!currentUser.isPremium && currentUser.coins < 1) {
      showAlert('Coins Required', 'Rewind costs 1 coin. Top up to undo your last choice!');
      return;
    }
    if (!currentUser.isPremium) onDeductCoin();
    setCurrentIndex(prev => prev - 1);
  };

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  // Handle touch end
  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    handleSwipeGesture();
  };

  // Detect swipe direction
  const handleSwipeGesture = () => {
    const difference = touchStartX.current - touchEndX.current;
    const isLeftSwipe = difference > 50;
    const isRightSwipe = difference < -50;

    if (isLeftSwipe) {
      // Left swipe = pass / dislike
      handleSwipe('left');
    } else if (isRightSwipe) {
      // Right swipe = like
      handleSwipe('right');
    }
  };

  // Handle double tap to like
  const handleCardTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const timeDiff = now - lastTapTime;

    // Double tap detected (within 300ms)
    if (timeDiff < 300 && tapCount > 0) {
      // Add heart animation
      const clientX = 'clientX' in e ? e.clientX : e.currentTarget.getBoundingClientRect().left + e.currentTarget.getBoundingClientRect().width / 2;
      const clientY = 'clientY' in e ? e.clientY : e.currentTarget.getBoundingClientRect().top + e.currentTarget.getBoundingClientRect().height / 2;
      
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        const heartX = clientX - rect.left;
        const heartY = clientY - rect.top;
        
        addHeart(heartX, heartY);
      }

      // Clear the timeout since we have a double tap
      if (doubleTapTimeout.current) {
        clearTimeout(doubleTapTimeout.current);
      }

      // Perform like action
      handleLike();
      setTapCount(0);
      setLastTapTime(0);
    } else {
      setTapCount(prev => prev + 1);
      setLastTapTime(now);

      // Clear previous timeout
      if (doubleTapTimeout.current) {
        clearTimeout(doubleTapTimeout.current);
      }

      // Reset tap count after 500ms if no second tap
      doubleTapTimeout.current = setTimeout(() => {
        setTapCount(0);
      }, 500);
    }
  };

  // Add heart animation
  const addHeart = (x: number, y: number) => {
    const newHeart: Heart = {
      id: `heart-${Date.now()}-${Math.random()}`,
      x,
      y,
    };
    setHearts(prev => [...prev, newHeart]);

    // Remove heart after animation
    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 1000);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-gray-500 font-medium">Finding potential matches...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="bg-red-50 p-6 rounded-full mb-4 shadow-inner">
        <i className="fa-solid fa-exclamation-circle text-4xl text-red-500"></i>
      </div>
      <h2 className="text-2xl font-bold text-gray-800">Oops!</h2>
      <p className="text-gray-500 mt-2 max-w-xs leading-relaxed">{error}</p>
      <button 
        onClick={() => window.location.reload()}
        className="mt-6 px-10 py-3 spark-gradient text-white rounded-full font-bold shadow-xl active:scale-95 transition-transform"
      >
        Retry
      </button>
    </div>
  );

  if (profiles.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white md:bg-gray-50">
      <div className="bg-blue-50 p-6 rounded-full mb-4 shadow-inner">
        <i className="fa-solid fa-search text-4xl text-blue-500"></i>
      </div>
      <h2 className="text-2xl font-bold text-gray-800">No profiles available</h2>
      <p className="text-gray-500 mt-2 max-w-xs leading-relaxed">There are no other users in your area yet. Check back later!</p>
      <button 
        onClick={() => window.location.reload()}
        className="mt-6 px-10 py-3 spark-gradient text-white rounded-full font-bold shadow-xl active:scale-95 transition-transform"
      >
        Refresh
      </button>
    </div>
  );

  if (currentIndex >= profiles.length) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white md:bg-gray-50">
      <div className="bg-red-50 p-6 rounded-full mb-4 shadow-inner">
        <i className="fa-solid fa-location-dot text-4xl text-red-500"></i>
      </div>
      <h2 className="text-2xl font-bold text-gray-800">No more people!</h2>
      <p className="text-gray-500 mt-2 max-w-xs leading-relaxed">Try increasing your distance or adjusting your filters to see more profiles.</p>
      <button 
        onClick={() => setCurrentIndex(0)}
        className="mt-6 px-10 py-3 spark-gradient text-white rounded-full font-bold shadow-xl active:scale-95 transition-transform"
      >
        Refresh Discovery
      </button>
    </div>
  );

  const profile = profiles[currentIndex];

  return (
    <>
      <style>{`
        @keyframes heartFloat {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translate(0, -80px) scale(0.5);
            opacity: 0;
          }
        }
        
        @keyframes heartPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
        }
      `}</style>
      <div className="h-full flex flex-col items-center justify-start md:justify-center p-2 md:p-8 bg-white md:bg-gray-50 pt-2 md:pt-8">
        <div className="w-full flex-1 md:h-full max-w-[420px] md:max-h-[700px] flex flex-col relative group">
        <div 
          ref={cardRef}
          className="flex-1 relative cursor-pointer select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={handleCardTap}
        >
          <div className="absolute inset-0 bg-gray-200 rounded-[2rem] overflow-hidden shadow-2xl swipe-card ring-1 ring-black/5">
            <img 
              src={profile.images[0]} 
              alt={profile.name} 
              className="w-full h-full object-cover select-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
            
            {/* Hearts Animation Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {hearts.map((heart) => (
                <div
                  key={heart.id}
                  className="absolute animate-pulse"
                  style={{
                    left: `${heart.x}px`,
                    top: `${heart.y}px`,
                    animation: `heartFloat 1s ease-out forwards`,
                  }}
                >
                  <i className="fa-solid fa-heart text-red-500 text-4xl drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))' }}></i>
                </div>
              ))}
            </div>

            {/* Double tap indicator */}
            {tapCount > 0 && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="text-white text-sm font-bold bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
                  🎯 Tap again to like!
                </div>
              </div>
            )}
            
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-3xl font-extrabold tracking-tight">{profile.username || profile.name}, {profile.age}</h3>
                {profile.isPremium && (
                  <span className="premium-gradient px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-lg">
                    Premium
                  </span>
                )}
              </div>
              
              {/* Match Score Badge */}
              <div className="mb-3 flex items-center gap-2">
                <div className="bg-white/20 backdrop-blur-xl ring-1 ring-white/50 px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5">
                  <i className="fa-solid fa-heart text-red-400"></i>
                  <span>{calculateMatchScore(profile)}% Match</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-300 mb-4">
                <i className="fa-solid fa-location-arrow text-[10px]"></i>
                <span className="font-medium">{profile.location}</span>
              </div>
              <p className="text-sm line-clamp-3 text-gray-100 mb-6 leading-relaxed font-normal">{profile.bio}</p>
              <div className="flex flex-wrap gap-2.5 mb-6">
                {profile.interests.map(interest => (
                  <span key={interest} className={`px-4 py-1.5 rounded-full text-[11px] font-semibold ${
                    currentUser.interests.includes(interest)
                      ? 'bg-green-500/30 ring-1 ring-green-400/50'
                      : 'bg-white/10 ring-1 ring-white/20'
                  }`}>
                    {interest}
                  </span>
                ))}
              </div>
              <button
                onClick={() => navigate(`/chat/${profile.id}`, { state: { matchedProfile: profile } })}
                className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-xl ring-1 ring-white/50 py-2.5 rounded-full text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-message text-sm"></i>
                Message
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex justify-center gap-3 md:gap-5 mt-4 md:mt-8 pb-2 md:pb-4">
          <button 
            onClick={handleRewind}
            className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white shadow-xl border border-gray-100 flex items-center justify-center text-amber-500 text-lg md:text-xl hover:bg-amber-50 active:scale-90 transition-all group/btn"
            title="Rewind (1 Coin)"
          >
            <i className="fa-solid fa-rotate-left"></i>
            {!currentUser.isPremium && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">1</span>
            )}
          </button>
          <button 
            onClick={() => handleSwipe('left')}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white shadow-xl border border-gray-100 flex items-center justify-center text-red-500 text-xl md:text-2xl hover:bg-red-50 active:scale-90 transition-all"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          <button 
            onClick={handleSuperLike}
            className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white shadow-xl border border-gray-100 flex items-center justify-center text-blue-400 text-lg md:text-xl hover:bg-blue-50 active:scale-90 transition-all relative"
            title="Super Like (1 Coin)"
          >
            <i className="fa-solid fa-star"></i>
             {!currentUser.isPremium && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">1</span>
            )}
          </button>
          <button 
            onClick={() => handleSwipe('right')}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white shadow-xl border border-gray-100 flex items-center justify-center text-emerald-500 text-xl md:text-2xl hover:bg-emerald-50 active:scale-90 transition-all"
            title="Like"
          >
            <i className="fa-solid fa-heart"></i>
          </button>
        </div>
      </div>
      </div>
    </>
  );
};

export default SwiperScreen;
