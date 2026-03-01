# Activity Logging System - Complete Documentation

## Overview

The activity logging system tracks all important user and moderator actions within the dating app platform. Every action is recorded to the `ActivityLog` MongoDB collection for comprehensive audit trails, analytics, and compliance.

## Features

✅ **Centralized Logging Utility** - Single function factory for all logging operations
✅ **Action Type Enums** - Predefined action types with validation
✅ **Metadata Support** - Flexible metadata field for action-specific data
✅ **Moderator Attribution** - Tracks which moderator performed each action
✅ **IP & User Agent Tracking** - Optional client info capture for security
✅ **Status Tracking** - Success/failure/pending status for each log entry
✅ **Automatic Timestamps** - All logs timestamped with timezone info
✅ **Database Indexes** - Optimized queries for reporting and analytics

## Supported Action Types

```javascript
'signup'              // New user registration
'payment_change'      // Payment/transaction processed
'moderator_action'    // Chat replied, chat resolved, etc.
'ban'                 // User banned from platform
'warn'                // User warning issued
'login'               // User login
'logout'              // User logout
'profile_update'      // User profile modified
'role_change'         // User role promoted/demoted
'email_verification'  // Email verified
'photo_verification'  // Photo approved/rejected
```

## API Reference

### Core Logging Function

```javascript
import { logActivity } from './utils/activityLogger.js';

await logActivity({
  action: 'warn',                    // Required: Action type
  userId: '9b17d40d-...',           // Required: Target user ID
  moderatorId: 'a1c3d5f7-...',      // Optional: Moderator who performed action
  description: 'User warned for...',  // Required: Human-readable description
  details: 'Additional context',      // Optional: Extra details
  metadata: { reason: 'spam' },       // Optional: Action-specific data
  ipAddress: '192.168.1.1',          // Optional: User IP address
  userAgent: 'Mozilla/5.0...',       // Optional: Browser/device info
  status: 'success'                   // Optional: 'success'|'failure'|'pending'
});
```

### Convenience Functions

#### Authentication

```javascript
import { logLogin, logLogout, logSignup } from './utils/activityLogger.js';

// User login
await logLogin(userId, req);

// User logout
await logLogout(userId, req);

// New user signup with account type
await logSignup(userId, email, 'APP', req);  // or 'STANDALONE'
```

#### User Profile Actions

```javascript
import { logProfileUpdate, logEmailVerification } from './utils/activityLogger.js';

// Profile updated
await logProfileUpdate(userId, { name: 'John', age: 25 }, moderatorId);

// Email verified
await logEmailVerification(userId, 'user@example.com');
```

#### Payment/Verification

```javascript
import { logPaymentChange, logPhotoVerification } from './utils/activityLogger.js';

// Payment processed
await logPaymentChange(userId, {
  type: 'withdrawal',
  amount: 50,
  method: 'PayPal'
});

// Photo verification result
await logPhotoVerification(userId, 'photo-id-123', true);  // true = verified
```

#### Moderation Actions

```javascript
import { logBan, logWarn, logModeratorAction, logRoleChange } from './utils/activityLogger.js';

// User warned
await logWarn(userId, 'Inappropriate language', moderatorId);

// User banned
await logBan(userId, 'Harassing other users', 'permanent', moderatorId);

// Generic moderator action
await logModeratorAction(userId, 'replied', 'chat-123', 'Resolved support ticket', moderatorId);

// Role change
await logRoleChange(userId, 'USER', 'MODERATOR', moderatorId);
```

## Integration Points

### 1. Authentication Routes (`/backend/routes/auth.js`)

Integrated logging for:
- **Register** - Logs `signup` action with account type
- **Email Verification** - Logs `email_verification` action
- **Login** - Logs `login` action with IP & user agent
- **Logout** - Logs `logout` action

### 2. Moderation Routes (`/backend/routes/moderation.js`)

Integrated logging for:
- **User Warning** - `logWarn()` on warn action
- **User Ban** - `logBan()` on ban action with duration
- **Lift Ban** - `logModeratorAction()` when moderator lifts ban
- **Clear Restrictions** - `logModeratorAction()` when removing timeouts/mutes
- **Reply to Chat** - `logModeratorAction()` when marking chat as replied
- **Send Response** - `logModeratorAction()` when moderator sends support message
- **Report User** - `logModeratorAction()` when user is reported

## Database Schema

```javascript
{
  id: String,          // UUID - unique log entry ID
  action: String,      // Enum of action types
  userId: String,      // User affected by action
  moderatorId: String, // Moderator who performed action (if applicable)
  description: String, // Human-readable action summary
  details: String,     // Additional context (optional)
  metadata: Mixed,     // Action-specific data (flexible)
  timestamp: Date,     // When action occurred (auto-set)
  ipAddress: String,   // User's IP address (from request)
  userAgent: String,   // User's browser/device info
  status: String       // 'success' | 'failure' | 'pending'
}
```

### Database Indexes

```javascript
// Fast timestamp queries
{ timestamp: -1 }

// Filter by action and time
{ action: 1, timestamp: -1 }

// User activity history
{ userId: 1, timestamp: -1 }
```

## Example Logs

### Successful Login
```javascript
{
  action: 'login',
  userId: 'user-123',
  description: 'User logged in',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  timestamp: 2026-03-01T15:14:23.000Z,
  status: 'success'
}
```

### Moderator Ban Action
```javascript
{
  action: 'ban',
  userId: 'baduser-456',
  moderatorId: 'admin-789',
  description: 'User banned (permanent): Harassment of other users',
  metadata: {
    reason: 'Harassment of other users',
    duration: 'permanent',
    moderatorId: 'admin-789'
  },
  timestamp: 2026-03-01T15:14:23.000Z,
  status: 'success'
}
```

### Chat Reply by Moderator
```javascript
{
  action: 'moderator_action',
  userId: 'operator-123',
  moderatorId: 'admin-789',
  description: 'Moderator replied for chat ID: chat-abc123 - Chat marked as replied by moderator',
  metadata: {
    actionType: 'replied',
    chatId: 'chat-abc123',
    moderatorId: 'admin-789'
  },
  timestamp: 2026-03-01T15:14:23.000Z,
  status: 'success'
}
```

## Admin Dashboard Integration

The logs are displayed in the **ModeratorPanel** component:

### RESOLVED Tab (Activity Log View)
- Shows recent activity logs with action type
- Color-coded by action:
  - 🟢 **Green** - signup, successful actions
  - 🔵 **Blue** - payment_change, login
  - 🟣 **Purple** - moderator_action, role_change
  - 🔴 **Red** - ban, warn

### Endpoint: `GET /api/moderation/logs/activity`

```javascript
// Request
GET /api/moderation/logs/activity?limit=50&skip=0&action=ban&userId=user-123

// Response
{
  success: true,
  logs: [
    {
      id: '64712e8c-...',
      action: 'ban',
      userId: 'user-123',
      moderatorId: 'admin-789',
      description: 'User banned (permanent): Harassment',
      metadata: { ... },
      timestamp: '2026-03-01T15:14:23.000Z'
    },
    ...
  ],
  total: 156,
  limit: 50,
  skip: 0,
  hasMore: true
}
```

## Best Practices

### ✅ DO

- Always await logging calls to ensure they complete
- Include meaningful descriptions that describe the action clearly
- Use metadata for structured data about the action
- Capture moderator ID when action is moderator-initiated
- Include IP address and user agent from requests for security
- Use the convenience functions for common actions (logLogin, logBan, etc.)

### ❌ DON'T

- Don't throw errors if logging fails (already caught and logged)
- Don't store sensitive data in logs (passwords, full credit cards, etc.)
- Don't use generic descriptions like "action performed"
- Don't skip moderatorId when a moderator performed the action
- Don't call logging synchronously if possible (use await)
- Don't modify ActivityLog entries after creation (immutable audit trail)

## Testing

Run the test suite to verify logging functionality:

```bash
cd backend
node test-activity-logging.js
```

Expected output:
```
[TEST] Testing Activity Logging System...
1. Testing logSignup()
   ✓ Signup logged
2. Testing logEmailVerification()
   ✓ Email verification logged
... (continues for all action types)
[TEST] ✅ All logging tests passed!
```

## Future Enhancements

- [ ] Real-time WebSocket notifications of critical actions
- [ ] Advanced search/filtering in admin dashboard
- [ ] Export logs to CSV/PDF for compliance
- [ ] Automated alerts for suspicious patterns
- [ ] Log retention policies (archive old logs)
- [ ] Integration with external logging services (e.g., Datadog)
- [ ] Custom log viewers for different admin roles
- [ ] Automated report generation from logs

## Troubleshooting

### Logs not appearing in database
1. Verify MongoDB connection in `.env` file
2. Check that ActivityLog model is imported correctly
3. Ensure NodeJS process isn't crashing silently
4. Review server logs for connection errors

### Missing moderator attribution
- Ensure `req.userId` is available in the route handler
- Verify authMiddleware is applied to the route
- Check that moderatorId is passed to logging functions

### Performance issues
- Create additional indexes if querying specific action types frequently
- Archive old logs to a separate collection for faster queries
- Implement pagination in admin dashboard (already done)

## Support

For questions or issues related to the activity logging system, review:
- Backend: `/backend/utils/activityLogger.js`
- Database Model: `/backend/models/ActivityLog.js`
- Admin Dashboard: `/components/ModeratorPanel.tsx` (RESOLVED tab)
- Routes: `/backend/routes/auth.js` and `/backend/routes/moderation.js`
