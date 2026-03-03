# Moderation System - Visual Architecture & Flow Diagrams

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MODERATION SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────┐         ┌──────────────────────┐              │
│  │   FRONTEND (React)   │         │   BACKEND (Node.js)  │              │
│  ├──────────────────────┤         ├──────────────────────┤              │
│  │ ChatModeration       │◄──────►│ routes/              │              │
│  │ View.tsx            │ (REST)  │  - moderation.js     │              │
│  │                      │         │  - moderationAuth.js │              │
│  │ WebSocketProvider   │◄──────►│ utils/               │              │
│  │ (Real-time)         │ (WS)    │  - websocket.js      │              │
│  │                      │         │  - activityLogger.js │              │
│  └──────────────────────┘         └──────────────────────┘              │
│                                           │                              │
│                                           ▼                              │
│                                   ┌──────────────────┐                  │
│                                   │  MONGODB         │                  │
│                                   ├──────────────────┤                  │
│                                   │ Collections:     │                  │
│                                   │ - users          │                  │
│                                   │ - chats          │                  │
│                                   │ - activitylogs   │                  │
│                                   │ - moderator      │                  │
│                                   │   earnings       │                  │
│                                   │ - payment        │                  │
│                                   │   methods        │                  │
│                                   │ - payment        │                  │
│                                   │   transactions   │                  │
│                                   └──────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Moderator Onboarding Flow

```
                    MODERATOR SIGNUP
                          │
                          ▼
         ┌─────────────────────────────────┐
         │  POST /moderation-auth/register │
         └─────────────────────────────────┘
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
        Validate Input        Check Duplicates
        - Email              - Email exists?
        - Username           - Username taken?
        - Password (8+ chars)
                │                   │
                └─────────┬─────────┘
                          ▼
                   Hash Password
                   Bcryptjs (10 rounds)
                          │
                          ▼
         ┌───────────────────────────────┐
         │  Create User Document         │
         ├───────────────────────────────┤
         │ id: UUID                      │
         │ accountType: STANDALONE       │
         │ role: MODERATOR               │
         │ emailVerified: true (auto)    │
         │ createdAt: now                │
         └───────────────────────────────┘
                          │
                          ▼
         ┌───────────────────────────────┐
         │ Create ModeratorEarnings      │
         ├───────────────────────────────┤
         │ sessionEarnings: 0            │
         │ totalEarnings: 0              │
         │ lastResetAt: now              │
         └───────────────────────────────┘
                          │
                          ▼
         ┌───────────────────────────────┐
         │  Log signup Activity          │
         └───────────────────────────────┘
                          │
                          ▼
         ┌───────────────────────────────┐
         │  Generate JWT Token (7d)      │
         └───────────────────────────────┘
                          │
                          ▼
         Return token + user data
         (id, username, email, role)
```

---

## 3. Chat Interaction & Earning Flow

```
MODERATOR LOGIN
    │
    ▼
┌──────────────────────────────────┐
│ WebSocket Connection Established │
│ (register event)                 │
└──────────────────────────────────┘
    │
    ▼ (User online, lastActiveAt updated)
┌──────────────────────────────────┐
│ GET /moderation/unreplied-chats  │
├──────────────────────────────────┤
│ Fetch where:                     │
│ - replyStatus = 'unreplied'      │
│ - assignedModerator = me OR null │
│ Sort: lastUpdated (desc)         │
└──────────────────────────────────┘
         │
         ▼
    [CHAT LIST]
    ┌──────────────┐
    │ Chat 1       │
    │ Chat 2       │
    │ Chat 3 ◄─────── MODERATOR SELECTS
    └──────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ View Chat Messages & Participants│
│ (WebSocket listens for updates)  │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ POST /moderation/send-response/:chatId
├──────────────────────────────────────┤
│ {                                    │
│   recipientId: String (participant)  │
│   text: String (moderator message)   │
│ }                                    │
└──────────────────────────────────────┘
         │
         ▼
    ┌─────────────────────────────────┐
    │ Create Message {                │
    │   senderId: recipientId,         │
    │       (sent AS the operator)     │
    │   moderatorId: currentUser,      │
    │   isModerationResponse: true,    │
    │   timestamp: now                 │
    │ }                               │
    └─────────────────────────────────┘
         │
         ▼
    Update unread counts + log action
         │
         ▼
┌──────────────────────────────────────┐
│ PUT /moderation/mark-replied/:chatId │
│ (Moderator marks as "reply sent")    │
└──────────────────────────────────────┘
         │
         ▼
    ┌─────────────────────────────────┐
    │ Update Chat {                   │
    │   isReplied: true,              │
    │   replyStatus: 'replied',       │
    │   markedAsRepliedAt: now,       │
    │   assignedModerator: modId,     │
    │   repliedBy: modId              │
    │ }                               │
    └─────────────────────────────────┘
         │
         ▼
    ┌──── AUTOMATIC ────┐
    │ Create Earning {  │
    │   moderatorId,    │
    │   chatId,         │
    │   earnedAmount:   │
    │     $0.50,        │
    │   status:         │
    │     'approved',   │
    │   repliedAt: now  │
    │ }                 │
    └───────────────────┘
         │
         ▼
    ┌────────────────────────┐
    │ Log Activity           │
    │ action: 'moderator_    │
    │          replied'      │
    │ financial.amount: 0.50 │
    └────────────────────────┘
         │
         ▼
    EARNING RECORDED & APPROVED
    (Available for payout)
```

---

## 4. Payment & Payout Flow

```
MODERATOR WORKFLOW
       │
       ├─ (GET /moderation/stats)
       │  ◄────── Check performance
       │
       ├─ (GET /moderation/session-earnings)
       │  ◄────── View session earnings
       │  └─ Daily reset at 12:00 UTC
       │
       ├─ (GET /moderation/earnings-history)
       │  ◄────── View daily breakdown
       │
       ▼
┌──────────────────────────────────────┐
│ ADD PAYMENT METHOD                    │
│ POST /moderation/payment-methods/     │
├──────────────────────────────────────┤
│ {                                    │
│   type: 'mpesa'|'card'|'bank'...,   │
│   name: "My M-Pesa",                 │
│   details: encrypted_sensitive_data, │
│   lastFourDigits?: "1234",           │
│   bankName?: "Chase"                 │
│ }                                    │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Create PaymentMethod {            │
│   id: unique,                     │
│   moderatorId,                    │
│   type, name, details,            │
│   isDefault: true (if first),     │
│   isActive: true                  │
│ }                                 │
└──────────────────────────────────┘
       │
       ▼ (Moderator reviews earnings)
       │
       ├─ (GET /moderation/payment-balance)
       │  ◄────── View available balance
       │
       ├─ (GET /moderation/payment-history)
       │  ◄────── View past transactions
       │
       ▼
┌──────────────────────────────────────┐
│ REQUEST PAYOUT                        │
│ POST /moderation/record-payment/     │
├──────────────────────────────────────┤
│ {                                    │
│   amount: 50.00,                     │
│   methodId: "pm_xxx",               │
│   description?: "Monthly earnings"    │
│ }                                    │
└──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Calculate Fees                      │
│ - processingFee = amount * 0.025    │
│ - netAmount = amount - fee          │
│ Example:                            │
│ - Gross: $50.00                     │
│ - Fee (2.5%): $1.25                 │
│ - Net: $48.75                       │
└─────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Create PaymentTransaction {           │
│   id: unique,                        │
│   moderatorId,                       │
│   paymentMethodId,                   │
│   amount: 50.00,                     │
│   processingFee: 1.25,               │
│   netAmount: 48.75,                  │
│   status: 'pending',                 │
│   transactionType: 'payout',         │
│   createdAt: now                     │
│ }                                    │
└──────────────────────────────────────┘
       │
       ▼
═══════════════════════════════════════
║   ADMIN SIDE - PAYOUT PROCESSING   ║
═══════════════════════════════════════
       │
       ▼
┌──────────────────────────────────────┐
│ GET /moderation/payment-history/     │
│        :moderatorId                  │
│ (Admin reviews pending payouts)      │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ External Payment Processing          │
│ - Send to Stripe/M-Pesa/etc          │
│ - Get external transaction ID        │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Update PaymentTransaction             │
│ {                                    │
│   status: 'processing',              │
│   externalTransactionId: 'ext_xxx'   │
│ }                                    │
└──────────────────────────────────────┘
       │
       ▼ (Once confirmed by payment gateway)
       │
       ▼
┌──────────────────────────────────────┐
│ POST /moderation/moderator/:userId/  │
│        mark-paid                     │
├──────────────────────────────────────┤
│ {                                    │
│   earningIds: [ObjectId, ...],      │
│   paymentMethod?: 'mpesa',          │
│   transactionId?: 'ext_xxx'         │
│ }                                    │
└──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Update ModeratorEarnings {              │
│   status: 'approved' → 'paid',          │
│   paymentMethod: method,                │
│   transactionId: txnId,                 │
│   paidAt: now                           │
│ }                                       │
└─────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Update PaymentTransaction             │
│ {                                    │
│   status: 'completed',               │
│   completedAt: now,                  │
│   events: [{                         │
│     status: 'completed',             │
│     timestamp: now                   │
│   }]                                 │
│ }                                    │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Log PaymentProcessed Activity         │
│ {                                    │
│   action: 'payment_processed',       │
│   moderatorId,                       │
│   financial: {                       │
│     amount: 50.00,                   │
│     currency: 'USD',                 │
│     transactionId: 'ext_xxx'         │
│   }                                  │
│ }                                    │
└──────────────────────────────────────┘
       │
       ▼
    PAYOUT COMPLETE ✓
```

---

## 5. User Moderation & Enforcement Flow

```
MODERATOR OBSERVES VIOLATION
       │
       ▼
┌──────────────────────────────┐
│ POST /moderation/user-action │
├──────────────────────────────┤
│ {                            │
│   userId: "user_xxx",        │
│   action: String,            │
│   reason: String,            │
│   chatId?: String,           │
│   duration?: Number          │
│ }                            │
└──────────────────────────────┘
       │
       ├─────────────────┬─────────────────┬──────────────┬─────────────┐
       │                 │                 │              │             │
    'warn'          'ban'              'timeout'      'mute'         'report'
       │                 │                 │              │             │
       ▼                 ▼                 ▼              ▼             ▼
  warnings++     banned: true      timeout_until    muted_until    reported_count++
  lastWarning    bannedAt: now     = now + dur      = now + dur    (escalate)
  = now          banReason: r      (default 1h)     (default 1h)
  (log: warn)    (log: ban type)   (log: mod)       (log: mod)    (log: report)

       │                 │                 │              │             │
       └─────────────────┴─────────────────┴──────────────┴─────────────┘
                          │
                          ▼
         Add to User.moderationHistory {
           type: action,
           reason: reason,
           moderatorId: req.userId,
           timestamp: now
         }
                          │
                          ▼
         Log Activity Based on Action
         ┌────────────────────────────┐
         │ logWarn (warnings)          │
         │ logBan (bans)              │
         │ logModeratorAction (other) │
         └────────────────────────────┘
                          │
                          ▼
         ACTION ENFORCED
         User experiences restriction
```

---

## 6. Activity Logging Structure

```
┌────────────────────────────────────────────────────────────────┐
│              ACTIVITY LOG ENTRY                                │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Core Fields:                                                   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ id: UUID                                                 │ │
│  │ action: String (enum: 50+ types)                         │ │
│  │ timestamp: Date (indexed)                               │ │
│  │ status: 'success' | 'failure' | 'pending'                │ │
│  │ category: 'moderation' | 'payments' | 'users' | ...     │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Actor (Who):                                                   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ actor.userId                                             │ │
│  │ actor.name                                               │ │
│  │ actor.email                                              │ │
│  │ actor.role: 'admin' | 'moderator' | 'system'            │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Target (What):                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ target.type: 'user' | 'chat' | 'moderator' | 'payment'  │ │
│  │ target.id: String                                        │ │
│  │ target.name: String (optional)                           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Content:                                                        │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ description: String (human readable)                     │ │
│  │ details: String (technical details)                      │ │
│  │ reason: String (why action taken)                        │ │
│  │ metadata: Object (action-specific data)                  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Financial (if applicable):                                     │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ financial.amount: Number                                 │ │
│  │ financial.currency: 'USD'                                │ │
│  │ financial.transactionId: String                          │ │
│  │ financial.previousAmount: Number                         │ │
│  │ financial.newAmount: Number                              │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Audit Trail:                                                   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ ipAddress: String                                        │ │
│  │ userAgent: String                                        │ │
│  │ relatedActions: [ObjectId] (linked entries)              │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└────────────────────────────────────────────────────────────────┘

Example: Chat Moderation Action
┌────────────────────────────────────────────────────────────────┐
│ {                                                               │
│   id: "12345678-1234-1234-1234-123456789012",                 │
│   action: 'chat_flagged',                                      │
│   category: 'moderation',                                      │
│   timestamp: 2026-03-02T14:30:00Z,                            │
│   status: 'success',                                           │
│                                                                 │
│   actor: {                                                      │
│     userId: "mod_abc123",                                      │
│     name: "Sarah Anderson",                                    │
│     email: "sarah@example.com",                                │
│     role: 'moderator'                                          │
│   },                                                            │
│                                                                 │
│   target: {                                                     │
│     type: 'chat',                                              │
│     id: "chat_xyz789",                                         │
│     name: null                                                 │
│   },                                                            │
│                                                                 │
│   description: 'Chat flagged as inappropriate',                │
│   reason: 'Offensive language in conversation',                │
│   metadata: {                                                   │
│     originalUserId: 'user_123',                                │
│     reason: 'Offensive language in conversation'               │
│   },                                                            │
│                                                                 │
│   ipAddress: '192.168.1.100',                                  │
│   userAgent: 'Mozilla/5.0...'                                  │
│ }                                                               │
└────────────────────────────────────────────────────────────────┘
```

---

## 7. WebSocket Real-Time Event Flow

```
FRONTEND (Moderator UI)        WEBSOCKET SERVER        BACKEND DATABASE
       │                               │                       │
       │──── "register" ──────────────►│                        │
       │    event: { userId, token }   │                        │
       │                               │                        │
       │◄──── "registered" ◄───────────│                        │
       │    { success: true }          │                        │
       │                               │                        │
       │────── "ping" ────────────────►│                        │
       │    (keep-alive every 30s)     │                        │
       │                               │                        │
       │◄──── "pong" ◄─────────────────│                        │
       │                               │─── Update user ───────►│
       │                               │   lastActiveAt         │
       │                               │                        │
       │                               │◄─── Confirm ───────────│
       │                               │                        │
       ├──────────────────────────────────────────────────────┐
       │                    CHAT ACTIVE                        │
       └──────────────────────────────────────────────────────┘
       │
       │──── "typing_status" ───────►│
       │    { chatId, isTyping } to  │
       │    all other participants   │
       │                               │
       │◄─── "typing_status" ◄────────│
       │    from another moderator     │
       │
       │ (New message arrives from chat participant)
       │    
       │◄─── "new_message" ◄──────────│────── websocket.broadcast
       │    { chatId, message }       │     for the chat ID
       │                               │
       │ (Moderator sends response)
       │
       │──── "new_message" ────────►  │      
       │    to chat participants      │
       │                               │─── Save to DB ──────────►│
       │                               │                           │
       │                               │◄─── Confirm ──────────────│
       │                               │
       ├──────────────────────────────────────────────────────┐
       │                  INCOMING CALL                        │
       └──────────────────────────────────────────────────────┘
       │
       │──── "call_incoming" ───────►│
       │    { to, isVideo, etc }     │
       │                               │
       │                          ┌────────────────────┐
       │                          │ Check if recipient │
       │                          │ already in call    │
       │                          └────────────────────┘
       │                               │
       │                   ┌───────────┴───────────┐
       │                   │                       │
       │            BUSY (in call)         AVAILABLE (free)
       │                   │                       │
       │                   ▼                       ▼
       │         "call_busy" event          "call_incoming"
       │         sent to caller             sent to recipient
       │                   │                       │
       │                   │         ┌─────────────┘
       │                   │         │
       │                   │◄─── "call_answer" ──────────────►│
       │                   │         │
       │         "call_rejected"      ▼
       │         "call_accepted"  Update call state
       │                               │
       │────────────────────────────────────────────────────────►│
       │         Establish WebRTC P2P connection
```

---

## 8. Database Collections Relationship Diagram

```
┌─────────────────┐
│     USERS       │
├─────────────────┤
│ id (PK)         │
│ email (UQ)      │
│ username (UQ)   │
│ role: enum      │◄──┐
│ accountType     │   │
│ suspended       │   │
│ banned          │   │
│ ...fields...    │   │
└─────────────────┘   │
       △              │
       │              │
       │ (many-to-one)
       │
┌──────────────────────────────────────────────────────────────┐
│                     CHATS                                    │
├──────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ participants: [userId]                  ◄──── User refs     │
│ assignedModerator: userId ──────┐                           │
│ repliedBy: userId ──────────┐   │                           │
│ isReplied: Boolean          │   │                           │
│ replyStatus: enum           │   │                           │
│ messages: [Message]         │   │                           │
│ ...fields...                │   │                           │
└──────────────────────────────┼───┼──────────────────────────┘
                               │   │
                     (one-to-many)
                               │   │
      ┌────────────────────────┘   └─────────────────┐
      │                                               │
      ▼                                               ▼
┌───────────────────────┐              ┌──────────────────────────────┐
│ MODERATOR_EARNINGS    │              │ PAYMENT_TRANSACTION          │
├───────────────────────┤              ├──────────────────────────────┤
│ moderatorId (FK)      │──────┐       │ moderatorId (FK)             │
│ chatId (FK)           │      │       │ paymentMethodId (FK)         │
│ earnedAmount: 0.50    │      │       │ amount                       │
│ status: 'approved'    │      │       │ netAmount                    │
│ repliedAt             │      │       │ processingFee                │
│ paidAt                │      │       │ status: 'pending|processing' │
│ ...fields...          │      │       │ completedAt                  │
└───────────────────────┘      │       │ events: [EventLog]           │
                               │       └──────────────────────────────┘
                               │
                               └─────────────►MODERATOR_ID◄─┐
                                                            │
                                                   (one-to-many)
                                                            │
                                    ┌───────────────────────┘
                                    │
                                    ▼
                      ┌──────────────────────────┐
                      │  PAYMENT_METHODS         │
                      ├──────────────────────────┤
                      │ moderatorId (FK)         │
                      │ type: enum               │
                      │ isDefault                │
                      │ isActive                 │
                      │ ...encrypted details...  │
                      └──────────────────────────┘

                      ┌──────────────────────────┐
                      │  ACTIVITY_LOG            │
                      ├──────────────────────────┤
                      │ id (PK)                  │
                      │ action: enum             │
                      │ actor.userId (idx)       │◄──── Anyone (User/Mod/Admin)
                      │ target.type, .id (idx)   │◄──── User/Chat/Moderator/etc
                      │ timestamp (idx)          │
                      │ financial.amount         │
                      │ ...auditFields...        │
                      └──────────────────────────┘

KEY INDICES:
- chats: participantsKey (unique), assignedModerator
- users: email (unique), username (unique)
- earnings: (moderatorId, status), createdAt
- payments: (moderatorId, isActive), (moderatorId, isDefault)
- activity: timestamp, action, category, actor.userId
```

---

## 9. Role-Based Access Control Matrix

```
┌────────────────────────────────────────────────────────────────────────┐
│                              RBAC MATRIX                               │
├──────────────────────┬──────────┬─────────────┬──────────────────────────┤
│ RESOURCE / ENDPOINT  │   USER   │  MODERATOR  │   ADMIN                  │
├──────────────────────┼──────────┼─────────────┼──────────────────────────┤
│ View own profile     │   YES    │    YES      │   YES                    │
│ Edit own profile     │   YES    │    YES      │   YES                    │
│                      │          │             │                          │
│ View chats           │   YES*   │    YES**    │   YES (ALL)              │
│ Send response        │    NO    │    YES      │   YES                    │
│ Mark as replied      │    NO    │    YES      │   YES                    │
│                      │          │             │                          │
│ Apply moderation     │    NO    │    YES      │   YES                    │
│ (warn/ban/etc)       │          │             │                          │
│ View mod history     │    NO    │    YES***   │   YES                    │
│                      │          │             │                          │
│ View own earnings    │    NO    │    YES      │   YES (others)           │
│ View all earnings    │    NO    │    NO       │   YES                    │
│                      │          │             │                          │
│ Manage payment meth  │    NO    │    YES****  │   YES (any moderator)    │
│ Record payment       │    NO    │    YES      │   YES                    │
│ Mark as paid         │    NO    │    NO       │   YES                    │
│                      │          │             │                          │
│ Manage users         │    NO    │    NO       │   YES                    │
│ Suspend/ban users    │    NO    │    NO       │   YES                    │
│ Change user role     │    NO    │    NO       │   YES                    │
│                      │          │             │                          │
│ Manage coin packages │    NO    │    NO       │   YES                    │
│ View activity logs   │    NO    │    NO       │   YES                    │
│ View admin stats     │    NO    │    NO       │   YES                    │
└──────────────────────┴──────────┴─────────────┴──────────────────────────┘

LEGEND:
* = Own chats only (participants)
** = Assigned unreplied chats + own replied chats
*** = Own history only (can view others' if logged action mentions them)
**** = Own methods only (must match URL moderatorId)

MIDDLEWARE:
- modOnlyMiddleware: Allows USER ROLE = 'MODERATOR' or 'ADMIN'
- adminOnlyMiddleware: Allows only USER ROLE = 'ADMIN'
- Auth applied at app.js level for all /api/moderation/* routes
```

---

## 10. Data Flow for Complete Chat Moderation Scenario

```
┌─────────────────────────────────────────────────────────────────────────┐
│             COMPLETE SCENARIO: Chat Moderation to Payout                │
└─────────────────────────────────────────────────────────────────────────┘

TIMELINE:
─────────────────────────────────────────────────────────────────────────

[2:00 PM] User A & User B start chatting
           ↓
         CHAT created {
           id: 'chat_001',
           participants: ['user_a', 'user_b'],
           isReplied: false,
           replyStatus: 'unreplied'
         }
         ↓
         ActivityLog: 'chat_created'

[3:00 PM] Messages exchanged, no response to User B's last message
           ↓
         24h deadline = 2:00 PM tomorrow

[3:30 PM] Moderator Sarah logs in
           ↓
         POST /moderation-auth/login
         ↓
         JWT token generated, WebSocket connects
         ↓
         ActivityLog: 'admin_login'

[3:35 PM] Sarah fetches unreplied chats
           ↓
         GET /moderation/unreplied-chats
         ↓
         Returns [chat_001, ...]
         ↓
         Sarah selects chat_001

[3:40 PM] Sarah responds to User B
           ↓
         POST /moderation/send-response/chat_001
         {
           recipientId: 'user_b',
           text: 'Thank you for your patience...'
         }
         ↓
         MESSAGE created {
           senderId: 'user_b',
           moderatorId: 'sarah_id',
           isModerationResponse: true,
           timestamp: now
         }
         ↓
         ActivityLog: 'moderator_response'

[3:41 PM] Sarah marks chat as replied
           ↓
         PUT /moderation/mark-replied/chat_001
         ↓
         CHAT updated {
           isReplied: true,
           replyStatus: 'replied',
           markedAsRepliedAt: 3:41 PM,
           assignedModerator: 'sarah_id',
           repliedBy: 'sarah_id'
         }
         ↓
         MODERATOR_EARNINGS created {
           moderatorId: 'sarah_id',
           chatId: 'chat_001',
           earnedAmount: $0.50,
           status: 'approved',
           repliedAt: 3:41 PM
         }
         ↓
         ActivityLog: 'moderator_replied'
                      financial.amount: $0.50

[4:00 PM] Sarah handles 19 more chats throughout session
           ↓
         Each creates new earning ($0.50 each)
         ↓
         sessionEarnings += $10.00 (20 chats total)

[5:00 PM] Sarah checks stats
           ↓
         GET /moderation/stats
         ↓
         Returns {
           chatsModerated: 20,
           chatsReplied: 20,
           totalEarned: '10.00',
           replyRate: 100%
         }

[5:15 PM] Sarah logs out (next day, 8:00 AM)
           ↓
         ActivityLog: 'admin_logout'

[12:00 UTC NEXT DAY] Daily reset occurs (AUTOMATIC)
           ↓
         MODERATOR_EARNINGS (earnings record) updated:
           lastResetAt: 12:00 UTC
         ↓
         dailyEarnings: [{
           date: yesterday,
           amount: $10.00
         }]
         ↓
         sessionEarnings: 0
         totalEarnings: $10.00

[NEXT WEEK] Sarah accumulates $50 total across 5 days
            ($10, $8, $12, $15, $5)
           ↓
         totalEarnings: $50.00
         ↓
         sessionEarnings: $0 (cleared daily)

[FRIDAY] Sarah wants to cash out
         ↓
         GET /moderation/payment-methods
         ↓
         Sarah has 1 default M-Pesa method

         POST /moderation/record-payment
         {
           amount: 50.00,
           methodId: 'pm_sarah_001',
           description: 'Weekly earnings'
         }
         ↓
         PAYMENT_TRANSACTION created {
           moderatorId: 'sarah_id',
           paymentMethodId: 'pm_sarah_001',
           amount: $50.00,
           processingFee: $1.25,
           netAmount: $48.75,
           status: 'pending'
         }
         ↓
         ActivityLog: 'payment_requested'

[FRIDAY EVE] Admin (Bob) reviews pending payouts
            ↓
            GET /moderation/payment-history/sarah_id
            ↓
            Bob sees: $50.00 pending to M-Pesa account

            [Sends to Stripe/M-Pesa API]
            ↓
            External API returns: txnId 'ext_mpe_12345'
            ↓
            PAYMENT_TRANSACTION updated {
              status: 'processing',
              externalTransactionId: 'ext_mpe_12345'
            }

[SATURDAY MORNING] M-Pesa confirms successful delivery
                  ↓
                  POST /moderation/moderator/sarah_id/mark-paid
                  {
                    earningIds: [ObjectId of $50 earning],
                    paymentMethod: 'mpesa',
                    transactionId: 'ext_mpe_12345'
                  }
                  ↓
                  MODERATOR_EARNINGS updated {
                    status: 'approved' → 'paid',
                    paymentMethod: 'mpesa',
                    transactionId: 'ext_mpe_12345',
                    paidAt: Saturday 9:00 AM
                  }
                  ↓
                  PAYMENT_TRANSACTION updated {
                    status: 'completed',
                    completedAt: Saturday 9:00 AM
                  }
                  ↓
                  ActivityLog: 'payment_processed'
                  financial {
                    amount: $50.00,
                    transactionId: 'ext_mpe_12345'
                  }

[ANYTIME] Admin audits entire flow
          ↓
          GET /moderation/activity/logs
          {
            filter: {
              action: ['moderator_replied', 'payment_processed'],
              actor.userId: 'sarah_id',
              startDate: 'last week',
              endDate: 'today'
            }
          }
          ↓
          Returns ordered activity timeline:
          1. 20 × 'moderator_replied' events ($0.50 each)
          2. 'payment_requested' event
          3. 'payment_processed' event ($50.00)

END OF SCENARIO
───────────────

COLLECTIONS IMPACTED:
✓ users (lastActiveAt updated on login/logout)
✓ chats (isReplied, replyStatus, markedAsRepliedAt updated)
✓ messages (new response message added)
✓ moderator_earnings (new earning created, updated on daily reset & payout)
✓ payment_transactions (created, updated to 'processing', updated to 'completed')
✓ activitylog (10+ entries logged across workflow)
```

This comprehensive analysis gives you a complete view of:
- **How moderators register** (STANDALONE or APP)
- **How chats are assigned** (auto, unassigned pool)
- **What actions they can take** (respond, mark replied, moderation actions)
- **How earnings are tracked** (auto-recorded, daily reset, per-chat)
- **Payment flow** (methods, transactions, fee calculation, payout)
- **Real-time updates** (WebSocket events)
- **Complete audit trail** (ActivityLog with 50+ action types)

---

Generated: March 2, 2026
