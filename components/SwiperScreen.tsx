import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import apiClient from '../services/apiClient';
import { useAlert } from '../services/AlertContext';
import { calculateDistance, DISTANCE_RANGES, getDistanceRangeLabel } from '../services/distanceUtils';
import MatchModal from './MatchModal';
import UserProfileModal from './UserProfileModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SwiperScreenProps {
  currentUser: UserProfile;
  onDeductCoin: () => void;
  coords?: [number, number] | null;
}

interface Heart {
  id: string;
  x: number;
  y: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH_SIZE        = 100;
const PRELOAD_THRESHOLD = 10;

// ─── Helpers (outside component — never recreated) ────────────────────────────

const calcMatchScore = (profile: UserProfile, currentUser: UserProfile): number => {
  let score = 0;

  if (profile.location === currentUser.location) score += 20;

  if (currentUser.coordinates && profile.coordinates) {
    const d = calculateDistance(currentUser.coordinates, profile.coordinates);
    if      (d <=   1) score += 30;
    else if (d <=   5) score += 25;
    else if (d <=  10) score += 20;
    else if (d <=  50) score += 10;
  }

  const common = profile.interests.filter(i => currentUser.interests.includes(i)).length;
  if (common > 0) score += Math.min(common * 10, 50);

  return score;
};

const getTimeAgoLabel = (timestamp: number): string => {
  const diff  = Date.now() - timestamp;
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  if (mins  <  1) return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const getProximityLabel = (distanceKm: number | null): string => {
  if (distanceKm === null) return '';
  if (distanceKm < 0.1)   return 'Right here 📍';
  if (distanceKm < 0.5)   return 'Nearby ✨';
  if (distanceKm < 1)     return 'Less than 1 km away';
  if (distanceKm < 2)     return 'About 1 km away';
  if (distanceKm < 5)     return `${Math.round(distanceKm)} km away`;
  if (distanceKm < 20)    return `${Math.round(distanceKm)} km away`;
  if (distanceKm < 100)   return `${Math.round(distanceKm)} km away`;
  return `${Math.round(distanceKm)} km away`;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const ProfileImageSkeleton: React.FC = () => (
  <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 rounded-[2rem] animate-pulse flex items-center justify-center">
    <i className="fa-solid fa-user text-6xl text-gray-400" />
  </div>
);

const ActionButton: React.FC<{
  onClick: () => void;
  icon: string;
  color: string;
  hoverBg: string;
  size?: 'sm' | 'lg';
  coinCost?: boolean;
  coinColor?: string;
  title?: string;
}> = ({ onClick, icon, color, hoverBg, size = 'sm', coinCost, coinColor = 'amber', title }) => (
  <button
    onClick={onClick}
    title={title}
    className={`relative rounded-full bg-white shadow-xl border border-gray-100 flex items-center justify-center ${color} ${hoverBg} active:scale-90 transition-all ${
      size === 'lg'
        ? 'w-14 h-14 md:w-16 md:h-16 text-xl md:text-2xl'
        : 'w-12 h-12 md:w-14 md:h-14 text-lg md:text-xl'
    }`}
  >
    <i className={`fa-solid ${icon}`} />
    {coinCost && (
      <span className={`absolute -top-1 -right-1 bg-${coinColor}-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white`}>
        1
      </span>
    )}
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const SwiperScreen: React.FC<SwiperScreenProps> = ({ currentUser, onDeductCoin, coords }) => {
  const navigate      = useNavigate();
  const { showAlert } = useAlert();

  // ── State ──────────────────────────────────────────────────────────────────

  const [profiles,           setProfiles]           = useState<UserProfile[]>([]);
  const [currentIndex,       setCurrentIndex]       = useState(0);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState<string | null>(null);
  const [hearts,             setHearts]             = useState<Heart[]>([]);
  const [tapCount,           setTapCount]           = useState(0);
  const [lastTapTime,        setLastTapTime]        = useState(0);
  const [showMatchModal,     setShowMatchModal]     = useState(false);
  const [matchedUser,        setMatchedUser]        = useState<UserProfile | null>(null);
  const [interestMatch,      setInterestMatch]      = useState(0);
  const [isLoadingMore,      setIsLoadingMore]      = useState(false);
  const [currentBatch,       setCurrentBatch]       = useState(0);
  const [showProfileModal,   setShowProfileModal]   = useState(false);
  const [query,              setQuery]              = useState('');
  const [searchOpen,         setSearchOpen]         = useState(false);
  const [maxDistance,        setMaxDistance]        = useState<number>(DISTANCE_RANGES.THOUSAND_KM);
  const [showDistanceFilter, setShowDistanceFilter] = useState(false);
  const [imgLoaded,          setImgLoaded]          = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────

  const cardRef           = useRef<HTMLDivElement>(null);
  const touchStartX       = useRef(0);
  const touchEndX         = useRef(0);
  const doubleTapTimeout  = useRef<NodeJS.Timeout | null>(null);
  const profilesLengthRef = useRef(0);
  const isLoadingMoreRef  = useRef(false);
  const matchScoreCache   = useRef<Record<string, number>>({});

  // Keep refs in sync
  useEffect(() => { profilesLengthRef.current = profiles.length; }, [profiles]);
  useEffect(() => { isLoadingMoreRef.current  = isLoadingMore;   }, [isLoadingMore]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (doubleTapTimeout.current) clearTimeout(doubleTapTimeout.current);
  }, []);

  // ── Distance / match helpers ───────────────────────────────────────────────

  const getDistance = useCallback((profile: UserProfile): number | null => {
    if (!coords || !profile.coordinates) return null;
    return calculateDistance(coords, profile.coordinates);
  }, [coords]);

  const getMatchScore = useCallback((profile: UserProfile): number => {
    if (matchScoreCache.current[profile.id] === undefined) {
      matchScoreCache.current[profile.id] = calcMatchScore(profile, currentUser);
    }
    return matchScoreCache.current[profile.id];
  }, [currentUser]);

  // ── Profile fetching ───────────────────────────────────────────────────────

  const fetchProfileBatch = useCallback(async (batchNumber: number, distance: number): Promise<UserProfile[]> => {
    try {
      const skip      = batchNumber * BATCH_SIZE;
      const activeLat = coords?.[1];
      const activeLon = coords?.[0];

      console.log('[DEBUG] fetchProfileBatch:', {
        batchNumber,
        skip,
        distance,
        coords,
        activeLat,
        activeLon,
        currentUserId: currentUser.id
      });

      const batchUsers = await apiClient.getProfilesForSwiping(
        BATCH_SIZE,
        skip,
        true,
        activeLat,
        activeLon
      );

      console.log('[DEBUG] API returned users:', batchUsers.length);

      const others = batchUsers.filter((u: UserProfile) => u.id !== currentUser.id);
      console.log('[DEBUG] After filtering self:', others.length);

      const distanceFiltered = (activeLat != null && activeLon != null)
        ? others.filter((p: UserProfile) => {
            if (!p.coordinates) {
              console.log('[DEBUG] Profile without coordinates:', p.id);
              return true;
            }
            const d = calculateDistance([activeLon, activeLat], p.coordinates);
            const withinDistance = d <= distance;
            console.log('[DEBUG] Distance check:', p.id, 'distance:', d, 'within:', withinDistance);
            return withinDistance;
          })
        : others;

      console.log('[DEBUG] After distance filtering:', distanceFiltered.length);

      return distanceFiltered.sort(
        (a: UserProfile, b: UserProfile) => getMatchScore(b) - getMatchScore(a)
      );
    } catch (err) {
      console.error('[SwiperScreen] Failed to fetch batch:', err);
      return [];
    }
  }, [currentUser, coords, getMatchScore]);

  // ── Initial load ───────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      setProfiles([]);
      setCurrentIndex(0);
      setCurrentBatch(0);
      matchScoreCache.current = {};

      const initial = await fetchProfileBatch(0, maxDistance);
      if (!cancelled) {
        if (initial.length === 0) setError('No profiles available to swipe');
        setProfiles(initial);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [currentUser.id, maxDistance, fetchProfileBatch, coords]);

  // ── Filtered profiles ──────────────────────────────────────────────────────

  const filteredProfiles = useMemo(() => {
    if (!query.trim()) return profiles;
    const q = query.trim().toLowerCase();
    return profiles.filter(p =>
      p.username?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q)
    );
  }, [profiles, query]);

  // Reset index when search query changes
  useEffect(() => { setCurrentIndex(0); }, [query]);

  // Preload next profile image
  useEffect(() => {
    const next = filteredProfiles[currentIndex + 1];
    if (next?.images?.[0]) {
      const img = new Image();
      img.src = next.images[0];
    }
  }, [currentIndex, filteredProfiles]);

  // Reset image loaded state on profile change
  useEffect(() => { setImgLoaded(false); }, [currentIndex]);

  // ── Load more when approaching end ─────────────────────────────────────────

  const loadMoreIfNeeded = useCallback(async (upcomingIndex: number) => {
    if (
      upcomingIndex >= profilesLengthRef.current - PRELOAD_THRESHOLD &&
      !isLoadingMoreRef.current
    ) {
      setIsLoadingMore(true);
      const nextBatch = currentBatch + 1;
      const more      = await fetchProfileBatch(nextBatch, maxDistance);
      if (more.length > 0) {
        setProfiles(prev => [...prev, ...more]);
        setCurrentBatch(nextBatch);
      }
      setIsLoadingMore(false);
    }
  }, [currentBatch, maxDistance, fetchProfileBatch]);

  // ── Swipe actions ──────────────────────────────────────────────────────────

  const advance = useCallback((nextIndex: number) => {
    setCurrentIndex(nextIndex);
    loadMoreIfNeeded(nextIndex);
  }, [loadMoreIfNeeded]);

  const handleLike = useCallback(async () => {
    const profile = filteredProfiles[currentIndex];
    if (!profile?.id) return;
    try {
      const res = await apiClient.recordSwipe(currentUser.id, profile.id, 'like');
      if (res.matched && res.matchedUser) {
        setMatchedUser(res.matchedUser);
        setInterestMatch(res.interestMatch);
        setShowMatchModal(true);
      }
    } catch (err) {
      console.error('[SwiperScreen] Failed to record like:', err);
    }
    advance(currentIndex + 1);
  }, [filteredProfiles, currentIndex, currentUser.id, advance]);

  const handlePass = useCallback(async () => {
    const profile = filteredProfiles[currentIndex];
    if (profile?.id) {
      try {
        await apiClient.recordSwipe(currentUser.id, profile.id, 'pass');
      } catch (err) {
        console.error('[SwiperScreen] Failed to record pass:', err);
      }
    }
    advance(currentIndex + 1);
  }, [filteredProfiles, currentIndex, currentUser.id, advance]);

  const handleSuperLike = useCallback(async () => {
    if (!currentUser.isPremium && currentUser.coins < 1) {
      showAlert('Out of Coins', 'Top up in your profile to keep swiping.');
      return;
    }
    const profile = filteredProfiles[currentIndex];
    if (profile?.id) {
      try {
        await apiClient.recordSwipe(currentUser.id, profile.id, 'superlike');
      } catch (err) {
        console.error('[SwiperScreen] Failed to record super like:', err);
      }
    }
    if (!currentUser.isPremium) onDeductCoin();
    advance(currentIndex + 1);
  }, [filteredProfiles, currentIndex, currentUser, onDeductCoin, showAlert, advance]);

  const handleRewind = useCallback(() => {
    if (currentIndex === 0) return;
    if (!currentUser.isPremium && currentUser.coins < 1) {
      showAlert('Coins Required', 'Rewind costs 1 coin. Top up to undo your last choice!');
      return;
    }
    if (!currentUser.isPremium) onDeductCoin();
    setCurrentIndex(prev => prev - 1);
  }, [currentIndex, currentUser, onDeductCoin, showAlert]);

  // ── Touch / swipe gestures ─────────────────────────────────────────────────

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if      (diff >  50) handlePass();
    else if (diff < -50) handleLike();
  };

  // ── Double tap to like ─────────────────────────────────────────────────────

  const addHeart = useCallback((x: number, y: number) => {
    const id = `heart-${Date.now()}-${Math.random()}`;
    setHearts(prev => [...prev, { id, x, y }]);
    setTimeout(() => setHearts(prev => prev.filter(h => h.id !== id)), 1000);
  }, []);

  const handleCardTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const now      = Date.now();
    const timeDiff = now - lastTapTime;

    if (timeDiff < 300 && tapCount > 0) {
      if (cardRef.current) {
        const rect    = cardRef.current.getBoundingClientRect();
        const clientX = 'clientX' in e ? e.clientX : rect.left + rect.width  / 2;
        const clientY = 'clientY' in e ? e.clientY : rect.top  + rect.height / 2;
        addHeart(clientX - rect.left, clientY - rect.top);
      }
      if (doubleTapTimeout.current) clearTimeout(doubleTapTimeout.current);
      handleLike();
      setTapCount(0);
      setLastTapTime(0);
    } else {
      setTapCount(prev => prev + 1);
      setLastTapTime(now);
      if (doubleTapTimeout.current) clearTimeout(doubleTapTimeout.current);
      doubleTapTimeout.current = setTimeout(() => setTapCount(0), 500);
    }
  }, [lastTapTime, tapCount, addHeart, handleLike]);

  // ── Match modal handlers ───────────────────────────────────────────────────

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

  // ── Early returns (loading / error / empty states) ─────────────────────────

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-gray-500 font-medium">Finding potential matches...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="bg-red-50 p-6 rounded-full mb-4 shadow-inner">
        <i className="fa-solid fa-exclamation-circle text-4xl text-red-500" />
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
        <i className="fa-solid fa-users text-4xl text-blue-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800">No profiles available</h2>
      <p className="text-gray-500 mt-2 max-w-xs leading-relaxed">
        There are no other users in your area yet. Check back later!
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 px-10 py-3 spark-gradient text-white rounded-full font-bold shadow-xl active:scale-95 transition-transform"
      >
        Refresh
      </button>
    </div>
  );

  if (profiles.length > 0 && filteredProfiles.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white md:bg-gray-50">
      <div className="bg-gray-100 p-6 rounded-full mb-4 shadow-inner">
        <i className="fa-solid fa-magnifying-glass text-4xl text-gray-400" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800">No results for "{query}"</h2>
      <p className="text-gray-500 mt-2 max-w-xs leading-relaxed">
        Try a different username or full name.
      </p>
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => setQuery('')}
          className="px-6 py-3 bg-white border rounded-lg font-bold"
        >
          Clear Search
        </button>
        <button
          onClick={() => { setQuery(''); setProfiles([]); setCurrentBatch(0); }}
          className="px-6 py-3 spark-gradient text-white rounded-lg font-bold"
        >
          Reset Discovery
        </button>
      </div>
    </div>
  );

  if (currentIndex >= filteredProfiles.length && isLoadingMore) return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-gray-500 font-medium">Loading more profiles...</p>
    </div>
  );

  if (currentIndex >= filteredProfiles.length) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white md:bg-gray-50">
      <div className="bg-red-50 p-6 rounded-full mb-4 shadow-inner">
        <i className="fa-solid fa-location-dot text-4xl text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800">You've seen everyone!</h2>
      <p className="text-gray-500 mt-2 max-w-xs leading-relaxed">
        Come back later for new people in your area.
      </p>
      <button
        onClick={() => { setQuery(''); setCurrentIndex(0); setCurrentBatch(0); setProfiles([]); }}
        className="mt-6 px-10 py-3 spark-gradient text-white rounded-full font-bold shadow-xl active:scale-95 transition-transform"
      >
        Refresh Discovery
      </button>
    </div>
  );

  // ── Current profile ────────────────────────────────────────────────────────

  const profile    = filteredProfiles[currentIndex];
  const matchScore = getMatchScore(profile);
  const distance   = getDistance(profile);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Desktop search bar */}
      <div className="hidden md:flex w-full justify-center p-4 bg-transparent z-40">
        <div className="w-full max-w-4xl flex items-center gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search username or full name"
            className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="ml-2 px-3 py-2 bg-white border rounded-full text-sm"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Heart float animation */}
      <style>{`
        @keyframes heartFloat {
          0%   { transform: translate(0,0) scale(1); opacity: 1; }
          50%  { opacity: 1; }
          100% { transform: translate(0,-80px) scale(0.5); opacity: 0; }
        }
      `}</style>

      <div className="h-full flex flex-col items-center justify-start md:justify-center p-2 md:p-8 bg-white md:bg-gray-50 pt-2 md:pt-8">
        <div className="w-full flex-1 md:h-full max-w-[420px] md:max-h-[700px] flex flex-col relative group">

          {/* ── Top overlay controls ── */}
          <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-auto gap-2">
            {searchOpen ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search username or name"
                  className="flex-1 px-3 py-2 rounded-full border border-gray-200 bg-white/90 text-sm"
                />
                <button
                  onClick={() => setSearchOpen(false)}
                  className="ml-2 px-3 py-2 bg-white rounded-full border"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            ) : (
              <>
                {/* Distance filter */}
                <div className="relative">
                  <button
                    onClick={() => setShowDistanceFilter(v => !v)}
                    className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md border hover:bg-white transition-colors"
                    title="Distance filter"
                  >
                    <i className="fa-solid fa-location-crosshairs text-red-500" />
                  </button>

                  {showDistanceFilter && (
                    <div className="absolute top-12 left-0 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 w-56 z-50">
                      <h3 className="font-bold text-gray-800 mb-3 text-sm">Distance Range</h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {[
                          DISTANCE_RANGES.ONE_KM,
                          DISTANCE_RANGES.FIVE_KM,
                          DISTANCE_RANGES.TEN_KM,
                          DISTANCE_RANGES.FIFTY_KM,
                          DISTANCE_RANGES.HUNDRED_KM,
                          DISTANCE_RANGES.FIVE_HUNDRED_KM,
                          DISTANCE_RANGES.THOUSAND_KM,
                          DISTANCE_RANGES.WORLDWIDE,
                        ].map(d => (
                          <button
                            key={d}
                            onClick={() => {
                              setMaxDistance(d);
                              setShowDistanceFilter(false);
                            }}
                            className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                              maxDistance === d
                                ? 'bg-red-100 text-red-700 font-bold border border-red-300'
                                : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {getDistanceRangeLabel(d)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSearchOpen(true)}
                  className="ml-auto w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md border hover:bg-white transition-colors"
                  title="Search"
                >
                  <i className="fa-solid fa-magnifying-glass" />
                </button>
              </>
            )}
          </div>

          {/* ── Profile Card ── */}
          <div
            ref={cardRef}
            className="flex-1 relative cursor-pointer select-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={handleCardTap}
          >
            <div className="absolute inset-0 bg-gray-200 rounded-[2rem] overflow-hidden shadow-2xl swipe-card ring-1 ring-black/5">

              {/* Skeleton while image loads */}
              {!imgLoaded && <ProfileImageSkeleton />}

              <img
                key={profile.id}
                src={profile.images?.[0]}
                alt={profile.name}
                onLoad={() => setImgLoaded(true)}
                className={`w-full h-full object-cover select-none transition-opacity duration-300 ${
                  imgLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

              {/* Floating hearts on double tap */}
              <div className="absolute inset-0 pointer-events-none">
                {hearts.map(heart => (
                  <div
                    key={heart.id}
                    className="absolute"
                    style={{
                      left: heart.x,
                      top: heart.y,
                      animation: 'heartFloat 1s ease-out forwards'
                    }}
                  >
                    <i
                      className="fa-solid fa-heart text-red-500 text-4xl drop-shadow-lg"
                      style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.6))' }}
                    />
                  </div>
                ))}
              </div>

              {/* Double-tap hint */}
              {tapCount > 0 && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="text-white text-sm font-bold bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
                    🎯 Tap again to like!
                  </div>
                </div>
              )}

              {/* ── Profile info overlay ── */}
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">

                {/* Name, age, premium badge */}
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-3xl font-extrabold tracking-tight">
                    {profile.username || profile.name}, {profile.age}
                  </h3>
                  {profile.isPremium && (
                    <span className="premium-gradient px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-lg">
                      Premium
                    </span>
                  )}
                </div>

                {/* Match score + proximity badge */}
                <div className="mb-3 flex items-center gap-2 flex-wrap">
                  <div className="bg-white/20 backdrop-blur-xl ring-1 ring-white/50 px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5">
                    <i className="fa-solid fa-heart text-red-400" />
                    <span>{matchScore}% Match</span>
                  </div>

                  {distance !== null && (
                    <div className={`backdrop-blur-xl ring-1 px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 ${
                      distance < 1
                        ? 'bg-green-500/30 ring-green-400/50 text-green-200'
                        : distance < 10
                        ? 'bg-blue-500/20 ring-blue-400/50 text-blue-200'
                        : 'bg-white/20 ring-white/50'
                    }`}>
                      <i className={`fa-solid fa-location-dot ${
                        distance < 1
                          ? 'text-green-300'
                          : distance < 10
                          ? 'text-blue-300'
                          : 'text-gray-300'
                      }`} />
                      <span>{getProximityLabel(distance)}</span>
                    </div>
                  )}
                </div>

                {/* Location text */}
                <div className="flex items-center gap-2 text-sm text-gray-300 mb-4">
                  <i className="fa-solid fa-location-arrow text-[10px]" />
                  <span className="font-medium">{profile.location}</span>
                </div>

                {/* Bio */}
                <p className="text-sm line-clamp-3 text-gray-100 mb-6 leading-relaxed">
                  {profile.bio}
                </p>

                {/* Interests */}
                <div className="flex flex-wrap gap-2.5 mb-6">
                  {profile.interests.map(interest => (
                    <span
                      key={interest}
                      className={`px-4 py-1.5 rounded-full text-[11px] font-semibold ${
                        currentUser.interests.includes(interest)
                          ? 'bg-green-500/30 ring-1 ring-green-400/50'
                          : 'bg-white/10 ring-1 ring-white/20'
                      }`}
                    >
                      {interest}
                    </span>
                  ))}
                </div>

                {/* View / Message buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-xl ring-1 ring-white/50 py-2.5 rounded-full text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-eye text-sm" />
                    View Profile
                  </button>
                  <button
                    onClick={() => navigate(`/chat/${profile.id}`, { state: { matchedProfile: profile } })}
                    className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-xl ring-1 ring-white/50 py-2.5 rounded-full text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-message text-sm" />
                    Message
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Action Controls ── */}
          <div className="flex justify-center gap-3 md:gap-5 mt-4 md:mt-8 pb-2 md:pb-4">
            <ActionButton
              onClick={handleRewind}
              icon="fa-rotate-left"
              color="text-amber-500"
              hoverBg="hover:bg-amber-50"
              title="Rewind (1 Coin)"
              coinCost={!currentUser.isPremium}
              coinColor="amber"
            />
            <ActionButton
              onClick={handlePass}
              icon="fa-xmark"
              color="text-red-500"
              hoverBg="hover:bg-red-50"
              size="lg"
            />
            <ActionButton
              onClick={handleSuperLike}
              icon="fa-star"
              color="text-blue-400"
              hoverBg="hover:bg-blue-50"
              title="Super Like (1 Coin)"
              coinCost={!currentUser.isPremium}
              coinColor="blue"
            />
            <ActionButton
              onClick={handleLike}
              icon="fa-heart"
              color="text-emerald-500"
              hoverBg="hover:bg-emerald-50"
              size="lg"
              title="Like"
            />
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && profile && (
        <UserProfileModal
          user={profile}
          onClose={() => setShowProfileModal(false)}
          currentUser={currentUser}
          coords={coords}
        />
      )}

      {/* Match Modal */}
      {showMatchModal && matchedUser && (
        <MatchModal
          matchedUser={matchedUser}
          interestMatch={interestMatch}
          onClose={handleMatchModalClose}
          onMessage={handleMatchMessage}
        />
      )}
    </>
  );
};

export default SwiperScreen;