# Swiper Screen Profile Fetching Fixes

## Issues Found & Fixed

### 1. **Missing Coordinates in API Calls** ❌ → ✅
**Problem:** SwiperScreen.fetchProfileBatch() was not passing user coordinates to the API
```javascript
// Before - Missing lat/lon parameters
const batchUsers = await apiClient.getProfilesForSwiping(BATCH_SIZE, skip, true);

// After - Now passes coordinates
const batchUsers = await apiClient.getProfilesForSwiping(
  BATCH_SIZE, skip, true,
  lat, lon  // ← Added!
);
```

### 2. **Coordinate Format Mismatch** ❌ → ✅
**Problem:** Backend stored coordinates as GeoJSON `{ type: 'Point', coordinates: [lon, lat] }` but frontend expected `{ latitude, longitude }`

**Solution:** Added coordinate transformation in backend routes:
- `backend/routes/auth.js` - When returning user in `/me` endpoint
- `backend/routes/users.js` - When returning profiles in discovery endpoint
- Converts GeoJSON to simple format: `{ longitude: lon, latitude: lat }`

### 3. **App State Not Updated with Geolocation** ❌ → ✅
**Problem:** When geolocation succeeds, currentUser wasn't updated with coordinates
```javascript
// Before - Only set userCoords, not currentUser
setUserCoords(coords);

// After - Also update currentUser with coordinates
setCurrentUser(prev => prev ? {
  ...prev,
  coordinates: {
    longitude: position.coords.longitude,
    latitude: position.coords.latitude
  }
} : null);
```

### 4. **Robust Coordinate Handling** ⚠️ → ✅
**Added:** Helper function to handle both coordinate formats
```typescript
const extractCoordinates = (coords: any) => {
  // Handles both { latitude, longitude } and GeoJSON formats
  // Returns { lat, lon } or null
};
```

## Now Works Like Tinder! 🎯

### Profile Discovery Flow:
1. **Geolocation** 📍
   - Browser requests user permission
   - watchPosition tracks location in real-time
   - Updates debounced every 5 seconds

2. **Profile Fetching** 🔄
   - SwiperScreen sends user location to API
   - Backend uses $geoNear aggregation for distance sorting
   - Fallback to regular query if no geo-index

3. **Display & Scoring** 💚
   - Profiles sorted by match score (location, distance, interests)
   - Distance shown in km
   - Match percentage based on factors

4. **Swiping** ➡️⬅️
   - Swipe right: Like (send to matches)
   - Swipe left: Pass (exclude from feed)
   - Double tap: Quick like with heart animation
   - Super like: Costs 1 coin

## Testing Checklist

- [ ] Grant location permission when prompted
- [ ] Check browser console for location updates
- [ ] Verify profiles loading in feed
- [ ] Check match score calculations
- [ ] Verify distance filtering works
- [ ] Test swipe gestures
- [ ] Check heart animations

## Debug Commands

```bash
# Check if backend is running
curl http://localhost:3333/api/users?limit=1

# Check geolocation in browser console
navigator.geolocation.getCurrentPosition(p => console.log(p.coords))

# Check profile data structure
// In SwiperScreen console logs, look for:
// [SwiperScreen] Fetching batch: { batchNumber, skip, distance, userLocation }
```

## Environment Setup

Make sure these are available:
- VITE_API_URL (defaults to /api)
- VITE_WS_URL (WebSocket for real-time features)
- Browser geolocation permission enabled
- MongoDB 2dsphere index on coordinates field
