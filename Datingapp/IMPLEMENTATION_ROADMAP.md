# 🗺️ Dating App Implementation Roadmap 2026

**Current Status:** MVP with core features (auth, matching, messaging, video calls)  
**Target:** Full-featured production dating app  
**Last Updated:** February 15, 2026

---

## 📊 Roadmap Overview

```
PHASE 1: Foundation & Legal (Weeks 1-2)
├─ Legal Compliance
├─ Error Handling
└─ Verification System

PHASE 2: Trust & Safety (Weeks 3-4)
├─ Photo/Email Verification
├─ Advanced Moderation
└─ Safety Features

PHASE 3: Enhancement (Weeks 5-7)
├─ Search & Filters
├─ Message Features
└─ Notifications

PHASE 4: Monetization (Weeks 8-10)
├─ Premium Features
├─ Subscription System
└─ Analytics

PHASE 5: Polish & Scale (Weeks 11+)
├─ Performance Optimization
├─ Dark Mode
└─ Mobile Optimization
```

---

# PHASE 1: Foundation & Legal (Weeks 1-2)

## Week 1: Legal Pages & Error Handling

### Task 1.1: Create Legal Pages (16 hours)
**Priority:** 🔴 CRITICAL - App won't launch without these

**Files to Create:**
- `components/TermsPage.tsx`
- `components/PrivacyPage.tsx`
- `components/CookiePolicyPage.tsx`

**Backend Routes:**
- `GET /api/legal/terms`
- `GET /api/legal/privacy`
- `GET /api/legal/cookies`

**Implementation Steps:**
1. Create legal page components with routing
2. Add acceptance checkbox in registration flow
3. Store user acceptance in DB (User schema)
4. Add legal links in footer

**Acceptance Criteria:**
- ✅ Terms of Service page renders
- ✅ Privacy Policy page renders
- ✅ Users must accept to register
- ✅ Acceptance recorded in database

**Estimate:** 16 hours | **Owner:** Frontend + Backend

---

### Task 1.2: Implement Global Error Boundaries (12 hours)
**Priority:** 🟠 HIGH - Critical for stability

**Files to Create:**
- `components/ErrorBoundary.tsx`
- `components/ErrorFallback.tsx`

**Implementation:**
```tsx
// ErrorBoundary.tsx
import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo);
    // Send to error tracking service (Sentry)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

**Tasks:**
- [ ] Create ErrorBoundary component
- [ ] Create ErrorFallback UI
- [ ] Wrap main App routes
- [ ] Add Sentry integration
- [ ] Create error logging service

**Acceptance Criteria:**
- ✅ App doesn't crash on component errors
- ✅ User sees friendly error message
- ✅ Errors logged to console/service

**Estimate:** 12 hours | **Owner:** Frontend

---

### Task 1.3: Add API Error Handling Middleware (10 hours)
**Priority:** 🟠 HIGH

**Files to Modify:**
- `backend/server.js` - add error handler
- `backend/middleware/errorHandler.js` - create

**Implementation:**
```javascript
// middleware/errorHandler.js
export const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', err.message);
  
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    error: message,
    status,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
```

**Tasks:**
- [ ] Create error handler middleware
- [ ] Add try-catch to all routes
- [ ] Implement custom error classes
- [ ] Add request validation middleware
- [ ] Rate limiting to prevent abuse

**Acceptance Criteria:**
- ✅ All API errors return proper JSON
- ✅ Validation errors clear
- ✅ 500 errors don't crash server

**Estimate:** 10 hours | **Owner:** Backend

---

## Week 2: Email & Photo Verification

### Task 1.4: Email Verification System (14 hours)
**Priority:** 🔴 CRITICAL

**Infrastructure:**
- Email service: SendGrid / Mailgun / AWS SES
- Add to dependencies: `npm install nodemailer`

**Backend Changes:**

```javascript
// routes/auth.js - modify register endpoint
router.post('/register-verify', async (req, res) => {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000);
  const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 min
  
  // Store in DB or cache
  await EmailVerification.create({
    email,
    otp,
    expiresAt: otpExpiry
  });
  
  // Send email
  await sendEmailOTP(email, otp);
  res.json({ message: 'OTP sent' });
});

router.post('/verify-email', async (req, res) => {
  const { email, otp } = req.body;
  const verification = await EmailVerification.findOne({ email });
  
  if (!verification || verification.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }
  
  if (verification.expiresAt < Date.now()) {
    return res.status(400).json({ error: 'OTP expired' });
  }
  
  await User.updateOne({ email }, { emailVerified: true });
  await EmailVerification.deleteOne({ email });
  
  res.json({ success: true });
});
```

**Database Schema Updates:**
```javascript
// Add to User schema
emailVerified: { type: Boolean, default: false },
emailVerifiedAt: { type: Date },
```

**New Collection:**
```javascript
// EmailVerification schema
const schema = new Schema({
  email: String,
  otp: String,
  expiresAt: Date,
  attempts: { type: Number, default: 0 }
});
```

**Frontend Components:**
- `components/EmailVerificationModal.tsx`
- OTP input with timer
- Resend OTP button

**Tasks:**
- [ ] Set up email service (Mailgun/SendGrid)
- [ ] Create OTP generation & validation
- [ ] Create EmailVerification collection
- [ ] Add email verification to registration flow
- [ ] Create verification modal UI
- [ ] Add resend OTP logic (max 3 attempts)
- [ ] Block unverified users from swiping

**Acceptance Criteria:**
- ✅ OTP sent to email address
- ✅ OTP validated correctly
- ✅ Expires after 10 minutes
- ✅ Max 3 resend attempts
- ✅ Unverified users blocked from main app

**Estimate:** 14 hours | **Owner:** Backend (8h) + Frontend (6h)

---

### Task 1.5: Phone Verification (Optional - Week 2.5)
**Priority:** 🟡 MEDIUM (can defer to Phase 2)

**Service:** Twilio SMS

**Implementation:** Similar to email, but with SMS OTP

**Time:** 8-10 hours (defer if needed)

---

# PHASE 2: Trust & Safety (Weeks 3-4)

## Week 3: Photo Verification & Profile Badges

### Task 2.1: Photo Verification System (18 hours)
**Priority:** 🔴 CRITICAL

**Backend:**

```javascript
// routes/verification.js (new file)
router.post('/upload-verification-photo', authMiddleware, async (req, res) => {
  // Upload to Cloudinary with tag 'verification'
  const result = await uploadToCloudinary(req.file, { 
    folder: 'dating-app/verifications',
    tags: ['unreviewed']
  });
  
  const verification = await PhotoVerification.create({
    userId: req.userId,
    photoUrl: result.secure_url,
    publicId: result.public_id,
    status: 'pending', // pending | approved | rejected
    submittedAt: new Date()
  });
  
  // Notify moderators
  await notifyModerators('new_verification_photo', { userId: req.userId });
  
  res.json(verification);
});

// Admin endpoint
router.post('/verify-photo/:verificationId', authMiddleware, async (req, res) => {
  const { status, reason } = req.body; // status: approved | rejected
  
  const verification = await PhotoVerification.findByIdAndUpdate(
    verificationId,
    { status, reviewedAt: new Date(), reason }
  );
  
  if (status === 'approved') {
    await User.updateOne(
      { id: verification.userId },
      { isPhotoVerified: true, photoVerifiedAt: new Date() }
    );
  } else {
    // Notify user of rejection
    await sendNotification(verification.userId, `Photo verification rejected: ${reason}`);
  }
  
  res.json(verification);
});
```

**Database Schema:**
```javascript
// PhotoVerification schema
const schema = new Schema({
  userId: { type: String, index: true },
  photoUrl: String,
  publicId: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  submittedAt: Date,
  reviewedAt: Date,
  reason: String
});

// Add to User schema
isPhotoVerified: { type: Boolean, default: false },
photoVerifiedAt: Date,
photoVerificationAttempts: { type: Number, default: 0 }
```

**Frontend:**
- `components/PhotoVerificationModal.tsx`
- Capture/upload verification photo
- Show verification badge when approved
- Show pending/rejected status

**Moderator Panel Updates:**
- List pending verifications
- Approve/reject with reason
- Image preview with anti-spoofing detection

**Tasks:**
- [ ] Create PhotoVerification collection
- [ ] Build upload endpoint with Cloudinary
- [ ] Create frontend modal
- [ ] Build moderator review interface
- [ ] Add verification badge to profiles
- [ ] Implement anti-spoofing (basic face detection)
- [ ] Notify users of approval/rejection
- [ ] Show "verified" users first in swipes

**Acceptance Criteria:**
- ✅ Users can upload verification photo
- ✅ Moderators can review & approve/reject
- ✅ Verification badge shows on approved profiles
- ✅ Verified users get priority in discovery
- ✅ Rejection includes reason

**Estimate:** 18 hours | **Owner:** Backend (10h) + Frontend (8h)

---

### Task 2.2: Profile Badges & Trust Score (12 hours)
**Priority:** 🟡 MEDIUM

**Badges:**
- ✅ Email Verified
- ✅ Photo Verified
- ✅ Phone Verified (optional)
- ⭐ Premium Member
- 🏆 Top Rated (based on ratings)
- 😊 Friendly (if matches rate them 5 stars)

**Backend:**

```javascript
// routes/users.js - update profile endpoint
router.get('/:userId', async (req, res) => {
  const user = await User.findOne({ id: req.params.userId });
  
  const badges = [];
  if (user.emailVerified) badges.push('email_verified');
  if (user.isPhotoVerified) badges.push('photo_verified');
  if (user.isPremium) badges.push('premium');
  
  const avgRating = await getAverageRating(user.id); // from Match ratings
  if (avgRating >= 4.5) badges.push('top_rated');
  if (avgRating >= 4.8) badges.push('friendly');
  
  res.json({
    ...user.toObject(),
    badges,
    trustScore: calculateTrustScore(user)
  });
});

// Trust score calculation
function calculateTrustScore(user) {
  let score = 50; // Base score
  if (user.emailVerified) score += 10;
  if (user.isPhotoVerified) score += 20;
  if (user.isPremium) score += 10;
  
  const avgRating = getAverageRating(user.id);
  if (avgRating) score += Math.min(20, avgRating * 4);
  
  const reportCount = getReportCount(user.id);
  score -= Math.min(50, reportCount * 5);
  
  return Math.min(100, Math.max(0, score));
}
```

**Frontend Display:**
```tsx
// Display badges
{profile.badges.map(badge => (
  <Badge key={badge} type={badge} />
))}

// Trust score bar
<TrustScoreBar score={profile.trustScore} />
```

**Tasks:**
- [ ] Define badge types & criteria
- [ ] Calculate trust score algorithm
- [ ] Update user profile response
- [ ] Create badge UI components
- [ ] Display badges on discovery cards
- [ ] Show trust score on profiles
- [ ] Add "verified only" filter to discovery

**Acceptance Criteria:**
- ✅ Badges display correctly
- ✅ Trust score calculated
- ✅ Verified users shown first
- ✅ Filter for verified users works

**Estimate:** 12 hours | **Owner:** Backend (6h) + Frontend (6h)

---

## Week 4: Advanced Moderation

### Task 2.3: Smart Report System (16 hours)
**Priority:** 🟡 MEDIUM

**Report Categories:**
- Inappropriate photos
- Harassment/abusive language
- Fake profile
- Underage user
- Scam/spam
- Other

```javascript
// routes/reports.js - enhance
router.post('/', authMiddleware, async (req, res) => {
  const { reportedUserId, category, reason, evidence } = req.body;
  
  // Check if already reported (prevent spam)
  const existing = await Report.findOne({
    reporterId: req.userId,
    reportedUserId,
    createdAt: { $gte: Date.now() - 24 * 60 * 60 * 1000 }
  });
  
  if (existing) {
    return res.status(429).json({ error: 'Already reported this user' });
  }
  
  const report = await Report.create({
    reporterId: req.userId,
    reportedUserId,
    category,
    reason,
    evidence,
    status: 'open', // open | investigating | resolved | dismissed
    priority: calculatePriority(category),
    createdAt: new Date()
  });
  
  // Auto-action for severe categories
  if (['underage', 'scam'].includes(category)) {
    // Suspend user immediately
    await User.updateOne({ id: reportedUserId }, { suspended: true });
    await Report.updateOne({ _id: report._id }, { autoSuspended: true });
  }
  
  res.json(report);
});

// Admin endpoint to resolve reports
router.patch('/:reportId', authMiddleware, async (req, res) => {
  const { status, action, reason } = req.body;
  // action: warn | suspend | ban | delete | dismiss
  
  const report = await Report.findByIdAndUpdate(reportId, { status });
  
  if (action === 'warn') {
    await sendNotification(report.reportedUserId, 'Account warning');
    await Warning.create({ userId: report.reportedUserId, reason });
  }
  
  if (action === 'suspend') {
    await User.updateOne({ id: report.reportedUserId }, { suspended: true });
  }
  
  if (action === 'ban') {
    await User.updateOne({ id: report.reportedUserId }, { banned: true });
  }
  
  res.json(report);
});

// Get admin dashboard stats
router.get('/admin/stats', adminMiddleware, async (req, res) => {
  const stats = {
    openReports: await Report.countDocuments({ status: 'open' }),
    urgentReports: await Report.countDocuments({ priority: 'high', status: 'open' }),
    suspendedUsers: await User.countDocuments({ suspended: true }),
    bannedUsers: await User.countDocuments({ banned: true }),
    reportsByCategory: await Report.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ])
  };
  res.json(stats);
});
```

**Database Updates:**
```javascript
// Report schema - enhance
const reportSchema = new Schema({
  reporterId: String,
  reportedUserId: String,
  category: String,
  reason: String,
  evidence: [String], // photo URLs
  status: { type: String, enum: ['open', 'investigating', 'resolved', 'dismissed'] },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
  assignedModerator: String,
  resolution: String,
  action: String, // warn | suspend | ban | delete
  autoSuspended: Boolean,
  createdAt: Date,
  resolvedAt: Date
});

// Add to User schema
suspended: Boolean,
suspendedReason: String,
suspendedAt: Date,
banned: Boolean,
bannedReason: String,
bannedAt: Date,
warningCount: { type: Number, default: 0 }
```

**Frontend:**
- `components/ReportModal.tsx` - enhanced with categories
- Category selector with pre-filled reasons
- Screenshot/evidence upload
- Abuse explanation text area

**Moderator Interface:**
- Queue of open reports with priority indicators
- Quick actions (warn/suspend/ban/dismiss)
- Report details with evidence preview
- Resolvence notes

**Tasks:**
- [ ] Enhanced Report schema
- [ ] Priority calculation logic
- [ ] Auto-suspend for severe reports
- [ ] Moderator review queue
- [ ] Admin dashboard stats
- [ ] Notification system for actions
- [ ] Warning system & escalation
- [ ] Ban/suspend user blocking

**Acceptance Criteria:**
- ✅ Users can report with categories
- ✅ Moderators see priority queue
- ✅ Severe reports auto-suspend
- ✅ Actions applied correctly
- ✅ Users notified of actions

**Estimate:** 16 hours | **Owner:** Backend (10h) + Frontend (6h)

---

### Task 2.4: Block & Visibility Controls (10 hours)
**Priority:** 🟠 HIGH

**Features:**
- Block user
- Hide from user
- Show only to verified users
- Restrict by age/location

```javascript
// routes/users.js
router.post('/:userId/block', authMiddleware, async (req, res) => {
  await Block.create({
    blockerId: req.userId,
    blockedUserId: req.params.userId,
    createdAt: new Date()
  });
  
  // Remove from both users' swipes/matches
  await Chat.deleteMany({
    $or: [
      { user1Id: req.userId, user2Id: req.params.userId },
      { user1Id: req.params.userId, user2Id: req.userId }
    ]
  });
  
  res.json({ success: true });
});

// Get blocked users
router.get('/blocked-users', authMiddleware, async (req, res) => {
  const blocks = await Block.find({ blockerId: req.userId });
  res.json(blocks);
});

// Check if blocked
router.get('/:userId/is-blocked', authMiddleware, async (req, res) => {
  const isBlocked = await Block.findOne({
    $or: [
      { blockerId: req.userId, blockedUserId: req.params.userId },
      { blockerId: req.params.userId, blockedUserId: req.userId }
    ]
  });
  
  res.json({ isBlocked: !!isBlocked });
});
```

**Frontend:**
- Block button in profile/chat
- Unblock from settings
- View/manage blocked list

**Tasks:**
- [ ] Create Block collection
- [ ] Block/unblock endpoints
- [ ] Check blocked before discovery
- [ ] Block UI in chat & profile
- [ ] Manage blocked list page

**Estimate:** 10 hours | **Owner:** Backend (5h) + Frontend (5h)

---

# PHASE 3: Enhancement (Weeks 5-7)

## Week 5: Search & Discovery Filters

### Task 3.1: Advanced Search Filters (14 hours)
**Priority:** 🟡 MEDIUM

**Filters:**
- Age range (min/max)
- Distance (0-500km)
- Interests (multi-select)
- Height, build, ethnicity
- Looking for (relationship type)
- Verification status
- Premium users only
- Recently active

**Backend:**

```javascript
// routes/users.js - enhance discovery
router.get('/discover', authMiddleware, async (req, res) => {
  const {
    minAge = 18,
    maxAge = 65,
    maxDistance = 100,
    interests,
    verifiedOnly = false,
    premiumOnly = false,
    recentlyActive = false,
    limit = 20,
    skip = 0
  } = req.query;
  
  const currentUser = await User.findOne({ id: req.userId });
  
  const query = {
    id: { $ne: req.userId },
    age: { $gte: minAge, $lte: maxAge },
    $nor: [
      { blockedBy: req.userId },
      { swipes: req.userId } // Don't show swiped profiles
    ]
  };
  
  // Distance filter (geospatial)
  if (maxDistance) {
    query.coordinates = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: currentUser.coordinates.coordinates
        },
        $maxDistance: maxDistance * 1000 // meters
      }
    };
  }
  
  // Interests filter
  if (interests) {
    const interestArray = interests.split(',');
    query.interests = { $in: interestArray };
  }
  
  if (verifiedOnly) {
    query.isPhotoVerified = true;
    query.emailVerified = true;
  }
  
  if (premiumOnly) {
    query.isPremium = true;
  }
  
  // Recently active (within 7 days)
  if (recentlyActive) {
    query.lastActiveAt = { $gte: Date.now() - 7 * 24 * 60 * 60 * 1000 };
  }
  
  const users = await User.find(query)
    .select('-passwordHash -swipes')
    .limit(parseInt(limit))
    .skip(parseInt(skip))
    .sort({ isPhotoVerified: -1, createdAt: -1 });
  
  res.json(users);
});
```

**Frontend:**
- `components/DiscoveryFilters.tsx`
- Toggle filters with sliders
- Multi-select interests
- Distance slider
- Filter presets (conservative, adventurous, nearby)

**Tasks:**
- [ ] Add filter fields to User schema
- [ ] Build advanced query with geo-spatial search
- [ ] Create filter UI component
- [ ] Add filter persistence (localStorage)
- [ ] Filter presets
- [ ] Sort options (newest, verified, rated)

**Acceptance Criteria:**
- ✅ All filters work correctly
- ✅ Distance geo search works
- ✅ Multiple interests filterable
- ✅ Filters persist
- ✅ Performance acceptable (< 2s)

**Estimate:** 14 hours | **Owner:** Backend (8h) + Frontend (6h)

---

### Task 3.2: Search by Username & Bio (8 hours)
**Priority:** 🟡 MEDIUM

```javascript
// routes/users.js
router.get('/search', async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Query too short' });
  }
  
  // Full-text search on username & bio
  const users = await User.find({
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { bio: { $regex: q, $options: 'i' } }
    ],
    isPhotoVerified: true // Show verified only
  })
    .select('-passwordHash')
    .limit(20);
  
  res.json(users);
});
```

**Frontend:**
- Search bar in header
- Search results page
- Recent searches

**Tasks:**
- [ ] Full-text search endpoint
- [ ] Search UI component
- [ ] Recent searches (localStorage)
- [ ] Debounced search input

**Estimate:** 8 hours | **Owner:** Backend (3h) + Frontend (5h)

---

### Task 3.3: Saved Profiles (Favorites) (10 hours)
**Priority:** 🟡 MEDIUM

```javascript
// routes/users.js
router.post('/:userId/save', authMiddleware, async (req, res) => {
  await SavedProfile.create({
    userId: req.userId,
    savedUserId: req.params.userId,
    createdAt: new Date()
  });
  res.json({ saved: true });
});

router.delete('/:userId/save', authMiddleware, async (req, res) => {
  await SavedProfile.deleteOne({
    userId: req.userId,
    savedUserId: req.params.userId
  });
  res.json({ saved: false });
});

// Get all saved profiles
router.get('/saved-profiles', authMiddleware, async (req, res) => {
  const saved = await SavedProfile.find({ userId: req.userId })
    .populate('savedUserId');
  res.json(saved);
});
```

**Frontend:**
- Heart button on profile card
- Saved profiles list
- Quick actions (match, message)

**Tasks:**
- [ ] SavedProfile collection
- [ ] Save/unsave endpoints
- [ ] Saved profiles page
- [ ] Heart button UI
- [ ] Remove saved on match

**Estimate:** 10 hours | **Owner:** Backend (5h) + Frontend (5h)

---

## Week 6: Message Enhancements

### Task 3.4: Message Reactions & Emoji (12 hours)
**Priority:** 🟡 MEDIUM

```javascript
// routes/chats.js - add reaction endpoint
router.post('/:chatId/messages/:messageId/react', authMiddleware, async (req, res) => {
  const { emoji } = req.body; // 😍, ❤️, 😂, 😮, 😢, 😡
  
  const chat = await Chat.findById(chatId);
  const message = chat.messages.id(messageId);
  
  if (!message.reactions) message.reactions = [];
  
  const existingReaction = message.reactions.find(r => r.emoji === emoji);
  if (existingReaction && existingReaction.users.includes(req.userId)) {
    // Remove reaction
    existingReaction.users = existingReaction.users.filter(u => u !== req.userId);
  } else {
    // Add reaction
    if (!existingReaction) {
      message.reactions.push({ emoji, users: [req.userId] });
    } else {
      existingReaction.users.push(req.userId);
    }
  }
  
  await chat.save();
  
  // Notify other user via WebSocket
  sendNotification(otherUserId, 'message_reaction', { messageId, emoji });
  
  res.json(message);
});
```

**Message Schema Update:**
```javascript
reactions: [{
  emoji: String,
  users: [String]
}]
```

**Frontend:**
- Reaction picker (emoji menu)
- Display reactions under message
- Click to add/remove reaction

**Tasks:**
- [ ] Add reactions field to messages
- [ ] Reaction endpoint
- [ ] Emoji picker component
- [ ] Display reactions
- [ ] Real-time sync via WebSocket

**Estimate:** 12 hours | **Owner:** Backend (6h) + Frontend (6h)

---

### Task 3.5: Message Search & History (10 hours)
**Priority:** 🟡 MEDIUM

```javascript
// routes/chats.js
router.get('/:chatId/search', authMiddleware, async (req, res) => {
  const { q } = req.query;
  
  const chat = await Chat.findById(chatId);
  
  const results = chat.messages.filter(m => 
    m.content.toLowerCase().includes(q.toLowerCase())
  );
  
  res.json(results);
});

// Get message history with pagination
router.get('/:chatId/messages', authMiddleware, async (req, res) => {
  const { limit = 30, skip = 0 } = req.query;
  
  const chat = await Chat.findById(chatId);
  const messages = chat.messages
    .reverse()
    .slice(skip, skip + limit);
  
  res.json({ messages, total: chat.messages.length });
});
```

**Frontend:**
- Search box in chat
- Message highlighting
- Load more history

**Tasks:**
- [ ] Search endpoint
- [ ] Search UI in chat
- [ ] Message highlighting
- [ ] Load older messages button

**Estimate:** 10 hours | **Owner:** Backend (4h) + Frontend (6h)

---

### Task 3.6: Message Deletion (8 hours)
**Priority:** 🟡 MEDIUM

```javascript
// routes/chats.js
router.delete('/:chatId/messages/:messageId', authMiddleware, async (req, res) => {
  const chat = await Chat.findById(chatId);
  const message = chat.messages.id(messageId);
  
  // Only allow deletion by sender or within 5 min
  if (message.senderId !== req.userId) {
    return res.status(403).json({ error: 'Cannot delete' });
  }
  
  if (Date.now() - message.createdAt > 5 * 60 * 1000) {
    return res.status(400).json({ error: 'Too late to delete' });
  }
  
  message.content = '[deleted]';
  message.deleted = true;
  
  await chat.save();
  
  // Notify via WebSocket
  sendNotification(otherUserId, 'message_deleted', { messageId });
  
  res.json(message);
});
```

**Tasks:**
- [ ] Delete message endpoint
- [ ] Time limit (5 min or configurable)
- [ ] Delete button on messages
- [ ] Real-time sync

**Estimate:** 8 hours | **Owner:** Backend (4h) + Frontend (4h)

---

## Week 7: Notification System

### Task 3.7: Push Notifications (PWA) (16 hours)
**Priority:** 🟠 HIGH

**Setup:**
```bash
npm install web-push
npx web-push generate-vapid-keys
```

**Backend:**

```javascript
// routes/notifications.js
router.post('/subscribe', authMiddleware, async (req, res) => {
  const { subscription } = req.body;
  
  await PushSubscription.create({
    userId: req.userId,
    subscription,
    createdAt: new Date()
  });
  
  res.json({ subscribed: true });
});

// Send push notification
async function sendPushNotification(userId, title, body, data) {
  const subscriptions = await PushSubscription.find({ userId });
  
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        sub.subscription,
        JSON.stringify({ title, body, data })
      );
    } catch (err) {
      if (err.statusCode === 410) {
        await PushSubscription.deleteOne({ _id: sub._id });
      }
    }
  }
}

// Services that trigger notifications
// New match
await sendPushNotification(userId, '💕 New Match!', `You matched with ${user.name}`);

// New message
await sendPushNotification(userId, '💬 New Message', `From ${sender.name}: ${preview}`);

// Incoming call
await sendPushNotification(userId, '📞 Incoming Call', `${caller.name} is calling...`);
```

**Frontend:**

```typescript
// services/pushNotifications.ts
export async function subscribeToPushNotifications() {
  const registration = await navigator.serviceWorker.ready;
  
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.VITE_VAPID_PUBLIC_KEY
  });
  
  // Send to backend
  await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription })
  });
}

// In service worker
self.addEventListener('push', event => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon-192x192.png',
    tag: data.data.userId,
    data: data.data
  });
});
```

**Service Worker Updates:**
- `public/service-worker.js` - enhanced

**Tasks:**
- [ ] Set up web-push
- [ ] Create BackendSubscription collection
- [ ] Subscribe endpoint
- [ ] Service worker notification handler
- [ ] Send push for matches/messages/calls
- [ ] Request notification permission UI
- [ ] Handle unsubscribe

**Acceptance Criteria:**
- ✅ Users can grant notification permission
- ✅ Push notifications sent & received
- ✅ Click opens app to relevant page
- ✅ Handles unsubscribe gracefully

**Estimate:** 16 hours | **Owner:** Backend (8h) + Frontend (8h)

---

### Task 3.8: Email Notifications (8 hours)
**Priority:** 🟡 MEDIUM

**Events to email:**
- New match
- First message
- Daily digest (top matches)
- Account activity (login warning)
- Premium expiry reminder

```javascript
// utils/emailNotifications.js
export async function sendMatchNotificationEmail(userId, matchedUser) {
  const user = await User.findOne({ id: userId });
  
  if (!user.notifications.newMatches) return; // Check preferences
  
  const html = `
    <h2>New Match! 💕</h2>
    <p>You matched with <strong>${matchedUser.name}</strong></p>
    <p><a href="${APP_URL}/chat/${chatId}">Start Chatting</a></p>
  `;
  
  await sendEmail(user.email, 'You have a new match!', html);
}

// Daily digest
export async function sendDailyDigest(userId) {
  const digest = await generateDailyDigest(userId);
  const html = `
    <h2>Your Daily Spark Digest</h2>
    ${digest.topMatches.map(u => `<p>${u.name}</p>`).join('')}
    <p><a href="${APP_URL}">See All Matches</a></p>
  `;
  
  await sendEmail(user.email, 'Your Daily Spark', html);
}

// Login warning for suspicious activity
export async function sendLoginWarning(userId, location, device) {
  const html = `
    <h2>New Login ⚠️</h2>
    <p>We noticed a new login from ${location} on ${device}</p>
    <p>If this wasn't you, <a href="${APP_URL}/settings/security">secure your account</a></p>
  `;
  
  await sendEmail(user.email, 'New Login Alert', html);
}
```

**Tasks:**
- [ ] Email template system
- [ ] Event listeners (match, message, etc)
- [ ] Notification preferences in settings
- [ ] Schedule daily digest (cron job)
- [ ] Track email clicks

**Estimate:** 8 hours | **Owner:** Backend

---

# PHASE 4: Monetization (Weeks 8-10)

## Week 8: Premium Features & Subscription

### Task 4.1: Super Like Feature (10 hours)
**Priority:** 🟠 HIGH

**Features:**
- Limited super likes per day (3 for premium, 1 free daily)
- Users see super liker's profile even if swiped left
- Guaranteed match if reciprocated

```javascript
// routes/matches.js
router.post('/super-like', authMiddleware, async (req, res) => {
  const { likedUserId } = req.body;
  const user = await User.findOne({ id: req.userId });
  
  // Check super like limit
  const todayCount = await SuperLike.countDocuments({
    userId: req.userId,
    createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
  });
  
  const limit = user.isPremium ? 3 : 1;
  if (todayCount >= limit) {
    return res.status(429).json({ error: 'Super like limit reached' });
  }
  
  // Create super like
  const superLike = await SuperLike.create({
    userId: req.userId,
    likedUserId,
    createdAt: new Date()
  });
  
  // Notify recipient
  await sendNotification(likedUserId, '⭐ Super Like!', `${user.name} super liked you`);
  
  res.json(superLike);
});

// Routes to show who super liked
router.get('/super-likes', authMiddleware, async (req, res) => {
  const superLikes = await SuperLike.find({ likedUserId: req.userId })
    .sort({ createdAt: -1 });
  
  res.json(superLikes);
});
```

**Database:**
```javascript
const superLikeSchema = new Schema({
  userId: String,
  likedUserId: String,
  createdAt: Date,
  matched: Boolean,
  matchedAt: Date
});

// Add to User schema
superLikesRemaining: { type: Number, default: 1 }
```

**Frontend:**
- Star button on card (alternate to like)
- Super like counter
- Show who super liked you (premium)

**Tasks:**
- [ ] Super Like collection
- [ ] Super like endpoints
- [ ] UI button & counter
- [ ] Real-time limit enforcement
- [ ] Premium-only access to see super likers

**Estimate:** 10 hours | **Owner:** Backend (5h) + Frontend (5h)

---

### Task 4.2: Undo Swipe (Premium) (8 hours)
**Priority:** 🟡 MEDIUM

```javascript
// routes/matches.js
router.post('/undo-swipe', authMiddleware, async (req, res) => {
  const user = await User.findOne({ id: req.userId });
  
  if (!user.isPremium) {
    return res.status(403).json({ error: 'Premium feature' });
  }
  
  // Get last swiped user
  const lastSwipe = await Swipe.findOne({ userId: req.userId })
    .sort({ createdAt: -1 });
  
  if (!lastSwipe) {
    return res.status(404).json({ error: 'No swipes to undo' });
  }
  
  // Delete swipe
  await Swipe.deleteOne({ _id: lastSwipe._id });
  
  // Make user visible again
  await User.updateOne(
    { id: lastSwipe.swipedUserId },
    { $pull: { swipedBy: req.userId } }
  );
  
  res.json({ undone: true, user: lastSwipe.swipedUserId });
});
```

**Frontend:**
- Undo button (only for premium)
- Toast notification showing undone profile

**Tasks:**
- [ ] Track swipe history with timestamps
- [ ] Undo endpoint
- [ ] Premium verification
- [ ] Undo button UI
- [ ] Cooldown (1 undo per 5 min)

**Estimate:** 8 hours | **Owner:** Backend (4h) + Frontend (4h)

---

### Task 4.3: Profile Boost & Visibility (12 hours)
**Priority:** 🟡 MEDIUM

**Features:**
- Show your profile to more people for 30 min
- "Boosted" badge
- Premium-only ($4.99 per boost)

```javascript
// routes/premium.js (new)
router.post('/boost', authMiddleware, async (req, res) => {
  const user = await User.findOne({ id: req.userId });
  
  if (!user.isPremium) {
    // Check coins (or charge)
    if (user.coins < 50) {
      return res.status(402).json({ error: 'Insufficient coins' });
    }
    user.coins -= 50;
  }
  
  const boost = await Boost.create({
    userId: req.userId,
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 30 * 60 * 1000),
    impressions: 0
  });
  
  await user.save();
  
  res.json(boost);
});

// Update discovery to prioritize boosted profiles
// In users.js discovery endpoint
let query = { /* ... */ };
const sortOrder = { boostedUntil: -1, isPhotoVerified: -1 };

const boosted = await Boost.find({ endsAt: { $gt: new Date() } });
if (boosted) {
  query.id = { $in: boosted.map(b => b.userId) };
}
```

**Database:**
```javascript
const boostSchema = new Schema({
  userId: String,
  startsAt: Date,
  endsAt: Date,
  impressions: { type: Number, default: 0 },
  likes: { type: Number, default: 0 }
});

// Add to User schema
activeBoosted: { type: Date }
```

**Frontend:**
- Boost button in settings
- Show countdown timer
- Display boost stats

**Tasks:**
- [ ] Boost collection
- [ ] Boost purchase endpoint
- [ ] Update discovery algorithm
- [ ] Countdown timer UI
- [ ] Analytics: impressions, likes

**Estimate:** 12 hours | **Owner:** Backend (7h) + Frontend (5h)

---

### Task 4.4: Complete Payment Integration (16 hours)
**Priority:** 🔴 CRITICAL

**Service:** Stripe (recommended)

```bash
npm install stripe
```

**Backend:**

```javascript
// routes/premium.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create subscription
router.post('/subscribe', authMiddleware, async (req, res) => {
  const { priceId } = req.body; // monthly/yearly
  const user = await User.findOne({ id: req.userId });
  
  // Create customer or get existing
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id }
    });
    customerId = customer.id;
    user.stripeCustomerId = customerId;
    await user.save();
  }
  
  // Create subscription
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent']
  });
  
  res.json({
    subscriptionId: subscription.id,
    clientSecret: subscription.latest_invoice.payment_intent.client_secret
  });
});

// Handle webhook
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  if (event.type === 'invoice.payment_succeeded') {
    const { subscription, customer_email, customer } = event.data.object;
    const user = await User.findOne({ stripeCustomerId: customer });
    
    user.isPremium = true;
    user.premiumExpiresAt = new Date(subscription.current_period_end * 1000);
    await user.save();
    
    await sendEmail(customer_email, 'Welcome to Premium', '...');
  }
  
  if (event.type === 'customer.subscription.deleted') {
    const { customer } = event.data.object;
    const user = await User.findOne({ stripeCustomerId: customer });
    
    user.isPremium = false;
    await user.save();
  }
  
  res.json({received: true});
});

// Get pricing
router.get('/pricing', async (req, res) => {
  const prices = await stripe.prices.list({
    lookup_keys: ['monthly', 'yearly'],
    expand: ['data.product']
  });
  
  res.json(prices);
});
```

**Frontend:**

```tsx
// components/PremiumModal.tsx
import { loadStripe } from '@stripe/js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-js';

export function PremiumModal() {
  const [prices, setPrices] = useState([]);
  
  useEffect(() => {
    fetch('/api/premium/pricing').then(r => r.json()).then(setPrices);
  }, []);
  
  return (
    <div>
      {prices.map(price => (
        <PriceCard key={price.id} price={price} />
      ))}
    </div>
  );
}

function PriceCard({ price }) {
  const stripe = useStripe();
  const elements = useElements();
  
  const handleSubscribe = async () => {
    const { clientSecret } = await fetch('/api/premium/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId: price.id })
    }).then(r => r.json());
    
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
        billing_details: { email: user.email }
      }
    });
    
    if (error) {
      alert(error.message);
    } else {
      // Successfully subscribed
      window.location.href = '/';
    }
  };
  
  return (
    <div>
      <h3>${price.unit_amount / 100}/{price.recurring.interval}</h3>
      <button onClick={handleSubscribe}>Subscribe</button>
    </div>
  );
}
```

**Pricing Tiers:**
- **Premium Basic:** $4.99/month
  - 3 super likes/day
  - Undo swipe
  - See who liked you
  - No ads
  
- **Premium Plus:** $9.99/month
  - Unlimited super likes
  - Rewind (undo last 12 swipes)
  - Profile boost (1/week)
  - Travel mode
  - Premium filter

**Tasks:**
- [ ] Set up Stripe account & keys
- [ ] Create subscription flow
- [ ] Handle webhooks
- [ ] Implement price UI
- [ ] Premium feature gates
- [ ] Billing history page
- [ ] Cancel subscription endpoint
- [ ] Test payment flow

**Acceptance Criteria:**
- ✅ Users can subscribe
- ✅ Webhooks update user status
- ✅ Premium features gated
- ✅ Cancellation works
- ✅ Billing history shows

**Estimate:** 16 hours | **Owner:** Backend (10h) + Frontend (6h)

---

## Week 9-10: Analytics & Performance

### Task 4.5: User Analytics Dashboard (16 hours)
**Priority:** 🟡 MEDIUM

**Metrics:**
- Total users, active users, new signups
- Swipes, matches, messages per day
- Premium conversion rate
- User retention (DAU, MAU, 7-day retention)
- Most swiped profiles
- Report trends

```javascript
// routes/admin/analytics.js
router.get('/dashboard', adminMiddleware, async (req, res) => {
  const { from = new Date(Date.now() - 30*24*60*60*1000), to = new Date() } = req.query;
  
  const stats = {
    totalUsers: await User.countDocuments(),
    activeUsers: await User.countDocuments({ 
      lastActiveAt: { $gte: Date.now() - 24*60*60*1000 }
    }),
    newSignups: await User.countDocuments({
      createdAt: { $gte: from, $lte: to }
    }),
    premiumUsers: await User.countDocuments({ isPremium: true }),
    totalSwipes: await Swipe.countDocuments({ createdAt: { $gte: from } }),
    totalMatches: await Match.countDocuments({ createdAt: { $gte: from } }),
    totalMessages: await Chat.aggregate([
      { $match: { createdAt: { $gte: from } } },
      { $project: { messageCount: { $size: '$messages' } } },
      { $group: { _id: null, total: { $sum: '$messageCount' } } }
    ]),
    reportStats: await Report.aggregate([
      { 
        $group: { 
          _id: '$category', 
          count: { $sum: 1 },
          resolved: { $sum: { $cond: ['$resolvedAt', 1, 0] } }
        } 
      }
    ])
  };
  
  // Retention (users active today who were active 7 days ago)
  const today = new Date(Date.now() - 24*60*60*1000);
  const weekAgo = new Date(Date.now() - 7*24*60*60*1000);
  
  const activeToday = await User.find({ lastActiveAt: { $gte: today } });
  const activeWeekAgo = await User.find({ lastActiveAt: { $gte: weekAgo } });
  
  const retained = activeToday.filter(u => activeWeekAgo.find(a => a.id === u.id));
  
  stats.retention7Day = (retained.length / activeWeekAgo.length * 100).toFixed(2) + '%';
  
  res.json(stats);
});
```

**Frontend:**
- `components/AdminAnalytics.tsx`
- Charts (Chart.js or Recharts)
- Date range selector
- Export data (CSV)

**Tasks:**
- [ ] Implement analytics endpoints
- [ ] Design dashboard
- [ ] Add charts
- [ ] Real-time updates (optional)
- [ ] Range selection
- [ ] Export functionality

**Estimate:** 16 hours | **Owner:** Backend (8h) + Frontend (8h)

---

# PHASE 5: Polish & Scale (Weeks 11+)

## Week 11: Performance & Dark Mode

### Task 5.1: Dark Mode (10 hours)
**Priority:** 🟡 MEDIUM

```tsx
// services/ThemeContext.tsx
import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);
  
  return (
    <ThemeContext.Provider value={{ isDark, setIsDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

**Tailwind Config:**
```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#1a1a1a',
          card: '#2d2d2d',
          text: '#e0e0e0'
        }
      }
    }
  }
};
```

**Tasks:**
- [ ] Create theme context
- [ ] Update Tailwind config
- [ ] Add dark mode colors
- [ ] Update all components
- [ ] Toggle in settings
- [ ] System preference detection

**Estimate:** 10 hours | **Owner:** Frontend

---

### Task 5.2: Image Optimization (12 hours)
**Priority:** 🟠 HIGH

**Strategies:**
- WebP format with fallback
- Lazy loading
- Image resizing on upload
- CDN caching

```typescript
// utils/imageOptimization.ts
import { Cloudinary } from '@cloudinary/url-gen';

const cld = new Cloudinary();

export function optimizeImageUrl(url: string, width: number = 400) {
  return cld.image(url)
    .format('auto')
    .quality('auto')
    .resize(new Resize().fill().width(width).height(width))
    .toURL();
}
```

**Frontend:**
```tsx
// Use next-gen image format
<img src={optimizeImageUrl(url, 400)} loading="lazy" />
```

**Tasks:**
- [ ] Configure Cloudinary transformations
- [ ] Lazy loading on lists
- [ ] Responsive images (srcset)
- [ ] WebP with fallback
- [ ] Image compression on upload
- [ ] Cache headers

**Estimate:** 12 hours | **Owner:** Frontend (8h) + Backend (4h)

---

### Task 5.3: Performance Optimization (14 hours)
**Priority:** 🟠 HIGH

**Areas:**
- Code splitting
- Lazy route loading
- Bundle analysis
- Service worker caching
- Compression (gzip)

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import compression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    compression({ 
      algorithm: 'gzip',
      threshold: 10240
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'routing': ['react-router-dom']
        }
      }
    }
  }
});
```

**Tasks:**
- [ ] Route-based code splitting
- [ ] Image lazy loading
- [ ] Dependency optimization
- [ ] Bundle analysis
- [ ] Gzip compression
- [ ] Service worker precaching
- [ ] Lighthouse score testing

**Estimate:** 14 hours | **Owner:** Frontend (10h) + DevOps (4h)

---

## Week 12+: Mobile & Final Polish

### Task 5.4: Mobile Responsiveness (12 hours)
**Priority:** 🟡 MEDIUM

**Viewport Settings:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
```

**Tailwind Responsive:**
```tsx
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
  {/* Responsive grid */}
</div>
```

**Tasks:**
- [ ] Mobile-first design review
- [ ] Touch interactions (larger buttons)
- [ ] Horizontal swipe gestures
- [ ] Bottom nav for mobile
- [ ] Test on iPhone/Android
- [ ] Responsive images

**Estimate:** 12 hours | **Owner:** Frontend

---

### Task 5.5: Accessibility Improvements (10 hours)
**Priority:** 🟡 MEDIUM

**Audit with:**
```bash
npm install axe-core @axe-core/react
```

**Tasks:**
- [ ] ARIA labels
- [ ] Keyboard navigation
- [ ] Focus indicators
- [ ] Color contrast
- [ ] Screen reader testing
- [ ] Form labels & error messages

**Estimate:** 10 hours | **Owner:** Frontend

---

# 📈 Timeline Summary

| Phase | Duration | Start | End | Priority |
|-------|----------|-------|-----|----------|
| **Phase 1: Foundation** | 2 weeks | Week 1 | Week 2 | 🔴 CRITICAL |
| **Phase 2: Trust & Safety** | 2 weeks | Week 3 | Week 4 | 🔴 CRITICAL |
| **Phase 3: Enhancement** | 3 weeks | Week 5 | Week 7 | 🟠 HIGH |
| **Phase 4: Monetization** | 3 weeks | Week 8 | Week 10 | 🟠 HIGH |
| **Phase 5: Polish & Scale** | 2+ weeks | Week 11 | Week 12+ | 🟡 MEDIUM |

**Total:** 12+ weeks (~3 months)

---

# 🎯 Success Metrics

### Launch Readiness Checklist:
- ✅ All critical features implemented
- ✅ 95%+ unit test coverage
- ✅ Lighthouse score 85+
- ✅ Zero critical security vulnerabilities
- ✅ GDPR/privacy compliant
- ✅ Load time < 3s
- ✅ 99.9% uptime

### Growth Metrics (Post-Launch):
- DAU/MAU
- Conversion to premium (5-10% target)
- Message initiation rate (>30%)
- User retention (7-day: 40%+, 30-day: 20%+)
- Net Promoter Score (NPS 40+)

---

# 💰 Resource Estimate

**Team:**
- Backend: 1-2 developers
- Frontend: 1-2 developers
- DevOps: 0.5 developer
- QA: 0.5-1 tester

**Budget (approximate):**
- Development: $40,000-80,000 (depends on rates)
- Infrastructure: $500-1,500/month
- Third-party services: $200-500/month
  - Stripe processing fees (2.2% + $0.30)
  - Email service (SendGrid): $10-50/month
  - Image CDN (Cloudinary): $50-200/month
  - Video call (Twilio/Agora - if needed): $0.01-0.05/min

---

# ⚠️ Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Security breaches | Implement rate limiting, input validation, HTTPS |
| Fake profiles | Photo verification, email verification |
| Harassment | Strong moderation, reporting, blocking |
| Payment fraud | Use Stripe, implement 3D Secure |
| Performance issues | CDN, caching, lazy loading, monitoring |
| Scaling issues | Database indexing, load balancing, microservices |

---

# 🚀 Launch Checklist

- [ ] All Phase 1 & 2 features complete
- [ ] No critical bugs (Sentry monitoring)
- [ ] Legal pages & ToS
- [ ] Privacy policy & GDPR compliance
- [ ] Load testing (1000+ concurrent users)
- [ ] Security audit
- [ ] Mobile app testing
- [ ] User documentation
- [ ] Admin training
- [ ] Monitoring & alerting
- [ ] Backup & disaster recovery
- [ ] Marketing materials ready

---

**Next Steps:**
1. Assign team members to Phase 1
2. Set up development environment
3. Start Week 1: Legal pages & error handling
4. Daily standups to track progress
5. Weekly retrospectives

Would you like me to:
1. **Start implementing** any Phase 1 task?
2. **Create detailed specs** for a specific feature?
3. **Set up project management** (Trello/GitHub Projects)?
4. **Create test suites** for features?

