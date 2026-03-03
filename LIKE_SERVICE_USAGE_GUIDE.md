/**
 * LIKE SERVICE - Usage Guide
 * 
 * The likeService provides a clean, centralized way to handle likes, super likes, and passes
 * from the swipe screen with proper error handling and type safety.
 * 
 * Location: services/likeService.ts
 */

// ────────────────────────────────────────────────────────────────────────
// BASIC SETUP
// ────────────────────────────────────────────────────────────────────────

import { storeLike, storeSuperLike, storePass, formatMatchMessage } from '../services/likeService';

// ────────────────────────────────────────────────────────────────────────
// 1. STORE A LIKE
// ────────────────────────────────────────────────────────────────────────

async function handleUserLike(currentUserId: string, targetProfileId: string) {
  try {
    const response = await storeLike(currentUserId, targetProfileId);
    
    if (response.matched) {
      // IT'S A MATCH! 🎉
      console.log('Match found!');
      console.log(`Interest match: ${response.interestMatch}%`);
      console.log(`Age match: ${response.ageMatch}%`);
      console.log(`Matched with: ${response.matchedUser?.name}`);
      
      // Show match modal with details
      displayMatchModal(response.matchedUser, response.interestMatch);
    } else {
      // Like stored, waiting for mutual like
      console.log('Like saved - waiting for them to like you back');
      showNotification('Like saved!');
    }
  } catch (error) {
    console.error('Failed to store like:', error);
    showErrorAlert('Could not save like', error.message);
  }
}

// ────────────────────────────────────────────────────────────────────────
// 2. STORE A SUPER LIKE (costs 1 coin)
// ────────────────────────────────────────────────────────────────────────

async function handleSuperLike(currentUserId: string, targetProfileId: string) {
  try {
    // Check if user has coins before calling (optional - API also checks)
    if (!user.isPremium && user.coins < 1) {
      showErrorAlert('Out of Coins', 'Super likes cost 1 coin');
      return;
    }

    const response = await storeSuperLike(currentUserId, targetProfileId);
    
    if (response.matched) {
      // SUPER LIKE MATCH!
      showAlert('Match! 🌟', `${response.matchedUser?.name} loved your super like!`);
    } else {
      showNotification('Super like sent! ⭐');
    }

    // Deduct coin from user
    deductCoin();
  } catch (error) {
    console.error('Failed to store super like:', error);
    showErrorAlert('Error', error.message);
  }
}

// ────────────────────────────────────────────────────────────────────────
// 3. STORE A PASS (user swiped left)
// ────────────────────────────────────────────────────────────────────────

async function handlePass(currentUserId: string, targetProfileId: string) {
  try {
    await storePass(currentUserId, targetProfileId);
    console.log('Profile passed');
    // Usually followed by showing next profile
    showNextProfile();
  } catch (error) {
    console.error('Failed to record pass:', error);
    // Can silently fail for passes as it's non-critical
  }
}

// ────────────────────────────────────────────────────────────────────────
// 4. RESPONSE TYPES
// ────────────────────────────────────────────────────────────────────────

interface LikeResponse {
  matched: boolean;           // Whether a mutual like occurred
  message: string;            // Human-readable message
  interestMatch?: number;     // Percentage match based on shared interests (0-100)
  ageMatch?: number;          // Percentage match based on age compatibility (0-100)
  matchId?: string;           // Unique ID if matched
  matchedUser?: {
    id: string;
    name: string;
    profilePicture: string;
    location: string;
    interests: string[];
    bio?: string;
    age?: number;
  };
  isDemoMatch?: boolean;      // Flag indicating this is a demo/auto-match
  mutualInterests?: string[]; // Array of interests both users share
}

// ────────────────────────────────────────────────────────────────────────
// 5. ERROR HANDLING
// ────────────────────────────────────────────────────────────────────────

interface LikeError {
  message: string;    // Error description
  status?: number;    // HTTP status code (404, 500, etc.)
  code?: string;      // Error code from backend
}

try {
  await storeLike(userId, profileId);
} catch (error) {
  const likeError = error as LikeError;
  
  if (likeError.status === 404) {
    console.error('User or profile not found');
  } else if (likeError.status === 500) {
    console.error('Server error');
  } else {
    console.error('Unknown error:', likeError.message);
  }
}

// ────────────────────────────────────────────────────────────────────────
// 6. HELPER FUNCTIONS
// ────────────────────────────────────────────────────────────────────────

// Format match message for display
const matchMessage = formatMatchMessage(response);
console.log(matchMessage);
// Output: "🎉 It's a match!\n85% interests • 95% age match"

// ────────────────────────────────────────────────────────────────────────
// 7. BACKEND FLOW (What happens behind the scenes)
// ────────────────────────────────────────────────────────────────────────

/*
POST /api/users/{userId}/swipe

Request Body:
{
  "targetUserId": "target-user-id",
  "action": "like" | "superlike" | "pass"
}

Response on Mutual Like:
{
  "matched": true,
  "message": "It's a match! 🎉 85% interests, 95% age compatibility",
  "matchId": "uuid",
  "interestMatch": 85,
  "ageMatch": 95,
  "mutualInterests": ["Photography", "Travel", "Music"],
  "matchedUser": {
    "id": "user-id",
    "name": "Sarah",
    "profilePicture": "...",
    "location": "New York, NY",
    "interests": [...]
  }
}

Response on Like (No Match Yet):
{
  "matched": false,
  "message": "Like recorded. Waiting for mutual like...",
  "interestMatch": 75,
  "ageMatch": 80
}
*/

// ────────────────────────────────────────────────────────────────────────
// 8. COMPLETE EXAMPLE: Swipe Screen Integration
// ────────────────────────────────────────────────────────────────────────

import { storeLike, formatMatchMessage } from '../services/likeService';

const SwiperScreen = ({ currentUser, profile }) => {
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchDetails, setMatchDetails] = useState(null);

  const handleLike = async () => {
    try {
      // Store the like
      const response = await storeLike(currentUser.id, profile.id);
      
      if (response.matched) {
        // Show match celebration
        setMatchDetails(response);
        setShowMatchModal(true);
        
        // Play sound, show confetti, etc.
        playMatchSound();
        playConfetti();
      } else {
        // Just show a small notification
        showNotification('Like saved! 💚');
      }
    } catch (error) {
      showErrorAlert('Error', error.message);
    } finally {
      // Move to next profile
      showNextProfile();
    }
  };

  return (
    <div>
      {/* Profile Card */}
      <div className="profile-card">
        <img src={profile.image} alt={profile.name} />
        <button onClick={handleLike} className="btn-like">❤️ Like</button>
      </div>

      {/* Match Modal */}
      {showMatchModal && matchDetails && (
        <MatchModal
          isOpen={showMatchModal}
          matchedUser={matchDetails.matchedUser}
          interestMatch={matchDetails.interestMatch}
          message={formatMatchMessage(matchDetails)}
          onClose={() => setShowMatchModal(false)}
        />
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────
// 9. DATABASE UPDATES (What gets stored)
// ────────────────────────────────────────────────────────────────────────

/*
When storeLike is called:

1. User.swipes array is updated:
   currentUser.swipes = [...currentUser.swipes, targetUserId]

2. If mutual like detected:
   - Creates Match document:
     {
       id: uuid,
       user1Id: userId,
       user2Id: targetUserId,
       user1Name: currentUser.name,
       user2Name: targetUser.name,
       interestMatch: 85,
       ageMatch: 95,
       mutualInterests: ['Photography', 'Travel'],
       createdAt: timestamp
     }
   
   - Updates User.matches arrays:
     currentUser.matches.push(targetUserId)
     targetUser.matches.push(userId)
   
   - Sends WebSocket notifications to both users
     for real-time match alerts

3. For demo mode (first 5 swipes):
   - Auto-matches with 75% probability
   - Boosts compatibility scores for better UX
*/

// ────────────────────────────────────────────────────────────────────────
// 10. TESTING
// ────────────────────────────────────────────────────────────────────────

// Test storing a like
const testStoreLike = async () => {
  try {
    const response = await storeLike('user-123', 'profile-456');
    console.log('✅ Like stored successfully:', response);
  } catch (error) {
    console.error('❌ Failed to store like:', error);
  }
};

// Test with mock data
const testData = {
  currentUserId: 'user-123',
  profileId: 'profile-456',
  profileName: 'Sarah'
};

await testStoreLike();
