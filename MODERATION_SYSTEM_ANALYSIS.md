# Complete Moderation System Analysis

## Executive Summary

Your moderation system is a comprehensive two-tier system supporting both **APP** users onboarded into moderator roles and **STANDALONE** external registrants. It manages chat moderation, earnings tracking, payments, and full activity logging.

---

## 1. MODERATOR REGISTRATION & ONBOARDING

### 1.1 Registration Methods

#### A. **STANDALONE Registration** (External Signup)
- **Route:** `POST /api/moderation-auth/register`
- **File:** `backend/routes/moderationAuth.js`
- **Flow:**
  1. User provides: email, username, password (8+ chars), password confirmation, name
  2. System validates uniqueness of email/username
  3. Password hashed with bcryptjs (salt rounds: 10)
  4. User created with:
     - `accountType: 'STANDALONE'`
     - `role: 'MODERATOR'` (auto-assigned)
     - `emailVerified: true` (auto-verified)
     - `coins: 0`
  5. ModeratorEarnings record auto-created:
     - `sessionEarnings: 0`
     - `totalEarnings: 0`
     - `lastResetAt: Date.now()`
  6. JWT token generated (expiry: 7d)
  7. Activity logged via `logSignup()`

#### B. **APP Registration** (Admin Manual Onboarding)
- **Route:** `POST /api/moderation/users/create`
- **File:** `backend/routes/moderation.js`
- **Permissions:** Admin-only (`adminOnlyMiddleware`)
- **Parameters:**
  ```javascript
  {
    username: string,
    email: string,
    password: string,
    name: string,
    age?: number,
    bio?: string,
    location?: string,
    role: 'USER' | 'MODERATOR' | 'ADMIN',
    accountType: 'APP' | 'STANDALONE',
    images?: string[]
  }
  ```

### 1.2 User Model Fields (Moderator)

```javascript
{
  id: String (UUID),
  email: String (unique, lowercase),
  passwordHash: String,
  username: String (unique, lowercase),
  name: String,
  age: Number,
  role: String ('USER' | 'MODERATOR' | 'ADMIN'),
  accountType: String ('APP' | 'STANDALONE'),
  
  // Status tracking
  suspended: Boolean,
  suspendedReason: String,
  suspendedAt: Date,
  banned: Boolean,
  bannedReason: String,
  bannedAt: Date,
  warningCount: Number,
  
  // Online tracking
  isOnline: Boolean,
  lastActiveAt: Date,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

### 1.3 Login

- **Route:** `POST /api/moderation-auth/login`
- **Supports:** Both APP and STANDALONE users
- **Checks:** (in order)
  1. User exists by username or email
  2. Account not suspended
  3. Account not banned
  4. Password matches
  5. Generate JWT with 7d expiry
- **Returns:** Token + user data

---

## 2. CHAT ASSIGNMENT TO MODERATORS

### 2.1 Chat Model Structure

```javascript
{
  id: String (unique),
  participants: [String], // User IDs
  participantsKey: String (unique, sorted participants),
  messages: [Message],
  
  // Moderator support fields
  assignedModerator: String (moderator user ID),
  repliedBy: String (moderator who replied),
  
  // Reply tracking
  isReplied: Boolean, // true if replied to by operator
  replyStatus: String ('unreplied' | 'replied' | 'archived'),
  markedAsRepliedAt: Number (timestamp),
  lastMessageTime: Number (timestamp),
  replyDeadline: Number (24 hours after last message),
  
  // Chat request system
  requestStatus: String ('pending' | 'accepted' | 'blocked'),
  requestInitiator: String (who initiated),
  blockedBy: [String],
  deletedBy: [String],
  
  // Support status
  isStalled: Boolean,
  stalledSince: Number,
  supportStatus: String ('none' | 'assigned' | 'active' | 'resolved'),
  
  // Unread tracking
  unreadCounts: Map<String, Number>,
  lastOpened: Map<String, Number>,
  
  createdAt: Date,
  lastUpdated: Number
}
```

### 2.2 Chat Assignment Workflow

#### Automatic Assignment
- **Get Unreplied Chats:** `GET /api/moderation/unreplied-chats`
- Fetches chats where:
  - `replyStatus: 'unreplied'` OR `isReplied: false`
  - AND assigned to requesting moderator OR unassigned
- Returns ordered by `lastUpdated` (newest first)

#### Manual Assignment (Admin Only)
- Not explicitly in routes but handled via chat update
- Admin can assign `assignedModerator` field directly
- Activity logged via `logModeratorAssigned()`

---

## 3. MODERATOR ACTIONS

### 3.1 Send Response to Chat

- **Route:** `POST /api/moderation/send-response/:chatId`
- **Permissions:** Moderator+ only
- **Parameters:**
  ```javascript
  {
    recipientId: String (chat participant),
    text: String (message content)
  }
  ```
- **Process:**
  1. Validate chat exists
  2. Verify recipient is participant
  3. Create message:
     - `senderId: recipientId` (send as the recipient/operator)
     - `moderatorId: req.userId` (tag moderator)
     - `isModerationResponse: true`
     - `timestamp: Date.now()`
  4. Update unread counts
  5. Log action: `logModeratorAction(recipientId, 'send-response', chatId, ...)`
  6. Return message object

### 3.2 Mark Chat as Replied

- **Route:** `PUT /api/moderation/mark-replied/:chatId`
- **Permissions:** Moderator+ only
- **Process:**
  1. Find chat by ID
  2. Update status:
     - `isReplied: true`
     - `replyStatus: 'replied'`
     - `markedAsRepliedAt: Date.now()`
     - `assignedModerator: req.userId`
     - `repliedBy: req.userId`
  3. Create earnings record (auto):
     ```javascript
     new ModeratorEarnings({
       moderatorId: req.userId,
       moderatorName: moderator.name,
       chatId: chatId,
       earnedAmount: 0.50, // Fixed rate per reply
       status: 'approved',
       repliedAt: markedAsRepliedAt,
       notes: 'Chat reply by moderator...'
     })
     ```
  4. Log action: `logModeratorAction()`
  5. Return updated chat

### 3.3 User Moderation Actions

- **Route:** `POST /api/moderation/user-action`
- **Permissions:** Moderator+ only
- **Supported Actions:**
  ```javascript
  {
    userId: String,
    action: 'warn' | 'ban' | 'block' | 'timeout' | 'mute' | 'report',
    reason: String,
    chatId?: String,
    duration?: Number (milliseconds)
  }
  ```
- **Effects per action:**
  
  | Action | Effect | Duration Support |
  |--------|--------|------------------|
  | `warn` | `User.warnings++` | No |
  | `ban` | `User.banned = true` | Permanent |
  | `block` | Add moderator to `User.blockedUsers` | N/A |
  | `timeout` | `User.timeoutUntil = now + duration` | Yes |
  | `mute` | `User.mutedUntil = now + duration` | Yes |
  | `report` | `User.reportedCount++` | N/A |
  
- **Record kept:** Added to `User.moderationHistory` array
- **Activity logged:**
  - Warnings: `logWarn()`
  - Bans: `logBan()` (type: 'temporary' | 'permanent')
  - Other: `logModeratorAction()`

### 3.4 Get User Moderation History

- **Route:** `GET /api/moderation/user/:userId/history`
- **Returns:**
  ```javascript
  {
    userId: String,
    username: String,
    warnings: Number,
    banned: Boolean,
    banReason: String,
    bannedAt: Date,
    timeoutUntil: Date,
    mutedUntil: Date,
    reportedCount: Number,
    moderationHistory: [{
      type: String,
      reason: String,
      moderatorId: String,
      timestamp: Date
    }]
  }
  ```

### 3.5 Lift User Ban / Clear Restrictions

- **Lift Ban:** `POST /api/moderation/user/:userId/lift-ban`
- **Clear Restrictions:** `POST /api/moderation/user/:userId/clear-restrictions`
- Both log the action and update history

---

## 4. EARNINGS & PAYMENT TRACKING

### 4.1 ModeratorEarnings Model

```javascript
{
  moderatorId: String (indexed),
  moderatorName: String,
  chatId: String,
  earnedAmount: Number,
  status: String ('pending' | 'approved' | 'paid' | 'disputed'),
  paymentMethod: String ('bank_transfer' | 'mobile_money' | 'wallet' | 'pending'),
  transactionId: String,
  repliedAt: Date (when moderator replied),
  paidAt: Date (when payment processed),
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 4.2 Earning Recording

**Auto-recorded when:** Chat marked as replied
- **Amount:** $0.50 per chat (fixed rate)
- **Status:** 'approved' (auto-approved)
- **Associated with:** `chatId` and moderator

### 4.3 Session Earnings Tracking

#### Get Session Earnings
- **Route:** `GET /api/moderation/session-earnings`
- **Returns:**
  ```javascript
  {
    sessionEarnings: Number,
    totalEarnings: Number,
    replyRate: Number,
    lastResetAt: Date
  }
  ```
- **Auto-reset:** At 12:00 UTC daily
  - Moves `sessionEarnings` to daily history
  - Adds to `totalEarnings`
  - Resets `sessionEarnings` to 0

#### Update Session Earnings
- **Route:** `POST /api/moderation/session-earnings/add`
- **Manual amount addition** (rarely used)

#### Clear Session Earnings
- **Route:** `POST /api/moderation/session-earnings/clear`
- **Manually triggers daily reset**

### 4.4 Earnings History & Summaries

#### Get Daily History
- **Route:** `GET /api/moderation/earnings-history`
- **Returns:** Daily breakdown + running total

#### Get Moderator Summary
- **Route:** `GET /api/moderation/moderator/:userId/earnings`
- **Returns:**
  ```javascript
  {
    totalEarned: Number,
    totalApproved: Number,
    totalPending: Number,
    totalPaid: Number,
    chatsCompleted: Number,
    pendingChats: Number
  }
  ```

#### Get All Moderators Earnings
- **Route:** `GET /api/moderation/earnings/summary`
- **Returns:** Sorted by `totalEarned` (descending)

#### Mark Earnings as Paid (Admin)
- **Route:** `POST /api/moderation/moderator/:userId/mark-paid`
- **Parameters:**
  ```javascript
  {
    earningIds: [String],
    paymentMethod?: String,
    transactionId?: String
  }
  ```
- **Updates status:** 'approved' → 'paid'
- **Sets:** `paidAt: Date.now()`

---

## 5. PAYMENT SYSTEM

### 5.1 Payment Methods

#### PaymentMethod Model
```javascript
{
  id: String (unique),
  moderatorId: String,
  type: String ('mpesa' | 'card' | 'bank_transfer' | 'paypal' | 'zelle' | 
                'cash' | 'payoneer' | 'chime' | 'cashapp'),
  name: String,
  details: String (encrypted sensitive data),
  lastFourDigits: String,
  bankName: String,
  isDefault: Boolean,
  isActive: Boolean,
  isVerified: Boolean,
  verifiedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### Get Payment Methods
- **Route:** `GET /api/moderation/payment-methods/:moderatorId`
- **Auth:** User accessing their own methods only

#### Add Payment Method
- **Route:** `POST /api/moderation/payment-methods/:moderatorId`
- **Parameters:**
  ```javascript
  {
    type: String (required),
    name: String (required),
    details: String (required, currently not encrypted),
    lastFourDigits?: String,
    bankName?: String
  }
  ```
- **First method auto-set as default**

#### Update Payment Method
- **Route:** `PUT /api/moderation/payment-methods/:moderatorId/:methodId`
- **Delete Payment Method**
- **Route:** `DELETE /api/moderation/payment-methods/:moderatorId/:methodId`
- **Soft delete** (marked `isActive: false`)
- **If default, reassign default** to another active method

#### Set Default Payment Method
- **Route:** `PUT /api/moderation/payment-methods/:moderatorId/:methodId/set-default`
- Removes default from all other methods, sets for this one

### 5.2 Payment Transactions

#### PaymentTransaction Model
```javascript
{
  id: String (unique),
  moderatorId: String,
  paymentMethodId: String,
  amount: Number,
  currency: String ('USD'),
  status: String ('pending' | 'processing' | 'completed' | 'failed' | 
                  'declined' | 'refunded'),
  transactionType: String ('payout' | 'deposit' | 'refund' | 'adjustment'),
  description: String,
  processingFee: Number,
  netAmount: Number,
  externalTransactionId?: String,
  errorMessage?: String,
  errorCode?: String,
  events: [{
    status: String,
    timestamp: Date,
    notes?: String
  }],
  createdAt: Date,
  processedAt: Date,
  completedAt: Date,
  metadata: Mixed
}
```

#### Record Payment
- **Route:** `POST /api/moderation/record-payment/:moderatorId`
- **Parameters:**
  ```javascript
  {
    amount: Number,
    methodId: String,
    description?: String,
    transactionType?: 'payout' | 'deposit' | 'refund' | 'adjustment'
  }
  ```
- **Calculation:**
  - `processingFee = amount * 0.025` (2.5%)
  - `netAmount = amount - processingFee`
- **Status:** 'pending' initially

#### Get Payment Balance
- **Route:** `GET /api/moderation/payment-balance/:moderatorId`
- **Returns:**
  ```javascript
  {
    balance: Number,
    pendingPayments: Number,
    currency: 'USD'
  }
  ```
- **Calculation:** Sum of (pending earnings + pending transactions)

#### Get Payment History
- **Route:** `GET /api/moderation/payment-history/:moderatorId`
- **Pagination:** `limit`, `skip` params
- **Returns:** Paginated transaction list

---

## 6. API ENDPOINTS - COMPLETE REFERENCE

### Moderator Operations (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/moderation/send-response/:chatId` | Send moderator response |
| PUT | `/api/moderation/mark-replied/:chatId` | Mark chat as replied (creates earning) |
| GET | `/api/moderation/unreplied-chats` | Get pending chats for moderator |
| GET | `/api/moderation/replied-chats` | Get completed chats by moderator |
| GET | `/api/moderation/moderated-chats` | Get all moderated chats |
| GET | `/api/moderation/stats` | Get moderation stats |
| GET | `/api/moderation/session-earnings` | Get session earnings |
| POST | `/api/moderation/session-earnings/add` | Add to session earnings |
| POST | `/api/moderation/session-earnings/clear` | Reset session earnings |
| GET | `/api/moderation/earnings-history` | Get daily earnings history |
| PUT | `/api/moderation/moderator-profile` | Update own profile |
| GET | `/api/moderation/payment-methods/:moderatorId` | Get payment methods |
| POST | `/api/moderation/payment-methods/:moderatorId` | Add payment method |
| PUT | `/api/moderation/payment-methods/:moderatorId/:methodId` | Update payment method |
| DELETE | `/api/moderation/payment-methods/:moderatorId/:methodId` | Delete payment method |
| PUT | `/api/moderation/payment-methods/:moderatorId/:methodId/set-default` | Set default method |
| GET | `/api/moderation/payment-balance/:moderatorId` | Get payout balance |
| GET | `/api/moderation/payment-history/:moderatorId` | Get payment history |
| POST | `/api/moderation/record-payment/:moderatorId` | Record payment transaction |

### Moderator Analytics (Mod+ Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/moderation/moderator/:userId/chats` | Get chats by moderator |
| GET | `/api/moderation/moderator/:userId/chat-count` | Count of chats by moderator |
| GET | `/api/moderation/moderator/:userId/earnings` | Earnings summary for moderator |
| GET | `/api/moderation/moderator/:userId/earnings/history` | Earnings history with pagination |
| GET | `/api/moderation/onboarded` | Get all onboarded (APP) moderators |
| GET | `/api/moderation/standalone` | Get all standalone external moderators |

### User Moderation (Mod+ Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/moderation/user-action` | Apply moderation action (warn/ban/etc) |
| GET | `/api/moderation/user/:userId/history` | Get user moderation history |
| POST | `/api/moderation/user/:userId/lift-ban` | Remove user ban |
| POST | `/api/moderation/user/:userId/clear-restrictions` | Clear timeouts/mutes |
| POST | `/api/moderation/report-user` | Report user behavior |
| GET | `/api/moderation/flagged-messages` | Get all flagged messages |

### Admin User Management & Config

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/moderation/users/all` | Get all users (search/filter/paginate) |
| PUT | `/api/moderation/users/:userId/suspend` | Suspend/unsuspend user |
| PUT | `/api/moderation/users/:userId/role` | Change user role |
| PUT | `/api/moderation/users/:userId/account-type` | Change account type |
| PUT | `/api/moderation/users/:userId/verify` | Manually set photo verification |
| PUT | `/api/moderation/users/:userId/profile` | Edit user profile |
| POST | `/api/moderation/users/create` | Create new user (manual onboarding) |

### Admin Coin Package Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/moderation/coin-packages` | Get active coin packages |
| GET | `/api/moderation/coin-packages/all` | Get all packages (including inactive) |
| POST | `/api/moderation/coin-packages` | Create new package |
| PUT | `/api/moderation/coin-packages/:id` | Update package |
| DELETE | `/api/moderation/coin-packages/:id` | Delete/deactivate package |
| GET | `/api/moderation/coin-purchases` | Get recent coin purchases |

### Admin Activity Logging

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/moderation/logs/activity` | Get activity logs (filter/paginate) |
| GET | `/api/moderation/activity/logs` | Get activity with advanced filters |
| GET | `/api/moderation/activity/summary` | Get activity statistics |
| GET | `/api/moderation/activity/user/:userId` | Get user-specific activities |
| GET | `/api/moderation/activity/moderator/:moderatorId` | Get moderator actions |
| GET | `/api/moderation/activity/chat/:chatId` | Get chat activity log |

### Earnings (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/moderation/earnings/summary` | Summary of all moderators earnings |
| POST | `/api/moderation/moderator/:userId/mark-paid` | Mark earnings as paid |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/moderation-auth/login` | Login (APP or STANDALONE) |
| POST | `/api/moderation-auth/register` | Register STANDALONE user |
| POST | `/api/moderation-auth/verify-token` | Verify JWT token |

---

## 7. WEBSOCKET EVENTS & REAL-TIME UPDATES

### WebSocket File
- **Location:** `backend/utils/websocket.js`
- **Server:** Uses `ws` library (native WebSocket Server)
- **Connection:** Attached to HTTP server at server startup

### Event Types

#### User Registration & Presence
```javascript
// Client sends
{ type: 'register', userId: String }

// Server responds
{ type: 'registered', success: true }

// Broadcast to all connected users
{ type: 'user_status', userId: String, isOnline: Boolean }
```

#### Keep-Alive Ping
```javascript
// Client sends
{ type: 'ping' }

// Server responds
{ type: 'pong' }
// Also updates User.lastActiveAt in DB
```

#### Typing Status
```javascript
// Client sends
{ type: 'typing_status', chatId: String, isTyping: Boolean }

// Broadcast to other participants
{ 
  type: 'typing_status',
  userId: String,
  chatId: String,
  isTyping: Boolean
}
```

#### Incoming Call
```javascript
// Initiator sends
{
  type: 'call_incoming',
  to: String (recipientId),
  toName: String,
  fromName: String,
  isVideo: Boolean,
  chatId: String
}

// If recipient busy, initiator receives
{
  type: 'call_busy',
  recipientId: String,
  recipientName: String,
  timestamp: String
}

// If recipient available, receives
{
  type: 'call_incoming',
  from: String,
  fromName: String,
  isVideo: Boolean,
  chatId: String,
  callId: String
}
```

### Frontend WebSocket Integration

**File:** `components/ChatModerationView.tsx`

```typescript
import { useWebSocketContext } from '../services/WebSocketProvider';

const { addMessageHandler } = useWebSocketContext();

// Register handler
useEffect(() => {
  const unregister = addMessageHandler((data: any) => {
    if (data.type === 'new_message' && data.chatId === selectedChatId) {
      setMessages(prev => [...prev, data.message]);
    }
  });
  
  return unregister;
}, [selectedChatId]);
```

---

## 8. ACTIVITY LOGGING SYSTEM

### ActivityLog Model

```javascript
{
  id: String (UUID),
  action: String (enum of 50+ action types),
  
  // Actor: who performed action
  actor: {
    userId: String,
    name: String,
    email: String,
    role: String ('admin' | 'moderator' | 'system')
  },
  
  // Target: what was affected
  target: {
    type: String ('user' | 'chat' | 'moderator' | 'report' | 'payment'),
    id: String,
    name?: String
  },
  
  // Content
  description: String,
  details: String,
  reason: String,
  
  // Financial tracking
  financial: {
    amount: Number,
    currency: String ('USD'),
    transactionId?: String,
    previousAmount?: Number,
    newAmount?: Number
  },
  
  // Status
  status: String ('success' | 'failure' | 'pending'),
  category: String ('moderation' | 'moderators' | 'payments' | 'users' | 
                    'reports' | 'admin' | 'system'),
  
  // Metadata
  metadata: Mixed,
  relatedActions: [ObjectId],
  
  // Audit trail
  timestamp: Date,
  ipAddress?: String,
  userAgent?: String
}
```

### Action Types

**Chat Moderation:**
- `chat_flagged`, `chat_unflagged`, `chat_resolved`, `chat_reassigned`, `message_removed`, `user_warned_in_chat`

**Moderator Activity:**
- `moderator_assigned`, `moderator_replied`, `moderator_joined`, `moderator_left`, `moderator_status_changed`

**Payments & Earnings:**
- `earning_recorded`, `earning_approved`, `earning_disputed`, `payment_processed`, `payment_status_changed`

**User Management:**
- `user_suspended`, `user_unsuspended`, `user_verified`, `user_profile_updated`, `user_account_deleted`

**Reports:**
- `report_submitted`, `report_resolved`, `report_dismissed`

**Admin & System:**
- `admin_login`, `admin_logout`, `config_updated`, `coin_package_created/updated/deleted`, `role_change`

### Activity Logger Functions

**File:** `backend/utils/activityLogger.js`

#### Core Function
```javascript
logActivity({
  action: String,
  actor: Object,
  userId?: String,
  moderatorId?: String,
  target: Object,
  description: String,
  details?: String,
  reason?: String,
  metadata?: Object,
  financial?: Object,
  status?: 'success' | 'failure' | 'pending'
})
```

#### Convenience Functions

**Chat:**
- `logChatFlagged(chatId, userId, reason, moderatorId)`
- `logChatUnflagged(chatId, moderatorId, reason)`
- `logChatResolved(chatId, moderatorId)`
- `logChatReassigned(chatId, fromModId, toModId)`
- `logMessageRemoved(chatId, messageId, reason, moderatorId)`
- `logUserWarnedInChat(chatId, userId, reason, moderatorId)`

**Moderator:**
- `logModeratorAssigned(chatId, moderatorId, assignedBy)`
- `logModeratorReplied(chatId, moderatorId, amountEarned)`
- `logModeratorJoined(moderatorId, joinDate)`
- `logModeratorLeft(moderatorId, reason)`
- `logModeratorStatusChanged(moderatorId, oldStatus, newStatus)`

**Payments:**
- `logEarningRecorded(moderatorId, chatId, amount)`
- `logEarningApproved(moderatorId, earningId, amount)`
- `logEarningDisputed(moderatorId, earningId, reason)`
- `logPaymentProcessed(moderatorId, amount, method, txId, earningIds)`
- `logPaymentStatusChanged(moderatorId, oldStatus, newStatus, amount)`

**User:**
- `logUserSuspended(userId, reason, duration, moderatorId)`
- `logUserUnsuspended(userId, moderatorId)`
- `logUserVerified(userId, verificationType)`
- `logUserProfileUpdated(userId, changedFields, moderatorId)`
- `logUserAccountDeleted(userId, reason, moderatorId)`

---

## 9. COMPLETE MODERATION WORKFLOW (Registration → Payment)

### Step 1: Moderator Onboarding

```
USER
  ↓ (POST /api/moderation-auth/register)
  ↓ Validation (email, password, username)
  ↓ Hash password
  ↓ Create User (STANDALONE accountType)
  ↓ Create ModeratorEarnings record
  ↓ Log signup activity
  ↓ Generate JWT token
  ↓ Return token + user data
MODERATOR READY
```

### Step 2: Login & Session

```
MODERATOR
  ↓ (POST /api/moderation-auth/login)
  ↓ Find user (username or email)
  ↓ Check not suspended/banned
  ↓ Verify password
  ↓ Generate JWT (7d expiry)
  ↓ Update lastActiveAt
  ↓ Return token + user data
  ↓ (Setup WebSocket connection)
AUTHENTICATED SESSION
```

### Step 3: View Available Work

```
MODERATOR
  ↓ (GET /api/moderation/unreplied-chats)
  ↓ Fetch chats where replyStatus = 'unreplied'
  ↓ Filter by assignedModerator OR unassigned
  ↓ Sort by lastUpdated
  ↓ Display chat list
SEES PENDING CHATS
```

### Step 4: Read & Respond to Chat

```
MODERATOR
  ↓ Select chat from list
  ↓ Component fetches chat messages
  ↓ (WebSocket receives real-time new messages)
  ↓ (POST /api/moderation/send-response/:chatId)
  ↓ Validate recipient is participant
  ↓ Create message (senderId = recipient ID)
  ↓ Update unread counts
  ↓ Log moderator action
RESPONSE SENT TO CHAT PARTICIPANT
```

### Step 5: Mark as Replied (Trigger Earning)

```
MODERATOR
  ↓ (PUT /api/moderation/mark-replied/:chatId)
  ↓ Set isReplied = true
  ↓ Set replyStatus = 'replied'
  ↓ Set markedAsRepliedAt = now
  ↓ Set assignedModerator = current moderator
  ↓ **CREATE ModeratorEarnings record**
  ↓   - earnedAmount: $0.50
  ↓   - status: 'approved'
  ↓   - repliedAt: now
  ↓ Log moderatorReplied activity
EARNING RECORDED
```

### Step 6: Check Earnings & Statistics

```
MODERATOR
  ↓ (GET /api/moderation/stats)
  ↓ Count chatsModerated (assignedModerator = me)
  ↓ Count chatsReplied (isReplied = true, assigned to me)
  ↓ Sum totalEarned from ModeratorEarnings
  ↓ Fetch activity log stats (warnings, bans, etc.)
  ↓ Calculate replyRate = chatsReplied / chatsModerated
  ↓ (GET /api/moderation/session-earnings)
  ↓ Get sessionEarnings (resets daily at 12:00 UTC)
SEES PERFORMANCE METRICS
```

### Step 7: Add Payment Method

```
MODERATOR
  ↓ (POST /api/moderation/payment-methods/:moderatorId)
  ↓ Provide: type (mpesa, card, etc.), name, encrypted details
  ↓ Create PaymentMethod record
  ↓ First method auto-set as default
PAYMENT METHOD SAVED
```

### Step 8: Request Payout

```
MODERATOR
  ↓ (POST /api/moderation/record-payment/:moderatorId)
  ↓ Provide: amount, paymentMethodId
  ↓ Verify payment method exists & is active
  ↓ Calculate processingFee = amount * 0.025
  ↓ Calculate netAmount = amount - fee
  ↓ Create PaymentTransaction record
  ↓   - status: 'pending'
  ↓   - transactionType: 'payout'
PAYOUT REQUEST SUBMITTED
```

### Step 9: Admin Processes Payout

```
ADMIN
  ↓ (GET /api/moderation/payment-history/:moderatorId)
  ↓ Review pending transactions
  ↓ Process via external payment gateway
  ↓ Update transaction status: 'processing' → 'completed'
  ↓ Set completedAt = now
  ↓ (POST /api/moderation/moderator/:userId/mark-paid)
  ↓ Update ModeratorEarnings status: 'approved' → 'paid'
  ↓ Set paidAt = now
  ↓ Log paymentProcessed activity
PAYMENT COMPLETED
```

### Step 10: Audit Trail

```
ADMIN/MODERATOR
  ↓ (GET /api/moderation/activity/logs)
  ↓ Filter by:
  ↓   - action (e.g., 'moderator_replied')
  ↓   - actor ID (moderator)
  ↓   - target (chat/user)
  ↓   - date range
  ↓   - status (success/failure)
  ↓ View complete audit trail
SEE FULL ACTIVITY HISTORY
```

---

## 10. KEY FEATURES & DESIGN PATTERNS

### 1. **Dual Account Type System**
- **APP:** Users onboarded through main app, existing user base
- **STANDALONE:** External sign-ups, external moderators/operators
- Benefits: Flex workforce + engaged platform users

### 2. **Earnings Auto-Recording**
- Triggered automatically when chat marked as replied
- Fixed rate: $0.50 per chat
- Approved automatically (no admin review required)
- Tracked separately from UI session earnings

### 3. **Daily Session Reset**
- At 12:00 UTC, session earnings rolled to daily history
- Displayable history per day
- Running total maintained

### 4. **Comprehensive Activity Logging**
- Every moderation action logged to ActivityLog
- Financial amounts tracked
- Actor, target, reason all captured
- Searchable by action, actor, date range, status

### 5. **Chat Assignment Flexibility**
- Auto-assign to unassigned chats
- Auto-assign to moderator's existing queues
- Manual reassignment capability
- Tracks both assignedModerator + repliedBy

### 6. **Processing Fee Model**
- 2.5% fee on payouts automatically deducted
- Gross amount charged, net amount credited
- Tracked separately (amount vs netAmount)

### 7. **Payment Method Isolation**
- Moderators can have multiple payment methods
- Default method for easy selection
- Soft deletion (marked inactive)
- Supports 9+ payment types globally

### 8. **WebSocket Real-Time Updates**
- Moderators see typing status
- New messages pushed in real-time
- Call notifications sent via WebSocket
- Keep-alive ping/pong

### 9. **User Moderation Toolkit**
- Warnings (accumulate on user)
- Temporary bans (temporary duration)
- Permanent bans (null duration)
- Timeouts/mutes (duration-based)
- Block (mutual blocking)
- Report (for escalation)

### 10. **Role-Based Access Control**
- `USER`: No moderation access
- `MODERATOR`: Can reply to chats, see own data
- `ADMIN`: Can manage users, coin packages, process payments, view all logs

---

## 11. DATABASE INDEXES FOR PERFORMANCE

```javascript
// User
- email (unique)
- username (unique, sparse)
- isOnline
- coordinates (2dsphere)
- interests

// Chat
- participantsKey (unique)
- messages.isFlagged
- assignedModerator
- repliedBy
- lastUpdated

// ModeratorEarnings
- moderatorId, status
- createdAt desc
- moderatorId, createdAt desc

// PaymentMethod
- moderatorId, isDefault
- moderatorId, isActive

// ActivityLog
- timestamp desc, category
- actor.userId, timestamp desc
- target.id, timestamp desc
- action, timestamp desc
- category, timestamp desc
- status, timestamp desc
```

---

## 12. SUMMARY TABLES

### API Response Status Codes

| Code | Meaning | Common Cause |
|------|---------|------------|
| 200 | Success | Operation completed |
| 201 | Created | New resource created |
| 400 | Bad Request | Missing/invalid fields |
| 401 | Unauthorized | No/invalid JWT token |
| 403 | Forbidden | Insufficient permissions (not mod/admin) |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate email/username |
| 500 | Server Error | Database/processing error |

### Files to Review

| File | Purpose |
|------|---------|
| `backend/routes/moderation.js` | Main moderation API (2468 lines) |
| `backend/routes/moderationAuth.js` | Auth & registration |
| `backend/models/User.js` | User schema (role, accountType, moderation fields) |
| `backend/models/Chat.js` | Chat schema (assignment, reply tracking) |
| `backend/models/ModeratorEarnings.js` | Earnings per-chat tracking |
| `backend/models/ActivityLog.js` | Complete activity audit trail |
| `backend/models/PaymentMethod.js` | Payment methods per moderator |
| `backend/models/PaymentTransaction.js` | Payment transaction log |
| `backend/utils/websocket.js` | Real-time events |
| `backend/utils/activityLogger.js` | Convenience logging functions |
| `components/ChatModerationView.tsx` | Moderator UI component |

---

## 13. CRITICAL FLOWS TO TEST

1. **Moderator Registration & Login** → ModeratorEarnings created
2. **Chat Reply & Mark Replied** → Earning auto-created ($0.50, approved status)
3. **Session Earnings Reset** → Daily at 12:00 UTC
4. **Payment Method Management** → Default assignment, soft delete
5. **Payout Workflow** → Record → Process → Mark Paid → Activity logged
6. **User Warnings & Bans** → Moderation action → History recorded → Activity logged
7. **WebSocket Real-Time** → New messages pushed, typing received, calls notified
8. **Activity Log Search** → Filter by action, actor, date, status
9. **Earnings Summary** → Per moderator, all moderators, daily history
10. **Admin User Management** → Suspend, unsuspend, role change, verify

---

## 14. POTENTIAL ENHANCEMENTS

1. **Payment Gateway Integration**: Real integration with Stripe, M-Pesa, etc.
2. **Earnings Dispute Process**: Allow moderators to dispute declined earnings
3. **Performance Bonuses**: Multipliers for high reply rates
4. **Chat Quality Ratings**: Users rate moderator responses
5. **Moderator Tiers**: Different earning rates based on tenure/performance
6. **Batch Payout Processing**: Scheduled weekly/monthly payouts
7. **Tax Document Management**: Store W9s/1099 equivalent forms
8. **2FA for Moderators**: Additional security for sensitive operations
9. **Email Notifications**: Payout status, new chats, warnings
10. **Moderation Analytics Dashboard**: Charts for the moderation team

