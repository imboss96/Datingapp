# Activity Logging - Quick Reference

## Currently Integrated Endpoints

### Authentication Routes

| Endpoint | Method | Logs | Action Type | Details |
|----------|--------|------|-------------|---------|
| `/api/auth/register` | POST | ✅ | `signup` | Tracks new user registration with email and account type |
| `/api/auth/verify-email` | POST | ✅ | `email_verification` | Tracks when users verify their email |
| `/api/auth/login` | POST | ✅ | `login` | Captures login with IP address and user agent |
| `/api/auth/logout` | POST | ✅ | `logout` | Tracks user logouts |

### Moderation Routes

| Endpoint | Method | Logs | Action Type | Details |
|----------|--------|------|-------------|---------|
| `/api/moderation/user-action` | POST | ✅ | `warn`, `ban` | Moderator warns or bans users (action type in body) |
| `/api/moderation/user/:userId/lift-ban` | POST | ✅ | `moderator_action` | Moderator lifts ban from user |
| `/api/moderation/user/:userId/clear-restrictions` | POST | ✅ | `moderator_action` | Moderator clears timeouts/mutes |
| `/api/moderation/report-user` | POST | ✅ | `moderator_action` | Moderator reports a user |
| `/api/moderation/send-response/:chatId` | POST | ✅ | `moderator_action` | Moderator sends support response to chat |
| `/api/moderation/mark-replied/:chatId` | PUT | ✅ | `moderator_action` | Moderator marks chat as replied |
| `/api/moderation/logs/activity` | GET | - | - | Retrieves activity logs for admin dashboard |

## How to Add Logging to New Endpoints

### Step 1: Import the logging function
```javascript
import { logActivity, logBan, logModeratorAction, ... } from '../utils/activityLogger.js';
```

### Step 2: Call logging function when action completes
```javascript
router.post('/new-action', authMiddleware, async (req, res) => {
  try {
    // ... perform action ...
    
    // Log the action
    await logModeratorAction(userId, 'action_type', entityId, 'description', moderatorId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[ERROR]', error);
    res.status(500).json({ error: 'Failed' });
  }
});
```

### Step 3: Choose appropriate logging function

**For user-initiated actions:**
- `logLogin()` - User logs in
- `logLogout()` - User logs out
- `logSignup()` - User creates account
- `logProfileUpdate()` - User updates profile
- `logEmailVerification()` - User verifies email
- `logPhotoVerification()` - User submits photo

**For moderator actions:**
- `logWarn(userId, reason, moderatorId)` - Warn a user
- `logBan(userId, reason, duration, moderatorId)` - Ban a user
- `logModeratorAction(userId, actionType, entityId, description, moderatorId)` - Generic action
- `logRoleChange(userId, oldRole, newRole, moderatorId)` - Change user role

**For transactions:**
- `logPaymentChange(userId, details)` - Payment processed

## Admin Dashboard Integration

### Accessing Activity Logs

1. **Navigate to Admin Dashboard** → ModeratorPanel
2. **Click "RESOLVED" tab** (Indigo colored)
3. **View activity log entries** with filters:
   - Search by action type
   - Search by user ID
   - Sort by timestamp
   - See moderator attribution

### Log Display

Each log shows:
- ✓ **Action** - Type of action (color-coded)
- 📝 **Description** - What happened
- 👤 **User** - Who was affected
- ⚖ **Moderator** - Who performed the action (if applicable)
- 🕐 **Timestamp** - When it happened

## Database Queries

### Get all logs for a specific user
```javascript
const logs = await ActivityLog.find({ userId: 'user-id' })
  .sort({ timestamp: -1 })
  .limit(50);
```

### Get all actions performed by a moderator
```javascript
const modActions = await ActivityLog.find({ moderatorId: 'mod-id' })
  .sort({ timestamp: -1 });
```

### Get all bans issued
```javascript
const bans = await ActivityLog.find({ action: 'ban' })
  .sort({ timestamp: -1 });
```

### Get logs from specific date range
```javascript
const logs = await ActivityLog.find({
  timestamp: {
    $gte: new Date('2026-03-01'),
    $lte: new Date('2026-03-31')
  }
}).sort({ timestamp: -1 });
```

## Data Flow

```
User/Moderator Action
         ↓
Express Route Handler
         ↓
Business Logic (save to User, Chat, etc.)
         ↓
Call logging function (await logActivity(...))
         ↓
ActivityLog saved to MongoDB
         ↓
Admin Dashboard queries logs
         ↓
RESOLVED tab displays in ModeratorPanel
```

## Statistics from Admin Dashboard

The RESOLVED tab provides:
- Recent activity timeline
- Action breakdown by type
- Moderator action history
- User activity history
- Color-coded visual indicators

## Testing Logs

```bash
# Run test suite to verify logging works
cd backend
node test-activity-logging.js

# Check specific logs in MongoDB
mongosh
use datingapp
db.activitylogs.find({ action: 'login' }).limit(10)
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Logs not appearing | Verify MongoDB is running, check connection string |
| Missing moderator ID | Ensure `req.userId` is available via authMiddleware |
| Logs showing as "pending" | Check action status parameter |
| Old logs missing | May be archived; check retention policy |
| Slow queries | Verify indexes exist: `timestamp`, `action`, `userId` |

## Future Work

- [ ] Bulk export logs to CSV
- [ ] Advanced search with date range picker
- [ ] Real-time activity feed
- [ ] Automated alerts for critical actions
- [ ] Log analysis and reporting
- [ ] Integration with external audit systems
