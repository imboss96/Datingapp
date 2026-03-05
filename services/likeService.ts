/**
 * Like Service - Handles storing likes from the swipe screen
 * Manages like interactions, match detection, and notifications
 */

import apiClient from './apiClient';

export interface LikeResponse {
  matched: boolean;
  message: string;
  interestMatch?: number;
  ageMatch?: number;
  overallScore?: number;      // composite 0–100 from multi-factor algorithm
  proximityScore?: number;
  recencyScore?: number;
  trustScore?: number;
  bioScore?: number;
  distKm?: number | null;
  matchId?: string;
  matchedUser?: {
    id: string;
    name: string;
    profilePicture: string;
    location: string;
    interests: string[];
    bio?: string;
    age?: number;
  };
  isDemoMatch?: boolean;
  mutualInterests?: string[];
}

export interface LikeError {
  message: string;
  status?: number;
  code?: string;
}

/**
 * Store a like when user swipes right on a profile
 * 
 * @param userId - The ID of the user who is liking
 * @param targetUserId - The ID of the profile being liked
 * @returns Promise with match details if mutual like, or confirmation of like stored
 * @throws Error if the like could not be stored
 */
export async function storeLike(userId: string, targetUserId: string): Promise<LikeResponse> {
  try {
    if (!userId || !targetUserId) {
      throw new Error('User ID and target user ID are required');
    }

    console.log(`[Like Service] Storing like from ${userId} to ${targetUserId}`);

    const response = await apiClient.recordSwipe(userId, targetUserId, 'like');
    console.log(`[Like Service] recordSwipe response:`, response);

    if (response.matched && response.matchedUser) {
      console.log(`[Like Service] ✨ MATCH! ${response.message}`);
      return {
        matched: true,
        message: response.message,
        interestMatch: response.interestMatch,
        ageMatch: response.ageMatch,
        matchId: response.matchId,
        matchedUser: response.matchedUser,
        isDemoMatch: response.isDemoMatch,
        mutualInterests: response.mutualInterests,
      };
    }

    console.log(`[Like Service] Like stored. Waiting for mutual like...`);
    return {
      matched: false,
      message: response.message || 'Like recorded successfully',
      interestMatch: response.interestMatch,
      ageMatch: response.ageMatch,
      mutualInterests: response.mutualInterests,
    };
  } catch (error) {
    const err = error as any;
    const errorMessage = err.message || 'Failed to store like';
    const status = err.status || 500;

    // Don't log "Already swiped" as an error - it's a normal case
    if (!errorMessage.includes('Already swiped')) {
      console.error(`[Like Service] Error storing like:`, {
        message: errorMessage,
        status,
        targetUserId,
        userId,
      });
    }

    throw {
      message: errorMessage,
      status,
      code: err.code,
    } as LikeError;
  }
}

/**
 * Store a super like (costs coins)
 * 
 * @param userId - The ID of the user who is super liking
 * @param targetUserId - The ID of the profile being super liked
 * @returns Promise with match details if mutual like, or confirmation of super like stored
 * @throws Error if the super like could not be stored
 */
export async function storeSuperLike(userId: string, targetUserId: string): Promise<LikeResponse> {
  try {
    if (!userId || !targetUserId) {
      throw new Error('User ID and target user ID are required');
    }

    console.log(`[Like Service] Storing super like from ${userId} to ${targetUserId}`);

    const response = await apiClient.recordSwipe(userId, targetUserId, 'superlike');

    if (response.matched && response.matchedUser) {
      console.log(`[Like Service] ✨ MATCH from Super Like! ${response.message}`);
      return {
        matched: true,
        message: response.message,
        interestMatch: response.interestMatch,
        ageMatch: response.ageMatch,
        matchId: response.matchId,
        matchedUser: response.matchedUser,
        isDemoMatch: response.isDemoMatch,
        mutualInterests: response.mutualInterests,
      };
    }

    console.log(`[Like Service] Super like stored`);
    return {
      matched: false,
      message: response.message || 'Super like recorded successfully',
      interestMatch: response.interestMatch,
      ageMatch: response.ageMatch,
      mutualInterests: response.mutualInterests,
    };
  } catch (error) {
    const err = error as any;
    const errorMessage = err.message || 'Failed to store super like';
    const status = err.status || 500;

    // Don't log "Already swiped" as an error - it's a normal case
    if (!errorMessage.includes('Already swiped')) {
      console.error(`[Like Service] Error storing super like:`, {
        message: errorMessage,
        status,
        targetUserId,
        userId,
      });
    }

    throw {
      message: errorMessage,
      status,
      code: err.code,
    } as LikeError;
  }
}

/**
 * Store a pass (user swiped left)
 * 
 * @param userId - The ID of the user who is passing
 * @param targetUserId - The ID of the profile being passed
 * @returns Promise with confirmation
 */
export async function storePass(userId: string, targetUserId: string): Promise<void> {
  try {
    if (!userId || !targetUserId) {
      throw new Error('User ID and target user ID are required');
    }

    console.log(`[Like Service] Storing pass from ${userId} on ${targetUserId}`);

    await apiClient.recordSwipe(userId, targetUserId, 'pass');

    console.log(`[Like Service] Pass recorded`);
  } catch (error) {
    const err = error as any;
    const errorMessage = err.message || 'Failed to store pass';
    const status = err.status || 500;

    // Don't log "Already swiped" as an error - it's a normal case
    if (!errorMessage.includes('Already swiped')) {
      console.error(`[Like Service] Error storing pass:`, {
        message: errorMessage,
        status,
        targetUserId,
        userId,
      });
    }

    throw {
      message: errorMessage,
      status,
      code: err.code,
    } as LikeError;
  }
}

/**
 * Check if like was successful (for polling/retry logic)
 */
export function isLikeSuccessful(response: LikeResponse): boolean {
  return response.matched || response.message.toLowerCase().includes('recorded');
}

/**
 * Format match message for display
 */
export function formatMatchMessage(response: LikeResponse): string {
  if (!response.matched) {
    return response.message || 'Like recorded!';
  }

  if (response.isDemoMatch) {
    return `🎉 Demo Match!\n${response.interestMatch}% interests • ${Math.round(response.ageMatch || 0)}% age match`;
  }

  return `🎉 It's a match!\n${response.interestMatch}% interests • ${Math.round(response.ageMatch || 0)}% age match`;
}

export default {
  storeLike,
  storeSuperLike,
  storePass,
  isLikeSuccessful,
  formatMatchMessage,
};
