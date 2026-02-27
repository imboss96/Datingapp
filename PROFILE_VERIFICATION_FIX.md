# Profile Fetching Fix - Missing Verification Field

## Problem
Profiles in the swipe screen section weren't fetching properly because the backend API endpoints were returning user profiles without the `verification` field that the frontend expected.

### Root Cause
The frontend `UserProfile` type requires a `verification: VerificationInfo` field:
```typescript
export interface UserProfile {
  // ... other fields ...
  verification: VerificationInfo;
}

export interface VerificationInfo {
  status: VerificationStatus;  // VERIFIED, PENDING, REJECTED, UNVERIFIED
  idType?: string;
  verifiedAt?: number;
}
```

However, the backend's `User` MongoDB model doesn't store verification information directly. Instead, it's  stored in a separate `PhotoVerification` collection, indexed by `userId`.

When the backend returned user profiles from the `/users` endpoint, it didn't join the verification data, causing the profiles to have an undefined `verification` field. This led to errors when the frontend tried to access `profile.verification.status`.

## Solution

### Changes Made

#### 1. **backend/routes/users.js**
   - Added import: `import PhotoVerification from '../models/PhotoVerification.js';`
   - Added helper function `attachVerificationInfo(users)` that:
     - Takes an array of user objects
     - Queries PhotoVerification records for all those users
     - Maps verification statuses (approved → VERIFIED, pending → PENDING, rejected → REJECTED, missing → UNVERIFIED)
     - Attaches verification info to each user

   - Updated endpoints to use this helper:
     - `GET /:userId` - individual user profile
     - `GET /` (geo query) - profiles from geolocation-based search
     - `GET /` (fallback query) - profiles from regular database query

#### 2. **backend/routes/auth.js**
   - Added import: `import PhotoVerification from '../models/PhotoVerification.js';`
   - Added same `attachVerificationInfo()` helper function
   - Updated `GET /auth/me` endpoint to attach verification info to current user

### Benefits
✅ Profiles now always have a `verification` field  
✅ Frontend receives consistent data structure  
✅ SwiperScreen can safely access `profile.verification.status`  
✅ Verified users show verification badge correctly  

## Testing

### Manual Test
1. Start the backend: `npm run dev` (from backend folder)
2. Login to the frontend
3. Navigate to the swipe screen
4. Profiles should load and display correctly

### Automated Test
```bash
cd backend
node test-verification-fix.js
```

### Expected Result
- All user profiles in `/api/users` response include a `verification` object
- Each verification object contains at least: `{ status: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED" }`

## Performance Considerations

The fix adds an additional database query to fetch PhotoVerification records. The query:
- Uses indexed `userId` field (indexed: true in PhotoVerification schema)
- Is batched (one query for all users in the batch, not individual queries)
- Should complete in <100ms for typical batch sizes (50-100 profiles)

No N+query anti-pattern since we batch all user IDs and query once.

## Future Improvements

For better performance with very large datasets, consider:
1. Using MongoDB aggregation pipeline with `$lookup` to join verification data
2. Caching verification status in the User model directly
3. Creating a denormalized view that includes verification status

## Files Modified
- `backend/routes/users.js`
- `backend/routes/auth.js`

## Deployment Notes
- No database migrations needed
- No environment variable changes needed
- Backward compatible - no breaking changes
- All existing API contracts maintained
