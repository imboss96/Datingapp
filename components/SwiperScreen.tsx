import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import apiClient from '../services/apiClient';
import { useAlert } from '../services/AlertContext';
import { calculateDistance, DISTANCE_RANGES, getDistanceRangeLabel } from '../services/distanceUtils';
import { storeLike, storeSuperLike, storePass } from '../services/likeService';
import { useLikeStats } from '../services/useLikeHooks';
import MatchModal from './MatchModal';
import UserProfileModal from './UserProfileModal';
import SearchSuggestions from './SearchSuggestions';

// ═══ Types ═══════════════════════════════════════════════════════════════════

interface SwiperScreenProps {
  currentUser: UserProfile;
  onDeductCoin: () => void;
}

interface Heart {
  id: string;
  x: number;
  y: number;
}

// ═══ Constants ═════════════════════════════════════════════════════════════════

const BATCH_SIZE        = 30;
const PRELOAD_THRESHOLD = 20; // load next batch EARLY when this many profiles remain - background loading

// ═══ Helpers (outside component – never recreated) ═══════════════════════════

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

// Helper to safely extract latitude and longitude from coordinates
const extractCoordinates = (coords: any): { lat: number; lon: number } | null => {
  if (!coords) return null;
  
  // Handle both formats: { latitude, longitude } and GeoJSON format
  if (coords.latitude !== undefined && coords.longitude !== undefined) {
    return { lat: coords.latitude, lon: coords.longitude };
  }
  
  if (typeof coords === 'object' && coords.coordinates && Array.isArray(coords.coordinates)) {
    const [lon, lat] = coords.coordinates;
    return { lat, lon };
  }
  
  return null;
};

// Helper to validate and optimize Cloudinary image URLs with retry logic
const validateImageUrl = (url: string | undefined): string | null => {
  if (!url || typeof url !== 'string') return null;
  if (!url.trim()) return null;
  
  try {
    const trimmed = url.trim();
    
    // Validate URL
    new URL(trimmed);
    
    // If it's a Cloudinary URL, optimize it
    if (trimmed.includes('res.cloudinary.com')) {
      // Add quality and format optimization if not already present
      if (!trimmed.includes('/q_')) {
        // Use cloud name from environment variable
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dhxitpddx';
        // Dynamically extract cloud name and inject optimization parameters
        const cloudinaryOptimized = trimmed.replace(
          /res\.cloudinary\.com\/([^/]+)\/image\/upload\//,
          `res.cloudinary.com/${cloudName}/image/upload/q_auto,w_600,f_auto/`
        );
        console.log('[SwiperScreen] Optimized Cloudinary URL:', cloudinaryOptimized);
        return cloudinaryOptimized;
      }
    }
    
    return trimmed;
  } catch (err) {
    console.warn('[SwiperScreen] Invalid image URL:', url, 'Error:', err);
    return null;
  }
};

// Helper to detect if media URL is a video
const isVideoUrl = (url: string | undefined): boolean => {
  if (!url || typeof url !== 'string') return false;
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.avi', '.flv', '.m4v'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext));
};

// Helper to validate and optimize video URLs
const validateVideoUrl = (url: string | undefined): string | null => {
  if (!url || typeof url !== 'string') return null;
  if (!url.trim()) return null;
  
  try {
    const trimmed = url.trim();
    
    // Validate URL
    new URL(trimmed);
    
    // If it's a Cloudinary URL, optimize video
    if (trimmed.includes('res.cloudinary.com')) {
      if (!trimmed.includes('/q_')) {
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dhxitpddx';
        // Optimize video: quality auto, format mp4
        const cloudinaryOptimized = trimmed.replace(
          /res\.cloudinary\.com\/([^/]+)\/video\/upload\//,
          `res.cloudinary.com/${cloudName}/video/upload/q_auto,f_auto/`
        );
        console.log('[SwiperScreen] Optimized Cloudinary Video URL:', cloudinaryOptimized);
        return cloudinaryOptimized;
      }
    }
    
    return trimmed;
  } catch (err) {
    console.warn('[SwiperScreen] Invalid video URL:', url, 'Error:', err);
    return null;
  }
};

// Helper to preload image with proper error handling and timeout
const preloadImage = (url: string, timeoutMs: number = 8000): Promise<void> => {
  return new Promise((resolve) => {
    const img = new Image();
    const timeoutId = setTimeout(() => {
      img.src = '';
      resolve(); // resolve on timeout instead of rejecting
    }, timeoutMs);

    img.onload = () => {
      clearTimeout(timeoutId);
      resolve();
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      console.warn('[SwiperScreen] Failed to preload image:', url);
      resolve(); // resolve on error instead of rejecting
    };

    img.src = url;
  });
};

// ═══ Sub-components ════════════════════════════════════════════════════════════

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
  glowColor?: string;
  likeCount?: number;
  superlikeCount?: number;
}> = ({ onClick, icon, color, hoverBg, size = 'sm', coinCost, coinColor = 'amber', title, glowColor = 'gray', likeCount, superlikeCount }) => {
  const sizeClasses = size === 'lg' 
    ? 'w-16 h-16 md:w-20 md:h-20 text-2xl md:text-3xl' 
    : 'w-14 h-14 md:w-16 md:h-16 text-xl md:text-2xl';
  
  const colorMap: Record<string, { shadow: string; border: string; bg: string }> = {
    amber: { 
      shadow: '0 0 20px rgba(217, 119, 6, 0.4)',
      border: 'border-amber-200',
      bg: 'bg-amber-50'
    },
    rose: { 
      shadow: '0 0 25px rgba(244, 63, 94, 0.5)',
      border: 'border-rose-200',
      bg: 'bg-rose-50'
    },
    pink: { 
      shadow: '0 0 25px rgba(236, 72, 153, 0.5)',
      border: 'border-pink-200',
      bg: 'bg-pink-50'
    },
    purple: { 
      shadow: '0 0 25px rgba(192, 132, 252, 0.5)',
      border: 'border-purple-200',
      bg: 'bg-purple-50'
    },
    emerald: { 
      shadow: '0 0 20px rgba(34, 197, 94, 0.4)',
      border: 'border-emerald-200',
      bg: 'bg-emerald-50'
    },
  };

  const colorStyle = colorMap[glowColor] || colorMap.gray;
  
  return (
    <button
      onClick={onClick}
      title={title}
      className={`relative rounded-full bg-white shadow-2xl border-2 ${colorStyle.border} flex items-center justify-center ${color} active:scale-90 transition-all duration-200 hover:scale-110 transform ${sizeClasses}`}
      style={{
        boxShadow: `0 8px 24px rgba(0, 0, 0, 0.12), ${colorStyle.shadow}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.15)';
        e.currentTarget.style.boxShadow = `0 12px 32px rgba(0, 0, 0, 0.15), ${colorStyle.shadow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = `0 8px 24px rgba(0, 0, 0, 0.12), ${colorStyle.shadow}`;
      }}
    >
      <i className={`fa-solid ${icon}`} />
      {coinCost && (
        <span className={`absolute -top-3 -right-3 bg-${coinColor}-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-lg`}>
          1
        </span>
      )}
      {superlikeCount !== undefined && superlikeCount > 0 && (
        <span className="absolute -bottom-2 -right-2 bg-purple-500 text-white text-[11px] font-black w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
          {superlikeCount > 999 ? '999+' : superlikeCount}
        </span>
      )}
      {likeCount !== undefined && likeCount > 0 && !superlikeCount && (
        <span className="absolute -bottom-2 -right-2 bg-pink-500 text-white text-[11px] font-black w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
          {likeCount > 999 ? '999+' : likeCount}
        </span>
      )}
    </button>
  );
};

// ═══ Main Component ════════════════════════════════════════════════════════════

const SwiperScreen: React.FC<SwiperScreenProps> = ({ currentUser, onDeductCoin }) => {
  const navigate    = useNavigate();
  const { showAlert } = useAlert();

  // ── State ──────────────────────────────────────────────────────────────────
  const [profiles,         setProfiles]         = useState<UserProfile[]>([]);
  const [currentIndex,     setCurrentIndex]     = useState(0);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState<string | null>(null);
  const [hearts,           setHearts]           = useState<Heart[]>([]);
  const [tapCount,         setTapCount]         = useState(0);
  const [lastTapTime,      setLastTapTime]      = useState(0);
  const [retrying,         setRetrying]         = useState(false);
  const [showMatchModal,   setShowMatchModal]   = useState(false);
  const [matchedUser,      setMatchedUser]      = useState<UserProfile | null>(null);
  const [interestMatch,    setInterestMatch]    = useState(0);
  const [isLoadingMore,    setIsLoadingMore]    = useState(false);
  const [currentBatch,     setCurrentBatch]     = useState(0);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [query,            setQuery]            = useState('');
  const [searchOpen,       setSearchOpen]       = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [maxDistance,      setMaxDistance]      = useState<number>(DISTANCE_RANGES.THOUSAND_KM);
  const [showDistanceFilter, setShowDistanceFilter] = useState(false);
  const [imgLoaded,        setImgLoaded]        = useState(false);
  const [failedImages,     setFailedImages]     = useState<Set<string>>(new Set());
  const [swipedProfiles,   setSwipedProfiles]   = useState<Set<string>>(new Set());
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllMembers,   setShowAllMembers]   = useState(false);

    // Function to reload only swipe profiles (not the whole page)
    const refreshProfilesOnly = useCallback(() => {
      setLoading(true);
      setError(null);
      setProfiles([]);
      setCurrentIndex(0);
      setCurrentBatch(0);
      matchScoreCache.current = {};
      // Optionally reset swipedProfiles if you want to allow re-swiping
      // setSwipedProfiles(new Set());
      // Trigger profile reload by toggling showAllMembers (if needed)
      // Or just re-run the effect by updating a dummy state
      // For now, just re-run the effect by updating showAllMembers
      setShowAllMembers(showAllMembers);
    }, [showAllMembers]);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const cardRef            = useRef<HTMLDivElement>(null);
  const touchStartX        = useRef(0);
  const touchEndX          = useRef(0);
  const doubleTapTimeout   = useRef<NodeJS.Timeout | null>(null);
  const profilesLengthRef  = useRef(0); // always up-to-date profiles.length for async callbacks
  const isLoadingMoreRef   = useRef(false);
  const lastCachedGeoRef   = useRef<{ lat: number; lon: number; timestamp: number } | null>(null);
  
  // Haversine distance calculation (meters)
  const calcGeoDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Keep refs in sync
  useEffect(() => { profilesLengthRef.current = profiles.length; }, [profiles]);
  useEffect(() => { isLoadingMoreRef.current  = isLoadingMore;   }, [isLoadingMore]);

  // Load swiped profiles from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('swipedProfiles');
    if (saved) {
      try {
        setSwipedProfiles(new Set(JSON.parse(saved)));
        console.log('[SwiperScreen] Loaded swiped profiles from localStorage:', JSON.parse(saved).length);
      } catch (err) {
        console.error('[SwiperScreen] Failed to load swiped profiles:', err);
      }
    }
  }, []);

  // Save swiped profiles to localStorage whenever it changes
  useEffect(() => {
    if (swipedProfiles.size > 0) {
      localStorage.setItem('swipedProfiles', JSON.stringify(Array.from(swipedProfiles)));
      console.log('[SwiperScreen] Saved swiped profiles to localStorage:', swipedProfiles.size);
    }
  }, [swipedProfiles]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (doubleTapTimeout.current) clearTimeout(doubleTapTimeout.current);
  }, []);

  // ── Hooks (must be called before any early returns) ────────────────────────
  
  // Filter out already swiped profiles
  const filteredProfiles = useMemo(() => {
    if (swipedProfiles.size === 0) return profiles;
    const filtered = profiles.filter(p => !swipedProfiles.has(p.id));
    if (filtered.length < profiles.length) {
      console.log(`[SwiperScreen] Filtered out ${profiles.length - filtered.length} already swiped profiles`);
    }
    return filtered;
  }, [profiles, swipedProfiles]);

  const currentProfile = filteredProfiles[currentIndex] || null;
  const { stats: likeStats } = useLikeStats(currentProfile?.id || null);

  // ── Distance / match helpers ──────────────────────────────────────────────

  const getDistance = useCallback((profile: UserProfile): number | null => {
    if (!currentUser.coordinates || !profile.coordinates) return null;
    return calculateDistance(currentUser.coordinates, profile.coordinates);
  }, [currentUser.coordinates]);

  const matchScoreCache = useRef<Record<string, number>>({});

  const getMatchScore = useCallback((profile: UserProfile): number => {
    if (matchScoreCache.current[profile.id] === undefined) {
      matchScoreCache.current[profile.id] = calcMatchScore(profile, currentUser);
    }
    return matchScoreCache.current[profile.id];
  }, [currentUser]);

  // ── Profile fetching ──────────────────────────────────────────────────────

  const fetchProfileBatch = useCallback(async (batchNumber: number, distance: number, includeAllMembers: boolean = false): Promise<UserProfile[]> => {
    try {
      const skip = batchNumber * BATCH_SIZE;

      // Extract latitude and longitude from currentUser coordinates
      const coordsData = extractCoordinates(currentUser.coordinates);
      const lat = coordsData?.lat ?? null;
      const lon = coordsData?.lon ?? null;

      console.log('[SwiperScreen] Fetching batch:', { batchNumber, skip, distance, userLocation: coordsData, includeAllMembers });

      // If showing all members, always exclude seen to be false (show all)
      // Otherwise, try with excludeSeen=true first
      let batchUsers = await apiClient.getProfilesForSwiping(
        BATCH_SIZE,
        skip,
        !includeAllMembers,  // excludeSeen - false if showing all members
        lat,
        lon
      );

      // 1) If first page empty and we provided coords, retry without coords (general feed)
      if (batchUsers.length === 0 && lat != null && lon != null && batchNumber === 0) {
        console.warn('[SwiperScreen] Fetch returned 0, retrying without coordinates');
        batchUsers = await apiClient.getProfilesForSwiping(BATCH_SIZE, skip, !includeAllMembers);
      }

      // 2) If still nothing and we want all members, or if still nothing on first page
      if (batchUsers.length === 0 && batchNumber === 0) {
        console.warn('[SwiperScreen] No profiles, retrying with excludeSeen=' + includeAllMembers);
        batchUsers = await apiClient.getProfilesForSwiping(BATCH_SIZE, skip, includeAllMembers, lat, lon);
      }

      // 3) If still nothing, try fetching without any filters (unsorted fallback)
      if (batchUsers.length === 0 && batchNumber === 0) {
        console.warn('[SwiperScreen] Still no profiles, fetching unsorted fallback');
        batchUsers = await apiClient.getProfilesForSwiping(BATCH_SIZE, skip, false);
      }

      console.log('[SwiperScreen] API returned', batchUsers.length, 'profiles');

      const others = batchUsers.filter((u: UserProfile) => u.id !== currentUser.id);
      console.log('[SwiperScreen] After filtering current user:', others.length, 'profiles');
      
      // Debug: log profiles with missing images
      const withoutImages = others.filter(p => !p.images || p.images.length === 0);
      if (withoutImages.length > 0) {
        console.warn('[SwiperScreen] Profiles without images:', withoutImages.map(p => ({ id: p.id, name: p.name })));
      }

      // Apply distance filter on client-side
      let distanceFiltered = currentUser.coordinates && distance < Number.MAX_SAFE_INTEGER
        ? others.filter((p: UserProfile) => {
            if (!p.coordinates) return true; // include if no location data
            const d = calculateDistance(currentUser.coordinates!, p.coordinates);
            return d <= distance;
          })
        : others;

      // If distance filtering eliminated everyone but we still have others, ignore distance
      if (distanceFiltered.length === 0 && others.length > 0) {
        console.log('[SwiperScreen] Distance filter removed all profiles, ignoring distance');
        distanceFiltered = others;
      }

      console.log('[SwiperScreen] After distance filter:', distanceFiltered.length, 'profiles');

      // Sort by match score
      const sorted = distanceFiltered.sort(
        (a: UserProfile, b: UserProfile) => getMatchScore(b) - getMatchScore(a)
      );

      return sorted;
    } catch (err) {
      console.error('[SwiperScreen] Failed to fetch batch:', err);
      // bubble up to caller so it can show an error message
      throw err;
    }
  }, [currentUser, getMatchScore]);

  // ── Initial load ────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // Extract current coordinates
      const currentCoords = extractCoordinates(currentUser.coordinates);
      
      // Check cache: only fetch if user moved >500m OR 2 hours passed
      if (lastCachedGeoRef.current && currentCoords) {
        const timeSinceLastFetch = Date.now() - lastCachedGeoRef.current.timestamp;
        const distanceMoved = calcGeoDistance(
          lastCachedGeoRef.current.lat,
          lastCachedGeoRef.current.lon,
          currentCoords.lat,
          currentCoords.lon
        );
        
        console.log(`[SwiperScreen] Distance moved: ${Math.round(distanceMoved)}m, Time since fetch: ${Math.round(timeSinceLastFetch / 1000)}s`);
        
        // If user moved <500m AND <2 hours passed, skip fetch
        const TWO_HOURS = 2 * 60 * 60 * 1000;
        const MOVEMENT_THRESHOLD = 500; // meters
        
        if (distanceMoved < MOVEMENT_THRESHOLD && timeSinceLastFetch < TWO_HOURS) {
          console.log('[SwiperScreen] Cache valid - skipping fetch');
          return; // Skip fetching
        }
        
        console.log('[SwiperScreen] Cache expired or user moved - refetching profiles');
      }

      // Update cache with current coordinates
      if (currentCoords) {
        lastCachedGeoRef.current = {
          lat: currentCoords.lat,
          lon: currentCoords.lon,
          timestamp: Date.now()
        };
      }

      setLoading(true);
      setError(null);
      setProfiles([]);
      setCurrentIndex(0);
      setCurrentBatch(0);
      matchScoreCache.current = {};

      let initial: UserProfile[] = [];
      let retryCount = 0;
      const maxRetries = 2;

      // Retry logic for failed fetches
      while (retryCount <= maxRetries && initial.length === 0 && !cancelled) {
        try {
          initial = await fetchProfileBatch(0, maxDistance, showAllMembers);
          console.log('[SwiperScreen] initial fetch returned', initial.length, 'profiles');
          if (initial.length > 0) break; // Success, exit retry loop
        } catch (err: any) {
          console.error(`[SwiperScreen] Initial batch error (attempt ${retryCount + 1}/${maxRetries + 1}):`, err);
          retryCount++;
          if (retryCount <= maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
          }
        }
      }

      // If first batch empty and we have coords, attempt a raw fallback without coords
      if (initial.length === 0 && currentUser.coordinates && !cancelled) {
        console.warn('[SwiperScreen] Initial fetch empty, performing raw fallback without coordinates');
        try {
          const batchUsers = await apiClient.getProfilesForSwiping(BATCH_SIZE, 0, !showAllMembers);
          const others = batchUsers.filter((u: UserProfile) => u.id !== currentUser.id);
          initial = others.sort((a, b) => getMatchScore(b) - getMatchScore(a));
        } catch (err) {
          console.error('[SwiperScreen] Raw fallback failed:', err);
        }
      }

      // One more fallback: try without any filters at all
      if (initial.length === 0 && !cancelled) {
        console.warn('[SwiperScreen] All filtered attempts failed, trying unfiltered fallback');
        try {
          const batchUsers = await apiClient.getProfilesForSwiping(BATCH_SIZE, 0, false);
          initial = batchUsers.filter((u: UserProfile) => u.id !== currentUser.id);
        } catch (err) {
          console.error('[SwiperScreen] Unfiltered fallback failed:', err);
        }
      }

      if (!cancelled) {
        if (initial.length === 0) {
          setError('No profiles available to swipe. Try refreshing in 30 seconds.');
        }
        setProfiles(initial);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [currentUser.id, maxDistance, fetchProfileBatch, calcGeoDistance, showAllMembers]);

  // ── Preload next image ──────────────────────────────────────────────────

  // Show search results when search is opened and query is entered
  useEffect(() => {
    if (searchOpen && query.trim()) {
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
    }
  }, [searchOpen, query]);

  // Handle profile selection from search
  const handleSelectFromSearch = useCallback((profile: UserProfile) => {
    const profileIndex = profiles.findIndex(p => p.id === profile.id);
    if (profileIndex !== -1) {
      setCurrentIndex(profileIndex);
      setSearchOpen(false);
      setQuery('');
      setShowSearchResults(false);
    }
  }, [profiles]);

  // Debug: log when index changes and what profile is being shown
  useEffect(() => {
    const prof = profiles[currentIndex];
    console.log('[SwiperScreen] currentIndex set to', currentIndex, 'profile id', prof?.id, 'username', prof?.username);
  }, [currentIndex, profiles]);

  // Preload next profile image
  useEffect(() => {
    const next = profiles[currentIndex + 1];
    if (next?.images?.[0]) {
      const imageUrl = validateImageUrl(next.images[0]);
      if (imageUrl) {
        preloadImage(imageUrl, 8000).catch(() => {
          // already handled in preloadImage
        });
      }
    }
  }, [currentIndex, profiles]);

  // ── Load more in background when approaching end ──────────────────────────────────
  // This loads profiles silently without interrupting the swipe experience

  const loadMoreIfNeeded = useCallback(async (upcomingIndex: number) => {
    if (
      upcomingIndex >= profilesLengthRef.current - PRELOAD_THRESHOLD &&
      !isLoadingMoreRef.current
    ) {
      setIsLoadingMore(true);
      try {
        const nextBatch = currentBatch + 1;
        const more = await fetchProfileBatch(nextBatch, maxDistance);
        if (more.length > 0) {
          setProfiles(prev => [...prev, ...more]);
          setCurrentBatch(nextBatch);
          console.log('[SwiperScreen] Loaded next batch in background:', more.length, 'profiles');
        } else {
          console.log('[SwiperScreen] No more profiles to load');
        }
      } catch (err) {
        console.error('[SwiperScreen] Background batch load failed:', err);
        // Silent fail - don't interrupt swiping if background load fails
      } finally {
        setIsLoadingMore(false);
      }
    }
  }, [currentBatch, maxDistance, fetchProfileBatch]);

  // ── Reset image state when profile changes ────────────────────────────────
  // Only single useEffect to avoid duplicate renders and flickering
  useEffect(() => {
    setCurrentImageIndex(0);
    setImgLoaded(false);
    setFailedImages(new Set()); // Reset failed images when switching profiles
  }, [currentIndex]);

  // ── Image Carousel Navigation ──────────────────────────────────────────────

  const goToNextImage = useCallback(() => {
    const profile = currentProfile;
    if (profile?.images && currentImageIndex < profile.images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      setImgLoaded(false);
      setFailedImages(new Set()); // Reset failed images when navigating
      console.log('[SwiperScreen] Next image:', currentImageIndex + 1);
    }
  }, [currentImageIndex, currentProfile]);

  const goToPrevImage = useCallback(() => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
      setImgLoaded(false);
      setFailedImages(new Set()); // Reset failed images when navigating
      console.log('[SwiperScreen] Previous image:', currentImageIndex - 1);
    }
  }, [currentImageIndex]);

  // Keyboard navigation for image carousel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        goToNextImage();
      } else if (e.key === 'ArrowLeft') {
        goToPrevImage();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextImage, goToPrevImage]);

  // ── Swipe actions ──────────────────────────────────────────────────────

  const advance = useCallback((nextIndex: number) => {
    setCurrentIndex(nextIndex);
    loadMoreIfNeeded(nextIndex);
  }, [loadMoreIfNeeded]);

  const handleLike = useCallback(async () => {
    const profile = currentProfile;
    if (!profile?.id) return;
    console.log(`[SwiperScreen] Liking profile: ${profile.id}`);
    try {
      const res = await storeLike(currentUser.id, profile.id);
      console.log(`[SwiperScreen] Like response:`, res);
      // Mark profile as swiped
      setSwipedProfiles(prev => new Set([...prev, profile.id]));
      if (res.matched && res.matchedUser) {
        setMatchedUser(res.matchedUser as any);
        setInterestMatch(res.interestMatch || 0);
        setShowMatchModal(true);
        showAlert('It\'s a Match! 🎉', `You and ${res.matchedUser.name} liked each other!`);
      }
    } catch (err: any) {
      // Silently handle "Already swiped" errors - just advance to next profile
      if (err.message?.includes('Already swiped') || err.status === 400) {
        // Profile already swiped, mark it and skip
        setSwipedProfiles(prev => new Set([...prev, profile.id]));
      } else {
        console.error('[SwiperScreen] Failed to record like:', err);
        showAlert('Error', err.message || 'Failed to save like');
      }
    }
    advance(currentIndex + 1);
  }, [currentProfile, currentUser.id, advance, showAlert, currentIndex]);

  const handlePass = useCallback(async () => {
    const profile = currentProfile;
    if (profile?.id) {
      try {
        await storePass(currentUser.id, profile.id);
        // Mark profile as swiped
        setSwipedProfiles(prev => new Set([...prev, profile.id]));
      } catch (err: any) {
        // Silent fail for pass action - non-critical
        if (err.message?.includes('Already swiped') || err.status === 400) {
          setSwipedProfiles(prev => new Set([...prev, profile.id]));
        }
      }
    }
    advance(currentIndex + 1);
  }, [currentProfile, currentUser.id, advance, currentIndex]);

  const handleSuperLike = useCallback(async () => {
    if (!currentUser.isPremium && currentUser.coins < 1) {
      showAlert('Out of Coins', 'Top up in your profile to keep swiping.');
      return;
    }
    const profile = currentProfile;
    if (profile?.id) {
      try {
        const res = await storeSuperLike(currentUser.id, profile.id);
        // Mark profile as swiped
        setSwipedProfiles(prev => new Set([...prev, profile.id]));
        if (res.matched && res.matchedUser) {
          setMatchedUser(res.matchedUser as any);
          setInterestMatch(res.interestMatch || 0);
          setShowMatchModal(true);
          showAlert('Super Like Match! 🌟', `${res.matchedUser.name} loved your super like!`);
        }
      } catch (err: any) {
        // Silently handle "Already swiped" errors - just advance to next profile
        if (err.message?.includes('Already swiped') || err.status === 400) {
          // Profile already super liked, mark it and skip
          setSwipedProfiles(prev => new Set([...prev, profile.id]));
        } else {
          console.error('[SwiperScreen] Failed to record super like:', err);
          showAlert('Error', err.message || 'Failed to save super like');
        }
      }
    }
    if (!currentUser.isPremium) onDeductCoin();
    advance(currentIndex + 1);
  }, [currentProfile, currentUser, onDeductCoin, showAlert, advance, currentIndex]);

  // Handle retry on fetch error
  const handleRetry = useCallback(async () => {
    setRetrying(true);
    setError(null);
    setProfiles([]);
    setCurrentIndex(0);
    setCurrentBatch(0);
    matchScoreCache.current = {};
    
    let initial: UserProfile[] = [];
    try {
      initial = await fetchProfileBatch(0, maxDistance);
      if (initial.length > 0) {
        setProfiles(initial);
      } else {
        setError('Still no profiles. Please try again later.');
      }
    } catch (err: any) {
      console.error('[SwiperScreen] Retry failed:', err);
      setError(err.message || 'Failed to fetch profiles. Please check your connection.');
    } finally {
      setRetrying(false);
    }
  }, [maxDistance, fetchProfileBatch]);

  const handleRewind = useCallback(() => {
    if (currentIndex === 0) return;
    if (!currentUser.isPremium && currentUser.coins < 1) {
      showAlert('Coins Required', 'Rewind costs 1 coin. Top up to undo your last choice!');
      return;
    }
    if (!currentUser.isPremium) onDeductCoin();
    setCurrentIndex(prev => prev - 1);
  }, [currentIndex, currentUser, onDeductCoin, showAlert]);

  // ── Touch / swipe gestures ──────────────────────────────────────────────

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if      (diff >  50) handlePass();
    else if (diff < -50) handleLike();
  };

  // ── Double tap to like ──────────────────────────────────────────────────

  const addHeart = useCallback((x: number, y: number) => {
    const id = `heart-${Date.now()}-${Math.random()}`;
    setHearts(prev => [...prev, { id, x, y }]);
    setTimeout(() => setHearts(prev => prev.filter(h => h.id !== id)), 1000);
  }, []);

  const handleCardTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const now      = Date.now();
    const timeDiff = now - lastTapTime;

    if (timeDiff < 300 && tapCount > 0) {
      // Double tap
      if (cardRef.current) {
        const rect   = cardRef.current.getBoundingClientRect();
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

  // ── Match modal ────────────────────────────────────────────────────────

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

  // ── Early returns (loading / error / empty states) ──────────────────────

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-gray-500 font-medium">Finding potential matches...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-screen p-8 text-center bg-white md:bg-gray-50 pb-24 md:pb-8">
      <div className="bg-rose-50 p-6 rounded-full mb-4 shadow-inner">
        <i className="fa-solid fa-exclamation-circle text-4xl text-rose-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800">Oops!</h2>
      <p className="text-gray-500 mt-2 max-w-xs leading-relaxed">{error}</p>
      <div className="flex gap-3 mt-6">
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="px-10 py-3 spark-gradient text-white rounded-full font-bold shadow-xl active:scale-95 transition-transform disabled:opacity-50"
        >
          {retrying ? (
            <>
              <i className="fa-solid fa-spinner animate-spin mr-2" />
              Retrying...
            </>
          ) : (
            'Retry'
          )}
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-10 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-full font-bold transition-colors"
        >
          Full Reload
        </button>
      </div>
    </div>
  );

  if (filteredProfiles.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white md:bg-gray-50">
      <div className="bg-blue-50 p-6 rounded-full mb-4 shadow-inner">
        <i className="fa-solid fa-users text-4xl text-blue-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800">You have finished potential matches</h2>
      <p className="text-gray-500 mt-2 max-w-xs leading-relaxed">
        {showAllMembers 
          ? 'You\'re viewing all members in the database. Keep discovering!' 
          : 'You\'ve reviewed all potential matches. Browse all members to continue matching!'}
      </p>
      <div className="mt-6 flex gap-3 flex-wrap justify-center">
        {!showAllMembers && (
          <button
            onClick={() => setShowAllMembers(true)}
            className="px-10 py-3 spark-gradient text-white rounded-full font-bold shadow-xl active:scale-95 transition-transform"
          >
            Browse All Members
          </button>
        )}
        <button
          onClick={refreshProfilesOnly}
          className="px-10 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-full font-bold transition-colors"
        >
          {showAllMembers ? 'Refresh' : 'Retry'}
        </button>
      </div>
    </div>
  );

  if (profiles.length > 0 && profiles.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white md:bg-gray-50">
      <div className="bg-gray-100 p-6 rounded-full mb-4 shadow-inner">
        <i className="fa-solid fa-magnifying-glass text-4xl text-gray-400" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800">No results for "{query}"</h2>
      <p className="text-gray-500 mt-2 max-w-xs leading-relaxed">Try a different username or full name.</p>
      <div className="flex gap-3 mt-6">
        <button onClick={() => setQuery('')} className="px-6 py-3 bg-white border rounded-lg font-bold">
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

  // Don't show full-screen loading state - let user keep swiping while we load in background
  // Just show a subtle indicator at the top instead

  if (currentIndex >= filteredProfiles.length) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white md:bg-gray-50">
      <div className="bg-rose-50 p-6 rounded-full mb-4 shadow-inner">
        <i className="fa-solid fa-location-dot text-4xl text-rose-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800">No more new profiles</h2>
      <p className="text-gray-500 mt-2 max-w-xs leading-relaxed">You've reviewed everyone in your area. Refresh to see profiles again!</p>
      <div className="flex gap-3 flex-col sm:flex-row mt-6 w-full sm:w-auto">
        <button
          onClick={() => { setQuery(''); setCurrentIndex(0); setCurrentBatch(0); setProfiles([]); }}
          className="px-10 py-3 spark-gradient text-white rounded-full font-bold shadow-xl active:scale-95 transition-transform flex-1 sm:flex-auto"
        >
          Refresh Discovery
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-10 py-3 border-2 border-rose-500 text-rose-500 rounded-full font-bold hover:bg-rose-50 active:scale-95 transition-transform flex-1 sm:flex-auto"
        >
          Reload App
        </button>
      </div>
    </div>
  );

  // ── Current profile ────────────────────────────────────────────────────

  const matchScore = getMatchScore(currentProfile);
  const distance   = getDistance(currentProfile);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      {/* Background loading indicator - subtle progress bar at top */}
      {isLoadingMore && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 animate-pulse z-50" />
      )}

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
            <button onClick={() => setQuery('')} className="ml-2 px-3 py-2 bg-white border rounded-full text-sm">
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

      <div className="h-screen flex flex-col items-center justify-start md:justify-center p-2 md:p-4 bg-white md:bg-gray-50 pt-2 md:pt-4 pb-24 md:pb-4">
        <div className="w-full flex-1 md:h-full max-w-sm md:max-w-2xl md:max-h-[90vh] flex flex-col relative group">

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
                  onFocus={() => setShowSearchResults(true)}
                />
                <button
                  onClick={() => {
                    setSearchOpen(false);
                    setQuery('');
                    setShowSearchResults(false);
                  }}
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
                    <i className="fa-solid fa-location-crosshairs text-rose-500" />
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
                                ? 'bg-rose-100 text-rose-700 font-bold border border-rose-300'
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
            className="flex-1 relative cursor-pointer select-none mx-2 md:mx-0"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={handleCardTap}
          >
            <div className="absolute inset-0 bg-gray-300 rounded-3xl overflow-hidden swipe-card ring-1 ring-black/5" style={{
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
            }}>

              {/* Skeleton while image loads */}
              {!imgLoaded && <ProfileImageSkeleton />}

              {/* Image progress indicator bars */}
              {currentProfile?.images && currentProfile?.images.length > 1 && (
                <div className="absolute top-0 left-0 right-0 flex gap-1 px-3 pt-3 z-20 pointer-events-none">
                  {currentProfile?.images.map((_, idx) => {
                    const isCurrentVideo = isVideoUrl(currentProfile?.images?.[idx]);
                    return (
                      <div
                        key={idx}
                        className="h-1 flex-1 rounded-full transition-all bg-white/40 relative group"
                        style={{
                          backgroundColor: idx === currentImageIndex ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.4)',
                        }}
                      >
                        {/* Video badge on progress bar */}
                        {isCurrentVideo && idx === currentImageIndex && (
                          <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-1 shadow-lg group-hover:bg-blue-600 transition-colors">
                            <i className="fa-solid fa-play text-white text-xs"></i>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Video indicator badge for current media */}
              {currentProfile?.images?.[currentImageIndex] && isVideoUrl(currentProfile?.images?.[currentImageIndex]) && (
                <div className="absolute top-4 right-4 bg-blue-500/90 text-white px-3 py-1 rounded-full flex items-center gap-2 z-20 shadow-lg backdrop-blur-sm">
                  <i className="fa-solid fa-play text-sm"></i>
                  <span className="text-xs font-semibold">Video</span>
                </div>
              )}

              {/* Left tap zone */}
              {currentProfile?.images && currentProfile?.images.length > 1 && (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevImage();
                  }}
                  className="absolute left-0 top-0 bottom-0 w-20 z-10 cursor-pointer hover:bg-black/10 transition-colors"
                />
              )}

              {/* Right tap zone */}
              {currentProfile?.images && currentProfile?.images.length > 1 && (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNextImage();
                  }}
                  className="absolute right-0 top-0 bottom-0 w-20 z-10 cursor-pointer hover:bg-black/10 transition-colors"
                />
              )}

              {currentProfile?.images?.[currentImageIndex] ? (
                (() => {
                  const mediaUrl = currentProfile?.images?.[currentImageIndex];
                  const isVideo = isVideoUrl(mediaUrl);
                  const validatedUrl = isVideo ? validateVideoUrl(mediaUrl) : validateImageUrl(mediaUrl);
                  const mediaCacheKey = `${currentProfile?.id}-${currentImageIndex}`;
                  const isFailed = failedImages.has(mediaCacheKey);
                  
                  if (!validatedUrl || isFailed) {
                    console.warn(`[SwiperScreen] ${isFailed ? 'Failed to load' : 'No valid'} media URL for profile ${currentProfile?.id} at index ${currentImageIndex}`);
                    return (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 p-6">
                        <div className="text-6xl mb-4">{isVideo ? '🎬' : '📷'}</div>
                        <h2 className="text-3xl font-bold text-white text-center mb-2">{currentProfile?.name}</h2>
                        <p className="text-xl text-white/80 font-semibold mb-4">{currentProfile?.age}</p>
                        <p className="text-sm text-white/60 text-center max-w-xs mb-6">{currentProfile?.location}</p>
                        <p className="text-xs text-white/50 text-center">{isFailed ? 'Media failed to load' : 'Media data unavailable'}</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="relative w-full h-full bg-gradient-to-br from-slate-700 to-slate-800">
                      {/* Loading skeleton - always visible as background */}
                      {!imgLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-700 animate-pulse">
                          <div className="text-white/40">
                            <div className="animate-spin h-12 w-12 border-4 border-white/10 border-t-white/40 rounded-full mx-auto mb-2"></div>
                            <p className="text-sm">Loading...</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Video - silent autoplay when loaded */}
                      {isVideo ? (
                        <video
                          key={mediaCacheKey}
                          src={validatedUrl}
                          autoPlay
                          muted
                          loop
                          playsInline
                          onLoadedData={() => {
                            console.log('[SwiperScreen] Video loaded successfully:', mediaCacheKey);
                            setImgLoaded(true);
                          }}
                          onError={() => {
                            console.warn('[SwiperScreen] Video failed to load:', mediaCacheKey, 'URL:', validatedUrl);
                            setFailedImages(prev => new Set([...prev, mediaCacheKey]));
                            setImgLoaded(true);
                          }}
                          className="w-full h-full object-cover select-none transition-opacity duration-500"
                          style={{
                            opacity: imgLoaded ? 1 : 0,
                            width: '100%',
                            height: '100%',
                            position: 'absolute',
                            top: 0,
                            left: 0
                          }}
                        />
                      ) : (
                        /* Image - fades in when loaded */
                        <img
                          key={mediaCacheKey}
                          src={validatedUrl}
                          alt={`${currentProfile?.name} - photo ${currentImageIndex + 1}`}
                          onLoad={() => {
                            console.log('[SwiperScreen] Image loaded successfully:', mediaCacheKey);
                            setImgLoaded(true);
                          }}
                          onError={() => {
                            console.warn('[SwiperScreen] Image failed to load:', mediaCacheKey, 'URL:', validatedUrl);
                            setFailedImages(prev => new Set([...prev, mediaCacheKey]));
                            setImgLoaded(true);
                          }}
                          className="w-full h-full object-cover select-none transition-opacity duration-500"
                          loading="eager"
                          decoding="async"
                          style={{
                            opacity: imgLoaded ? 1 : 0,
                            width: '100%',
                            height: '100%',
                            position: 'absolute',
                            top: 0,
                            left: 0
                          }}
                        />
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 p-6">
                  <div className="text-6xl mb-4">👤</div>
                  <h2 className="text-3xl font-bold text-white text-center mb-2">{currentProfile?.name}</h2>
                  <p className="text-xl text-white/80 font-semibold mb-4">{currentProfile?.age}</p>
                  <p className="text-sm text-white/60 text-center max-w-xs mb-6">{currentProfile?.location}</p>
                  <p className="text-xs text-white/50 text-center">No photos available</p>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent pointer-events-none" />

              {/* Hearts */}
              <div className="absolute inset-0 pointer-events-none">
                {hearts.map(heart => (
                  <div
                    key={heart.id}
                    className="absolute"
                    style={{ left: heart.x, top: heart.y, animation: 'heartFloat 1s ease-out forwards' }}
                  >
                    <i className="fa-solid fa-heart text-rose-500 text-5xl drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 12px rgba(244,63,94,0.8))' }} />
                  </div>
                ))}
              </div>

              {/* Double-tap hint */}
              {tapCount > 0 && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="text-white text-sm font-bold bg-black/60 px-4 py-2 rounded-full backdrop-blur-md">
                    👆 Tap again to like!
                  </div>
                </div>
              )}

              {/* Profile info overlay - Tinder style */}
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 text-white">
                <div className="flex items-end gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight truncate">
                      {currentProfile?.username || currentProfile?.name}
                    </h2>
                    <p className="text-xl md:text-2xl font-semibold text-white/90">{currentProfile?.age}</p>
                  </div>
                  {currentProfile?.isPremium && (
                    <span className="premium-gradient px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest text-white shadow-lg flex-shrink-0">
                      Premium
                    </span>
                  )}
                </div>

                {/* Match score + distance - compact badges */}
                <div className="mb-3 md:mb-4 flex items-center gap-2 flex-wrap">
                  <div className="bg-white/25 backdrop-blur-lg ring-1 ring-white/50 px-3 md:px-3.5 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-bold flex items-center gap-1.5">
                    <i className="fa-solid fa-heart text-pink-200" />
                    <span>{matchScore}% Match</span>
                  </div>
                  {distance !== null && (
                    <div className="bg-white/25 backdrop-blur-lg ring-1 ring-white/50 px-3 md:px-3.5 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-bold flex items-center gap-1.5">
                      <i className="fa-solid fa-location-dot text-blue-200" />
                      <span>{distance < 1 ? '<1 km' : `${Math.round(distance)} km`}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs md:text-sm text-gray-200 mb-2 md:mb-3">
                  <i className="fa-solid fa-location-arrow text-[9px] md:text-[10px]" />
                  <span className="font-medium truncate">{currentProfile?.location}</span>
                </div>

                {currentProfile?.bio && (
                  <p className="text-xs md:text-sm line-clamp-2 text-gray-100 mb-3 md:mb-4 leading-relaxed">{currentProfile?.bio}</p>
                )}

                {/* Interests pills */}
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  {currentProfile?.interests?.slice(0, 6).map(interest => (
                    <span
                      key={interest}
                      className={`px-3 py-1 md:px-3.5 md:py-1.5 rounded-full text-[9px] md:text-xs font-semibold transition-colors ${
                        currentUser.interests.includes(interest)
                          ? 'bg-emerald-500/40 ring-1 ring-emerald-300/60 text-white'
                          : 'bg-white/20 ring-1 ring-white/30 text-white/90'
                      }`}
                    >
                      {interest}
                    </span>
                  ))}
                </div>

                <div className="hidden md:flex gap-3 mt-4">
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-lg ring-1 ring-white/50 py-2.5 rounded-full text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-eye text-sm" />
                    View Profile
                  </button>
                  <button
                    onClick={() => navigate(`/chat/${currentProfile?.id}`, { state: { matchedProfile: currentProfile } })}
                    className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-lg ring-1 ring-white/50 py-2.5 rounded-full text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-message text-sm" />
                    Message
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Action Controls - Tinder Style ── */}
          <div className="flex justify-center items-center gap-3 md:gap-6 mt-6 md:mt-8 pb-4 md:pb-8 px-2 md:px-0">
            <ActionButton
              onClick={handleRewind}
              icon="fa-rotate-left"
              color="text-amber-500"
              hoverBg="hover:bg-amber-50"
              title="Rewind (1 Coin)"
              coinCost={!currentUser.isPremium}
              coinColor="amber"
              glowColor="amber"
              size="sm"
            />
            <ActionButton
              onClick={handlePass}
              icon="fa-xmark"
              color="text-rose-500"
              hoverBg="hover:bg-rose-50"
              size="lg"
              glowColor="rose"
            />
            <ActionButton
              onClick={handleSuperLike}
              icon="fa-star"
              color="text-purple-500"
              hoverBg="hover:bg-purple-50"
              title="Super Like (1 Coin)"
              coinCost={!currentUser.isPremium}
              coinColor="purple"
              glowColor="purple"
              size="sm"
              superlikeCount={likeStats?.totalSuperLikes}
            />
            <ActionButton
              onClick={handleLike}
              icon="fa-heart"
              color="text-pink-500"
              hoverBg="hover:bg-pink-50"
              size="lg"
              title="Like"
              glowColor="pink"
              likeCount={likeStats?.totalLikes}
            />
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && currentProfile && (
        <UserProfileModal
          user={currentProfile}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* Match Modal */}
      {matchedUser && (
        <MatchModal
          isOpen={showMatchModal}
          matchedUser={matchedUser}
          interestMatch={interestMatch}
          onClose={handleMatchModalClose}
          onMessage={handleMatchMessage}
        />
      )}

      {/* Search Suggestions Modal */}
      <SearchSuggestions
        query={query}
        profiles={profiles}
        onSelectProfile={handleSelectFromSearch}
        onClose={() => {
          setSearchOpen(false);
          setQuery('');
          setShowSearchResults(false);
        }}
        isOpen={showSearchResults}
      />
    </>
  );
};

export default SwiperScreen;
