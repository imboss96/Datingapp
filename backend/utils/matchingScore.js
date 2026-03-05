/**
 * backend/utils/matchingScore.js
 *
 * Multi-Factor Matching Algorithm — Backend Mirror
 *
 * Mirrors services/matchingAlgorithm.ts so front-end and back-end use
 * identical scoring logic.  Maximum composite score: 100 points.
 *
 * Factor Weights
 * ─────────────────────────────────
 *   Shared Interests   30 pts  (Jaccard similarity)
 *   Age Compatibility  20 pts  (linear decay)
 *   Proximity          20 pts  (tiered km-based via Haversine)
 *   Online Recency     15 pts  (activity freshness)
 *   Profile Trust      10 pts  (verification + quality)
 *   Bio Keywords        5 pts  (text overlap bonus)
 * ─────────────────────────────────
 *   TOTAL             100 pts
 */

// ─── Haversine distance (km) ─────────────────────────────────────────────────

/**
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in km
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a    =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── English stopwords ───────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'i', 'a', 'an', 'the', 'and', 'or', 'but', 'to', 'of', 'in', 'for', 'on',
  'at', 'by', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'my', 'me',
  'you', 'your', 'we', 'our', 'he', 'she', 'it', 'they', 'this', 'that',
  'with', 'from', 'do', 'not', 'so', 'if', 'as', 'up', 'out', 'all',
  'have', 'has', 'had', 'get', 'got', 'can', 'just', 'who', 'what', 'how',
  'will', 'would', 'could', 'should', 'like', 'about', 'also', 'very',
]);

// ─── Factor helpers ───────────────────────────────────────────────────────────

/**
 * Factor 1 — Jaccard-based interest similarity (0–30 pts)
 * @param {string[]} a
 * @param {string[]} b
 * @returns {{ score: number, mutualInterests: string[] }}
 */
function calcInterestScore(a, b) {
  if (!a?.length || !b?.length) return { score: 0, mutualInterests: [] };

  const setA = new Set(a);
  const setB = new Set(b);
  const mutual = [...setB].filter(i => setA.has(i));
  const union  = new Set([...setA, ...setB]).size;

  return {
    score:           Math.round((mutual.length / union) * 30),
    mutualInterests: mutual,
  };
}

/**
 * Factor 2 — Age compatibility (0–20 pts)
 * @param {number} age1
 * @param {number} age2
 * @returns {number}
 */
function calcAgeScore(age1, age2) {
  if (!age1 || !age2) return 0;
  return Math.max(0, 20 - Math.abs(age1 - age2));
}

/**
 * Factor 3 — Geographic proximity (0–20 pts)
 * Accepts GeoJSON-style coords { type, coordinates: [lon, lat] }
 * or plain { latitude, longitude } objects.
 *
 * @param {object|null} coords1
 * @param {object|null} coords2
 * @returns {{ score: number, distKm: number|null }}
 */
function calcProximityScore(coords1, coords2) {
  if (!coords1 || !coords2) return { score: 0, distKm: null };

  // Normalise both coordinate formats
  const extract = c => {
    if (c.latitude  !== undefined) return { lat: c.latitude,  lon: c.longitude  };
    if (c.coordinates)             return { lat: c.coordinates[1], lon: c.coordinates[0] };
    return null;
  };

  const p1 = extract(coords1);
  const p2 = extract(coords2);
  if (!p1 || !p2) return { score: 0, distKm: null };

  const distKm = haversineKm(p1.lat, p1.lon, p2.lat, p2.lon);

  let score = 0;
  if      (distKm <=    5) score = 20;
  else if (distKm <=   25) score = 15;
  else if (distKm <=  100) score = 10;
  else if (distKm <=  500) score =  5;
  else if (distKm <= 1000) score =  2;

  return { score, distKm };
}

const ONE_HOUR = 3_600_000;
const ONE_DAY  = 86_400_000;
const ONE_WEEK = 604_800_000;

/**
 * Factor 4 — Online recency (0–15 pts)
 * @param {boolean}  isOnline
 * @param {Date|number|null} lastActiveAt
 * @returns {number}
 */
function calcRecencyScore(isOnline, lastActiveAt) {
  if (isOnline) return 15;
  if (!lastActiveAt) return 0;

  const ts      = lastActiveAt instanceof Date ? lastActiveAt.getTime() : Number(lastActiveAt);
  const elapsed = Date.now() - ts;

  if (elapsed < ONE_HOUR)  return 12;
  if (elapsed < ONE_DAY)   return  8;
  if (elapsed < ONE_WEEK)  return  3;
  return 0;
}

/**
 * Factor 5 — Profile trust & quality (0–10 pts)
 * @param {object} user  Mongoose user document as plain object
 * @returns {number}
 */
function calcTrustScore(user) {
  let score = 0;
  if (user.isPhotoVerified)                         score += 3;
  if (user.verificationStatus === 'VERIFIED')       score += 3;
  if (user.images?.length >= 3)                     score += 2;
  if (user.bio?.trim().length >= 30)                score += 1;
  if (user.emailVerified)                           score += 1;
  return score;
}

/**
 * Factor 6 — Bio keyword similarity (0–5 pts)
 * @param {string|null} bio1
 * @param {string|null} bio2
 * @returns {number}
 */
function calcBioScore(bio1, bio2) {
  if (!bio1 || !bio2) return 0;

  const kw = bio =>
    new Set(
      bio
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOPWORDS.has(w)),
    );

  const kw1    = kw(bio1);
  const kw2    = kw(bio2);
  const common = [...kw2].filter(w => kw1.has(w)).length;
  return Math.min(common, 5);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Full compatibility breakdown between two Mongoose User documents.
 *
 * @param {object} user1   Current user (Mongoose doc or plain obj)
 * @param {object} user2   Candidate user
 * @returns {{
 *   overallScore:    number,
 *   interestMatch:   number,   // 0–100 as percentage for backwards compat
 *   ageMatch:        number,   // 0–100 as percentage (same)
 *   proximityScore:  number,   // 0–20
 *   recencyScore:    number,   // 0–15
 *   trustScore:      number,   // 0–10
 *   bioScore:        number,   // 0–5
 *   mutualInterests: string[],
 *   distKm:          number|null,
 * }}
 */
function calcCompatibility(user1, user2) {
  const { score: intScore, mutualInterests } = calcInterestScore(
    user1.interests,
    user2.interests,
  );

  const ageScore  = calcAgeScore(user1.age, user2.age);
  const { score: proxScore, distKm } = calcProximityScore(
    user1.coordinates,
    user2.coordinates,
  );
  const recScore  = calcRecencyScore(user2.isOnline, user2.lastActiveAt);
  const trustScore = calcTrustScore(user2);
  const bioScore  = calcBioScore(user1.bio, user2.bio);

  const overallScore = intScore + ageScore + proxScore + recScore + trustScore + bioScore;

  // Keep percentage versions for backwards compat with Match model
  const interestMatch = Math.round(intScore  / 30 * 100);
  const ageMatch      = Math.round(ageScore  / 20 * 100);

  return {
    overallScore,
    interestMatch,   // 0–100 %
    ageMatch,        // 0–100 %
    proximityScore:  proxScore,
    recencyScore:    recScore,
    trustScore,
    bioScore,
    mutualInterests,
    distKm,
  };
}

/**
 * Convenience: returns only the composite score.
 * @param {object} user1
 * @param {object} user2
 * @returns {number} 0–100
 */
function calcMatchScore(user1, user2) {
  return calcCompatibility(user1, user2).overallScore;
}

export { calcCompatibility, calcMatchScore, calcInterestScore, calcAgeScore, calcProximityScore, calcRecencyScore, calcTrustScore, calcBioScore };
