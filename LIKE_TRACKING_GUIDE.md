# Like & SuperLike Tracking System

## Overview

The like tracking system allows you to:
- Track when users like or superlike profiles
- Display like counts on profile cards
- Check if user has liked a profile
- See recent likers of a profile

## Backend API Endpoints

All endpoints require authentication.

### Record/Update a Like
```
POST /api/likes
Body: {
  profileUserId: string,
  likeType: 'like' | 'superlike'  // default: 'like'
}

Response: {
  created: boolean,
  updated: boolean,
  like: {
    id: string,
    profileUserId: string,
    likerUserId: string,
    likeType: string,
    createdAt: Date
  }
}
```

### Get Like Statistics for a Profile
```
GET /api/likes/:profileUserId/stats

Response: {
  profileUserId: string,
  totalLikes: number,
  totalSuperLikes: number,
  totalInteractions: number,
  recentLikers: [
    {
      likerUserId: string,
      likeType: 'like' | 'superlike',
      createdAt: string
    }
  ]
}
```

### Check if Current User Has Liked a Profile
```
GET /api/likes/:profileUserId/check

Response: {
  hasLiked: boolean,
  likeType: 'like' | 'superlike' | null
}
```

### Get All Likes Given by Current User
```
GET /api/likes/given/user

Response: {
  likerUserId: string,
  totalGiven: number,
  likes: [
    {
      profileUserId: string,
      likeType: 'like' | 'superlike',
      createdAt: string
    }
  ]
}
```

### Get All Likes Received by Current User
```
GET /api/likes/received/user

Response: {
  profileUserId: string,
  totalReceived: number,
  likes: [
    {
      likerUserId: string,
      likeType: 'like' | 'superlike',
      createdAt: string
    }
  ]
}
```

### Unlike a Profile
```
DELETE /api/likes/:profileUserId

Response: {
  deleted: boolean
}
```

## Frontend Hooks (React)

Located in `services/useLikeHooks.ts`

### 1. `useLikeStats` - Get Like Statistics

```tsx
import { useLikeStats } from '../services/useLikeHooks';

function ProfileCard({ userId }) {
  const { stats, loading, error } = useLikeStats(userId);

  if (loading) return <div>Loading stats...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <p>❤️ {stats?.totalLikes} Likes</p>
      <p>⭐ {stats?.totalSuperLikes} Super Likes</p>
    </div>
  );
}
```

### 2. `useHasLiked` - Check if User Has Liked

```tsx
import { useHasLiked } from '../services/useLikeHooks';

function LikeButton({ profileId }) {
  const { hasLiked, refetch } = useHasLiked(profileId);

  return (
    <button style={{ color: hasLiked?.hasLiked ? 'red' : 'gray' }}>
      {hasLiked?.hasLiked ? '❤️ Liked' : '🤍 Like'}
    </button>
  );
}
```

### 3. `useLikeProfile` - Like/Unlike a Profile

```tsx
import { useLikeProfile } from '../services/useLikeHooks';

function LikeButton({ profileId }) {
  const { like, unlike, loading, error } = useLikeProfile();

  const handleLike = async () => {
    try {
      await like(profileId, 'like');
      console.log('Liked successfully!');
    } catch (err) {
      console.error('Failed to like:', err);
    }
  };

  const handleSuperLike = async () => {
    try {
      await like(profileId, 'superlike');
      console.log('Super liked successfully!');
    } catch (err) {
      console.error('Failed to super like:', err);
    }
  };

  const handleUnlike = async () => {
    try {
      await unlike(profileId);
      console.log('Unliked successfully!');
    } catch (err) {
      console.error('Failed to unlike:', err);
    }
  };

  return (
    <div>
      <button onClick={handleLike} disabled={loading}>
        ❤️ Like
      </button>
      <button onClick={handleSuperLike} disabled={loading}>
        ⭐ Super Like
      </button>
      <button onClick={handleUnlike} disabled={loading}>
        Remove Like
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

### 4. `useGivenLikes` - Get Likes Given by User

```tsx
import { useGivenLikes } from '../services/useLikeHooks';

function MyLikesPage() {
  const { likes, loading } = useGivenLikes();

  return (
    <div>
      <h2>Likes I've Given ({likes.length})</h2>
      {likes.map(like => (
        <div key={like.profileUserId}>
          <p>{like.profileUserId}</p>
          <span>{like.likeType === 'superlike' ? '⭐' : '❤️'}</span>
        </div>
      ))}
    </div>
  );
}
```

### 5. `useReceivedLikes` - Get Likes Received by User

```tsx
import { useReceivedLikes } from '../services/useLikeHooks';

function MyLikersPage() {
  const { likes, loading } = useReceivedLikes();

  return (
    <div>
      <h2>People Who Liked Me ({likes.length})</h2>
      {likes.map(like => (
        <div key={like.likerUserId}>
          <p>{like.likerUserId}</p>
          <span>{like.likeType === 'superlike' ? '⭐' : '❤️'}</span>
        </div>
      ))}
    </div>
  );
}
```

## Automatic Integration with Swipe Endpoint

When a user likes or superlikes someone through the `/api/users/:userId/swipe` endpoint:
- A Like record is automatically created
- If the like already exists but with different type, it's updated
- Like recording doesn't affect the swipe functionality

## Database Schema

### Like Model
```javascript
{
  id: String (UUID),
  profileUserId: String (indexed),
  likerUserId: String (indexed),
  likeType: 'like' | 'superlike',
  createdAt: Date (indexed)
}
```

## Usage Examples

### Display Like Count Badge on Profile Card

```tsx
import { useLikeStats } from '../services/useLikeHooks';

function ProfileBadge({ userId }) {
  const { stats } = useLikeStats(userId);

  if (!stats) return null;

  return (
    <div className="badge">
      <span className="likes-count">
        ❤️ {stats.totalLikes + stats.totalSuperLikes}
      </span>
    </div>
  );
}
```

### Combined Like Tracking Component

```tsx
import { useState } from 'react';
import { useLikeStats, useHasLiked, useLikeProfile } from '../services/useLikeHooks';

function ProfileCard({ profile }) {
  const { stats, refetch: refetchStats } = useLikeStats(profile.id);
  const { hasLiked, refetch: refetchHasLiked } = useHasLiked(profile.id);
  const { like, unlike } = useLikeProfile();

  const handleLike = async (type: 'like' | 'superlike') => {
    try {
      await like(profile.id, type);
      // Refresh stats after liking
      refetchStats();
      refetchHasLiked();
    } catch (err) {
      console.error('Failed to like:', err);
    }
  };

  return (
    <div className="profile-card">
      <img src={profile.image} alt={profile.name} />
      <h3>{profile.name}, {profile.age}</h3>
      
      {/* Like Count */}
      {stats && (
        <div className="like-stats">
          ❤️ {stats.totalLikes} | ⭐ {stats.totalSuperLikes}
        </div>
      )}

      {/* Like Buttons */}
      <div className="actions">
        <button onClick={() => handleLike('like')}>
          {hasLiked?.hasLiked && hasLiked.likeType === 'like' ? '❤️' : '🤍'} Like
        </button>
        <button onClick={() => handleLike('superlike')}>
          {hasLiked?.hasLiked && hasLiked.likeType === 'superlike' ? '⭐' : '☆'} Super Like
        </button>
      </div>
    </div>
  );
}
```

## Notes

- All like operations are automatic when users swipe
- Likes are stored with timestamps for trending analysis
- Like counts include both regular and super likes
- Duplicate likes with same type are prevented at database level
- All API endpoints require authentication except GET /api/likes/:userId/stats
