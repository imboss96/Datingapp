# Backend API Audit Report - Missing Endpoints

## Overview
The frontend is calling backend endpoints that don't exist. This is causing payment features and some data loading to fail.

---

## ✅ WORKING ENDPOINTS

### Earnings System (Complete)
- ✅ `GET /api/moderation/session-earnings` - Get current session earnings
- ✅ `POST /api/moderation/session-earnings/add` - Add earnings to session
- ✅ `POST /api/moderation/session-earnings/clear` - Clear session and move to total
- ✅ `GET /api/moderation/earnings-history` - Get daily earnings breakdown

### Chat Moderation (Complete)
- ✅ `GET /api/moderation/unreplied-chats` - Get unreplied chats list
- ✅ `GET /api/moderation/replied-chats` - Get replied chats list
- ✅ `GET /api/moderation/moderated-chats` - Get all moderated chats
- ✅ `PUT /api/moderation/mark-replied/:chatId` - Mark chat as replied
- ✅ `POST /api/moderation/send-response/:chatId` - Send moderator response

### User Actions (Complete)
- ✅ `POST /api/moderation/user-action` - Warn/Ban/Report user
- ✅ `GET /api/moderation/user/:userId/history` - Get moderation history
- ✅ `POST /api/moderation/user/:userId/lift-ban` - Remove ban

---

## ❌ MISSING ENDPOINTS (CRITICAL)

### Payment Methods Management
**Frontend calling:** `apiClient.getPaymentMethods()`, `addPaymentMethod()`, `deletePaymentMethod()`
**Backend status:** ❌ NOT IMPLEMENTED

#### Missing endpoints:
```
GET    /api/moderation/payment-methods/:moderatorId
POST   /api/moderation/payment-methods/:moderatorId
PUT    /api/moderation/payment-methods/:moderatorId/:methodId
DELETE /api/moderation/payment-methods/:moderatorId/:methodId
PUT    /api/moderation/payment-methods/:moderatorId/:methodId/set-default
```

**Impact:** 
- Users cannot save payment methods
- PaymentMethodModal fails silently
- No persistence for payment information

---

### Payment Balance & History
**Frontend calling:** `apiClient.getPaymentBalance()`, `getPaymentHistory()`, `recordPayment()`
**Backend status:** ❌ NOT IMPLEMENTED

#### Missing endpoints:
```
GET  /api/moderation/payment-balance/:moderatorId
GET  /api/moderation/payment-history/:moderatorId?limit=50&skip=0
POST /api/moderation/record-payment/:moderatorId
```

**Impact:**
- Payment balance shows as $0.00 (hardcoded value)
- Payment history is empty
- Cannot record payment transactions
- Dashboard Pending Payout card has no real data

---

## 🔍 DATA LOADING ISSUES

### ModeratedChatsModal
**Status:** Partially working ⚠️
**Issue:** Loads replied chats, but endpoint response format may not match expected structure
**Frontend expects:**
```javascript
{
  success: true,
  moderatedChats: [
    {
      id: string,
      participants: Array<{id, name, username, avatar}>,
      messageCount: number,
      lastUpdated: number,
      isReplied: boolean,
      ...
    }
  ]
}
```

**Current endpoint** (`GET /api/moderation/moderated-chats`):
- ✅ Returns correct format
- ✅ Filters replied chats properly
- ⚠️ May need optimization for large datasets

---

### StandaloneModeratorDashboard
**Status:** Partially working ⚠️

| Feature | Status | Issue |
|---------|--------|-------|
| Session Earnings | ✅ Working | Using real endpoint |
| Total Earnings | ✅ Working | Using real endpoint |
| Moderated Chats Count | ✅ Working | Using real endpoint |
| Pending Payout | ❌ Failed | No backend endpoint |
| Recent Payments | ❌ Failed | No backend endpoint |
| Manage Payment Methods | ❌ Failed | No backend endpoint |

---

## 📝 SUMMARY OF FIXES NEEDED

### Priority 1 (CRITICAL - Blocks Core Features)
1. **Implement Payment Methods CRUD endpoints**
   - Save/update/delete payment methods
   - Set default payment method
   - Store encrypted sensitive data

2. **Implement Payment Balance endpoint**
   - Calculate available balance for moderator
   - Account for pending/completed payouts

3. **Implement Payment History endpoint**
   - Retrieve payment transaction records
   - Support pagination

4. **Implement Record Payment endpoint**
   - Log payment transactions
   - Update balances when payment initiated

### Priority 2 (ENHANCE)
1. Optimize `/moderated-chats` for pagination
2. Add caching for earnings queries
3. Add audit logging for payment operations

---

## 🛠️ Implementation Checklist

- [ ] Create Payment Model/Schema in backend
- [ ] Implement payment methods CRUD endpoints
- [ ] Implement payment balance calculation
- [ ] Implement payment history endpoint
- [ ] Implement record payment endpoint
- [ ] Add error handling in frontend for failed requests
- [ ] Add success/error toast notifications
- [ ] Test all payment flows end-to-end
- [ ] Add audit logging
- [ ] Add encryption for sensitive payment data

---

## 🔧 Temporary Workarounds (Not Recommended)

**For Testing Only:**
- Mock payment data in frontend (currently would fallback to empty state)
- Use fixed payment method from browser localStorage
- Disable payment features in UI until backend is ready

---

## Files That Need Backend Implementation

**New/Modified Backend Files:**
- `backend/models/PaymentMethod.js` - New schema for payment methods
- `backend/models/PaymentTransaction.js` - New schema for payment history
- `backend/routes/moderation.js` - Add payment endpoints
- `backend/utils/encryption.js` - Encrypt sensitive payment data (optional)

**Frontend Files (Already Implemented):**
- ✅ `services/apiClient.ts` - Payment API methods added
- ✅ `components/PaymentMethodModal.tsx` - UI component ready
- ✅ `components/StandaloneModeratorDashboard.tsx` - Dashboard ready

**Browser Console Errors You'll See:**
```
404 GET /api/moderation/payment-methods/[moderatorId]
404 POST /api/moderation/payment-methods/[moderatorId]
404 GET /api/moderation/payment-balance/[moderatorId]
404 GET /api/moderation/payment-history/[moderatorId]
```

---

## Affected User Flows

❌ **Currently Broken:**
1. Save payment method → 404 error
2. View pending payout → Shows $0.00
3. View payment history → Shows empty state
4. Record earnings as payout → 404 error

✅ **Currently Working:**
1. View session earnings ✅
2. View total lifetime earnings ✅
3. View moderated chats list ✅
4. View unreplied chats ✅
5. Send moderation responses ✅
