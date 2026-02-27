# Admin Photo Verification Status Setup Guide

## Overview
The Admin Photo Verification Dashboard allows admins and moderators to review and approve/reject user-submitted photo verifications in real-time with AI-powered analysis.

## Features

### 📊 Real-Time Statistics Dashboard
- **Pending Review**: Count of photos awaiting approval
- **Approved**: Successfully verified user count
- **Rejected**: Photos that didn't meet criteria
- **Average Review Time**: Mean processing time in hours

### 🖼️ Photo Gallery View
- Thumbnail previews of pending verification photos
- Quick quality score display
- Submission date/time
- One-click selection for detailed review

### 🔍 AI Analysis
- Automatic face detection and count
- Photo quality scoring (0-100%)
- Image resolution and size validation
- Personalized recommendations
- One-click analysis trigger

### ✓/✗ Approval System
- Approve photos with optional admin notes
- Reject with predefined reasons:
  - No face detected
  - Multiple faces detected
  - Face not clear
  - Blurry image
  - Poor lighting
  - Not a selfie/ID photo
  - Inappropriate content
  - Photo appears outdated
  - Other (custom reason)

### 🔄 Auto-Refresh
- Optional automatic refresh every 30 seconds
- Manual refresh button available
- Real-time verification status updates

## Access & Setup

### Step 1: Grant Admin/Moderator Role
Users need `ADMIN` or `MODERATOR` role to access the verification dashboard.

**Via Database (MongoDB)**:
```javascript
// Connect to MongoDB
use spark-dating
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "ADMIN" } }  // or "MODERATOR"
)
```

**Via Backend Script** (if available):
```bash
cd backend
node scripts/make-admin.js admin@example.com
# or
node scripts/make-moderator.js moderator@example.com
```

### Step 2: Start Backend Server
```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:5000`

### Step 3: Start Frontend
```bash
# In a new terminal
npm run dev
# Frontend starts on http://localhost:3001
```

### Step 4: Login as Admin/Moderator
1. Go to http://localhost:3001
2. Login with admin/moderator credentials
3. Look for the **Shield Icon** (🛡️) in the sidebar
4. Click "Moderator Panel"

### Step 5: Navigate to Verifications Tab
1. In Moderator Panel, click the **"Verifications"** tab at the top
2. You should see:
   - Statistics cards (pending, approved, rejected, avg time)
   - Pending photos gallery on the left
   - Review panel on the right (empty until you select a photo)

## How to Review Photos

### Review Workflow

1. **Select Photo**: Click any photo in the pending list

2. **Preview**: Large preview appears on the right side

3. **Analyze**: Click "Run AI Analysis" button to get AI insights
   - Wait for analysis to complete (1-3 seconds)
   - Review quality score, face detection, recommendations

4. **Decide**:
   - **To Approve**: Click "Approve" button
     - Add optional notes
     - Photo is sent to user and they get verified badge
   
   - **To Reject**: Click "Reject" button
     - Select rejection reason from dropdown
     - Add optional admin notes
     - User is notified and can resubmit after 7 days

5. **Confirmation**: List auto-refreshes showing next pending photo

## Understanding the Dashboard

### Quality Score Indicator
- **Green (80-100%)**: Excellent quality, suitable for verification
- **Yellow (60-79%)**: Acceptable quality, requires manual review
- **Red (0-59%)**: Poor quality, likely needs rejection

### Face Detection Status
- **✓ 1 Face**: Ideal - single face detected
- **✓ N Faces**: Multiple faces - usually requires rejection
- **✗ No Face**: No face detected - automatic rejection candidate

### Status Colors
- **Blue Cards**: Active pending items
- **Green Cards**: Successfully approved
- **Red Cards**: Rejected items
- **Purple Cards**: Average metrics

## Database Information

### PhotoVerification Collection Fields
```javascript
{
  userId: String,              // User submitting verification
  photoUrl: String,            // Cloudinary URL
  publicId: String,            // Cloudinary public ID
  status: String,              // 'pending' | 'approved' | 'rejected'
  submittedAt: Date,           // When user submitted
  reviewedAt: Date,            // When admin reviewed
  reviewedBy: String,          // Admin user ID
  reason: String,              // Rejection reason
  notes: String,               // Admin review notes
  antiSpoofScore: Number,      // Quality score 0-1
  analysisMetadata: Object     // AI analysis details
}
```

### User Updates on Approval
When a photo is approved:
```javascript
{
  isPhotoVerified: true,
  photoVerifiedAt: Date.now()
}
```

User gets `verification.status = 'VERIFIED'` in the frontend and shows verification badge.

## API Endpoints Used

All endpoints require authentication and ADMIN/MODERATOR role:

### Get Pending Reviews
```
GET /api/verification/pending-reviews
Response: { stats: {...}, verifications: [...] }
```

### Analyze Photo
```
POST /api/verification/analyze-photo/:verificationId
Response: { qualityScore, faceDetected, faceCount, recommendations, ... }
```

### Review Photo (Approve/Reject)
```
PUT /api/verification/review/:verificationId
Body: { decision: 'approve|reject', reason?: String, notes?: String }
Response: { success: true, message: ... }
```

## Troubleshooting

### Issue: Verifications Tab Not Visible
**Solution**:
- Verify user role is `ADMIN` or `MODERATOR` in database
- Log out and log back in to refresh permissions
- Check browser console for role errors

### Issue: Photos Won't Load
**Solution**:
- Verify backend is running on port 5000
- Check network tab for API errors
- Ensure Cloudinary credentials in .env are correct
- Restart backend server

### Issue: Analysis Returns Error
**Solution**:
- Verify Cloudinary API key in backend/.env
- Check server logs for Cloudinary errors
- Try manual review without AI analysis
- Photo analysis is optional

### Issue: Approve/Reject Not Working
**Solution**:
- Verify admin role is set in database
- Check server logs for error messages
- Ensure JWT token is valid (re-login)
- Try refreshing the page

## Performance Tips

- **Auto-Refresh**: Disable if server is overloaded
- **Batch Reviews**: Review in batches during off-peak hours
- **Large Images**: Cloudinary handles optimization automatically
- **Caching**: Clear browser cache if stats seem outdated

## Security Notes

✅ **All endpoints require:**
- Valid JWT authentication token
- ADMIN or MODERATOR role
- Photo data is hosted on Cloudinary (not your servers)
- Admin actions are logged in database

❌ **Never:**
- Share moderator credentials
- Approve photos without reviewing
- Allow users to guess admin URLs

## Deployment Checklist

Before going to production:

- [ ] Set strong JWT_SECRET in .env
- [ ] Use dedicated Cloudinary account with usage limits
- [ ] Enable HTTPS for all admin operations
- [ ] Set up admin account with strong password
- [ ] Configure email notifications for admins
- [ ] Test approve/reject workflow end-to-end
- [ ] Set up audit logging for all approvals/rejections
- [ ] Document rejection reasons for consistency
- [ ] Train moderator team on verification guidelines
- [ ] Monitor storage usage on Cloudinary

## Files Modified

- `components/AdminPhotoVerificationDashboard.tsx` (NEW) - Main admin interface
- `components/ModeratorPanel.tsx` - Added AdminPhotoVerificationDashboard integration
- `backend/routes/verification.js` - All endpoints already implemented

## Next Steps

1. Set admin role for your account
2. Restart backend and frontend
3. Login and navigate to Moderator Panel → Verifications
4. Test with any pending verification photos
5. Review AI analysis results
6. Approve or reject test photos
7. Verify user badges update after approval
