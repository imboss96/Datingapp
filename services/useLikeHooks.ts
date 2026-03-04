import { useState, useEffect, useCallback } from 'react';
import apiClient from './apiClient';

export interface LikeStats {
  profileUserId: string;
  totalLikes: number;
  totalSuperLikes: number;
  totalInteractions: number;
  recentLikers: Array<{
    likerUserId: string;
    likeType: 'like' | 'superlike';
    createdAt: string;
  }>;
}

export interface LikeStatus {
  hasLiked: boolean;
  likeType: 'like' | 'superlike' | null;
}

/**
 * Custom hook to manage like statistics for a profile
 * @param profileUserId - The user profile to get stats for
 * @returns Object with like stats and loading state
 */
export const useLikeStats = (profileUserId: string | null) => {
  const [stats, setStats] = useState<LikeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!profileUserId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getLikeStats(profileUserId);
      console.log(`[useLikeStats] Fetched stats for ${profileUserId}:`, data);
      setStats(data);
    } catch (err: any) {
      console.error('[useLikeStats] Error fetching stats:', err);
      setError(err?.message || 'Failed to fetch like stats');
    } finally {
      setLoading(false);
    }
  }, [profileUserId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
};

/**
 * Custom hook to check if current user has liked a profile
 * @param profileUserId - The user profile to check
 * @returns Object with like status and loading state
 */
export const useHasLiked = (profileUserId: string | null) => {
  const [hasLiked, setHasLiked] = useState<LikeStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkLike = useCallback(async () => {
    if (!profileUserId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.checkHasLiked(profileUserId);
      setHasLiked(data);
    } catch (err: any) {
      console.error('[useHasLiked] Error checking like:', err);
      setError(err?.message || 'Failed to check like status');
    } finally {
      setLoading(false);
    }
  }, [profileUserId]);

  useEffect(() => {
    checkLike();
  }, [checkLike]);

  return { hasLiked, loading, error, refetch: checkLike };
};

/**
 * Custom hook to manage liking/unliking a profile
 * @returns Object with like/unlike functions and loading state
 */
export const useLikeProfile = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const like = useCallback(async (profileUserId: string, likeType: 'like' | 'superlike' = 'like') => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.recordLike(profileUserId, likeType);
      console.log(`[useLikeProfile] ${likeType} recorded successfully`, result);
      return result;
    } catch (err: any) {
      const message = err?.message || `Failed to ${likeType} profile`;
      console.error(`[useLikeProfile] Error ${likeType}ing:`, err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const unlike = useCallback(async (profileUserId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.unlikeProfile(profileUserId);
      console.log('[useLikeProfile] Unlike recorded successfully', result);
      return result;
    } catch (err: any) {
      const message = err?.message || 'Failed to unlike profile';
      console.error('[useLikeProfile] Error unliking:', err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { like, unlike, loading, error };
};

/**
 * Custom hook to get all likes given by current user
 * @returns Object with given likes and loading state
 */
export const useGivenLikes = () => {
  const [likes, setLikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGivenLikes = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getGivenLikes();
        setLikes(data.likes || []);
      } catch (err: any) {
        console.error('[useGivenLikes] Error:', err);
        setError(err?.message || 'Failed to fetch given likes');
      } finally {
        setLoading(false);
      }
    };

    fetchGivenLikes();
  }, []);

  return { likes, loading, error };
};

/**
 * Custom hook to get all likes received by current user
 * @returns Object with received likes and loading state
 */
export const useReceivedLikes = () => {
  const [likes, setLikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReceivedLikes = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getReceivedLikes();
        setLikes(data.likes || []);
      } catch (err: any) {
        console.error('[useReceivedLikes] Error:', err);
        setError(err?.message || 'Failed to fetch received likes');
      } finally {
        setLoading(false);
      }
    };

    fetchReceivedLikes();
  }, []);

  return { likes, loading, error };
};
