/**
 * Multi-Factor Matching Algorithm
 *
 * Unified scoring engine used to rank profiles on the Swipe screen.
 * Maximum composite score: 100 points.
 *
 * Factor Weights
 * ─────────────────────────────────
 *   Shared Interests   30 pts  (Jaccard similarity)
 *   Age Compatibility  20 pts  (linear decay)
 *   Proximity          20 pts  (tiered km-based)
 *   Online Recency     15 pts  (activity freshness)
 *   Profile Trust      10 pts  (verification + quality)
 *   Bio Keywords        5 pts  (text overlap bonus)
 * ─────────────────────────────────
 *   TOTAL             100 pts
 */

import { UserProfile } from '../types';
import { calculateDistance } from './distanceUtils';

// ─── Sub-score interfaces ────────────────────────────────────────────────────

export interface ScoreBreakdown {
  total: number;
  interests: number;   // 0–30
  age: number;         // 0–20
  proximity: number;   // 0–20
  recency: number;     // 0–15
  trust: number;       // 0–10
  bio: number;         // 0–5
  mutualInterests: string[];
  proximityKm: number | null;
}

// ─── English stopwords (bio keyword extraction) ───────────────────────────────

const STOPWORDS = new Set([
  'i', 'a', 'an', 'the', 'and', 'or', 'but', 'to', 'of', 'in', 'for', 'on',
  'at', 'by', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'my', 'me',
  'you', 'your', 'we', 'our', 'he', 'she', 'it', 'they', 'this', 'that',
  'with', 'from', 'do', 'not', 'so', 'if', 'as', 'up', 'out', 'all',
  'have', 'has', 'had', 'get', 'got', 'can', 'just', 'who', 'what', 'how',
  'will', 'would', 'could', 'should', 'like', 'about', 'also', 'very',
]);

// ─── Factor 1: Shared Interests (0–30 pts) ───────────────────────────────────

/**
 * Uses the Jaccard similarity coefficient so that short and long lists are
 * treated fairly: score = |intersection| / |union| × 30
 */
export const calcInterestScore = (
  profile: UserProfile,
  currentUser: UserProfile,
): { score: number; mutual: string[] } => {
  const a = new Set(currentUser.interests ?? []);
  const b = new Set(profile.interests ?? []);

  if (a.size === 0 || b.size === 0) return { score: 0, mutual: [] };

  const mutual: string[] = [...b].filter(i => a.has(i));
  const union = new Set([...a, ...b]).size;
  const jaccard = mutual.length / union;

  return {
    score: Math.round(jaccard * 30),
    mutual,
  };
};

// ─── Factor 2: Age Compatibility (0–20 pts) ──────────────────────────────────

/**
 * Linear decay: score = max(0, 20 − |ageDiff|)
 * Zero age gap → 20 pts; 20+ year gap → 0 pts.
 */
export const calcAgeScore = (
  profile: UserProfile,
  currentUser: UserProfile,
): number => {
  if (!profile.age || !currentUser.age) return 0;
  const diff = Math.abs(profile.age - currentUser.age);
  return Math.max(0, 20 - diff);
};

// ─── Factor 3: Geographic Proximity (0–20 pts) ───────────────────────────────

/**
 * Tiered distance scoring. Returns score and distance in km (or null).
 */
export const calcProximityScore = (
  profile: UserProfile,
  currentUser: UserProfile,
): { score: number; distKm: number | null } => {
  if (!currentUser.coordinates || !profile.coordinates) {
    return { score: 0, distKm: null };
  }

  const distKm = calculateDistance(currentUser.coordinates, profile.coordinates);

  let score = 0;
  if      (distKm <=    5) score = 20;
  else if (distKm <=   25) score = 15;
  else if (distKm <=  100) score = 10;
  else if (distKm <=  500) score =  5;
  else if (distKm <= 1000) score =  2;
  // > 1000 km → 0

  return { score, distKm };
};

// ─── Factor 4: Online Recency (0–15 pts) ─────────────────────────────────────

const ONE_HOUR  = 3_600_000;
const ONE_DAY   = 86_400_000;
const ONE_WEEK  = 604_800_000;

export const calcRecencyScore = (profile: UserProfile): number => {
  if (profile.isOnline) return 15;

  const lastSeen = profile.lastSeen; // millisecond epoch
  if (!lastSeen) return 0;

  const elapsed = Date.now() - lastSeen;
  if      (elapsed < ONE_HOUR)  return 12;
  if      (elapsed < ONE_DAY)   return  8;
  if      (elapsed < ONE_WEEK)  return  3;
  return 0;
};

// ─── Factor 5: Profile Trust & Quality (0–10 pts) ────────────────────────────

export const calcTrustScore = (profile: UserProfile): number => {
  let score = 0;
  if (profile.isPhotoVerified)                                         score += 3;
  if (profile.verification?.status === 'VERIFIED')                     score += 3;
  if (profile.images && profile.images.length >= 3)                    score += 2;
  if (profile.bio   && profile.bio.trim().length  >= 30)               score += 1;
  if (profile.emailVerified)                                           score += 1;
  return score;
};

// ─── Factor 6: Bio Keyword Similarity (0–5 pts) ──────────────────────────────

const extractKeywords = (bio: string): Set<string> => {
  return new Set(
    bio
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w)),
  );
};

export const calcBioScore = (
  profile: UserProfile,
  currentUser: UserProfile,
): number => {
  if (!profile.bio || !currentUser.bio) return 0;
  const kw1 = extractKeywords(currentUser.bio);
  const kw2 = extractKeywords(profile.bio);
  const common = [...kw2].filter(w => kw1.has(w)).length;
  return Math.min(common, 5);
};

// ─── Composite Score ─────────────────────────────────────────────────────────

/**
 * Calculates the full score breakdown for a candidate profile relative to
 * the currently logged-in user. The total is the number used for sorting.
 */
export const getScoreBreakdown = (
  profile: UserProfile,
  currentUser: UserProfile,
): ScoreBreakdown => {
  const { score: interestScore, mutual } = calcInterestScore(profile, currentUser);
  const ageScore                         = calcAgeScore(profile, currentUser);
  const { score: proxScore, distKm }     = calcProximityScore(profile, currentUser);
  const recencyScore                     = calcRecencyScore(profile);
  const trustScore                       = calcTrustScore(profile);
  const bioScore                         = calcBioScore(profile, currentUser);

  return {
    total:           interestScore + ageScore + proxScore + recencyScore + trustScore + bioScore,
    interests:       interestScore,
    age:             ageScore,
    proximity:       proxScore,
    recency:         recencyScore,
    trust:           trustScore,
    bio:             bioScore,
    mutualInterests: mutual,
    proximityKm:     distKm,
  };
};

/**
 * Convenience function — returns the composite score only (0–100).
 * Drop-in replacement for the old calcMatchScore in SwiperScreen.tsx.
 */
export const calcMatchScore = (
  profile: UserProfile,
  currentUser: UserProfile,
): number => getScoreBreakdown(profile, currentUser).total;

/**
 * Returns a human-readable compatibility label.
 */
export const getCompatibilityLabel = (score: number): { label: string; color: string } => {
  if (score >= 75) return { label: 'Excellent Match', color: 'text-emerald-500' };
  if (score >= 55) return { label: 'Great Match',    color: 'text-green-500'   };
  if (score >= 35) return { label: 'Good Match',     color: 'text-amber-500'   };
  if (score >= 15) return { label: 'Some Overlap',   color: 'text-orange-400'  };
  return                   { label: 'New Profile',   color: 'text-gray-400'    };
};
