# Backend Payment Endpoints Implementation Guide

## Overview
Add these payment-related endpoints to `backend/routes/moderation.js`

---

## Required Endpoints

### 1. GET - List Payment Methods
```
GET /api/moderation/payment-methods/:moderatorId
```

**Expected Response:**
```json
{
  "success": true,
  "paymentMethods": [
    {
      "id": "method-uuid",
      "type": "mpesa",
      "name": "M-Pesa",
      "details": "masked-or-last-4-digits",
      "isDefault": true,
      "lastUpdated": "2026-03-01"
    }
  ]
}
```

---

### 2. POST - Add Payment Method
```
POST /api/moderation/payment-methods/:moderatorId
Content-Type: application/json

{
  "type": "paypal",
  "name": "PayPal",
  "details": "user@email.com"
}
```

**Expected Response:**
```json
{
  "success": true,
  "paymentMethod": {
    "id": "new-method-uuid",
    "type": "paypal",
    "name": "PayPal",
    "details": "***@email.com",
    "isDefault": false,
    "lastUpdated": "2026-03-01"
  },
  "message": "Payment method added"
}
```

---

### 3. PUT - Update Payment Method
```
PUT /api/moderation/payment-methods/:moderatorId/:methodId
Content-Type: application/json

{
  "type": "card",
  "details": "4111 XXXX XXXX 1111"
}
```

**Expected Response:**
```json
{
  "success": true,
  "paymentMethod": {...},
  "message": "Payment method updated"
}
```

---

### 4. DELETE - Remove Payment Method
```
DELETE /api/moderation/payment-methods/:moderatorId/:methodId
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Payment method removed"
}
```

---

### 5. PUT - Set Default Payment Method
```
PUT /api/moderation/payment-methods/:moderatorId/:methodId/set-default
```

**Expected Response:**
```json
{
  "success": true,
  "paymentMethod": {
    "id": ":methodId",
    "isDefault": true
  },
  "message": "Default payment method updated"
}
```

---

### 6. GET - Get Payment Balance
```
GET /api/moderation/payment-balance/:moderatorId
```

**Expected Response:**
```json
{
  "success": true,
  "balance": 125.50,
  "currency": "USD",
  "lastUpdated": "2026-03-01T10:30:00Z",
  "pending": 25.00,
  "available": 100.50
}
```

---

### 7. GET - Payment History
```
GET /api/moderation/payment-history/:moderatorId?limit=20&skip=0
```

**Expected Response:**
```json
{
  "success": true,
  "payments": [
    {
      "id": "payment-uuid",
      "amount": 50.00,
      "methodId": "method-uuid",
      "methodType": "paypal",
      "description": "Moderation earnings",
      "status": "completed",
      "date": "2026-02-28",
      "createdAt": "2026-02-28T15:30:00Z"
    }
  ],
  "total": 5,
  "limit": 20,
  "skip": 0
}
```

---

### 8. POST - Record Payment
```
POST /api/moderation/record-payment/:moderatorId
Content-Type: application/json

{
  "amount": 50.00,
  "methodId": "method-uuid",
  "description": "Moderation earnings"
}
```

**Expected Response:**
```json
{
  "success": true,
  "payment": {
    "id": "payment-uuid",
    "amount": 50.00,
    "methodId": "method-uuid",
    "status": "pending",
    "createdAt": "2026-03-01T10:30:00Z"
  },
  "message": "Payment recorded successfully"
}
```

---

## Database Models Needed

### PaymentMethod Schema
```javascript
{
  id: String (UUID),
  moderatorId: String (FK to User),
  type: String (enum: mpesa, card, bank_transfer, paypal, zelle, cash, payoneer, chime, cashapp),
  name: String,
  details: String (encrypted for sensitive data),
  isDefault: Boolean,
  lastUpdated: Date,
  createdAt: Date,
  isActive: Boolean
}
```

### PaymentTransaction Schema
```javascript
{
  id: String (UUID),
  moderatorId: String (FK to User),
  methodId: String (FK to PaymentMethod),
  amount: Number,
  description: String,
  status: String (enum: pending, completed, failed, cancelled),
  paymentMethod: {
    type: String,
    name: String
  },
  metadata: Object,
  createdAt: Date,
  completedAt: Date,
  failureReason: String
}
```

---

## Frontend Error Handling

**Add to PaymentMethodModal.tsx:**
```javascript
} catch (err) {
  const errorMessage = (err as any).message || 'Failed to add payment method';
  
  // Handle specific error codes
  if ((err as any).status === 404) {
    setError('Payment endpoint not implemented on server');
  } else if ((err as any).status === 400) {
    setError('Invalid payment details');
  } else if ((err as any).status === 409) {
    setError('Payment method already exists');
  } else {
    setError(errorMessage);
  }
}
```

---

## Testing Endpoints

### Test with cURL

```bash
# Add payment method
curl -X POST http://localhost:5000/api/moderation/payment-methods/user-id \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{
    "type": "paypal",
    "name": "PayPal",
    "details": "user@email.com"
  }'

# Get payment balance
curl http://localhost:5000/api/moderation/payment-balance/user-id \
  -H "Authorization: Bearer token"

# Record payment
curl -X POST http://localhost:5000/api/moderation/record-payment/user-id \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{
    "amount": 50.00,
    "methodId": "method-uuid",
    "description": "Moderation earnings"
  }'
```

---

## Security Considerations

1. **Encrypt Sensitive Data** - Card numbers, bank details
2. **Validate Input** - All payment details must be sanitized
3. **Rate Limiting** - Prevent payment spam
4. **Audit Logging** - Log all payment operations
5. **Access Control** - Only allow users to access their own payment methods
6. **PCI Compliance** - If storing card data, ensure PCI DSS compliance
7. **HTTPS Only** - All payment endpoints must use HTTPS

---

## Implementation Priority

1. ⚠️ GET payment-methods (Needed for UI rendering)
2. ⚠️ POST payment-methods (Needed for saving)
3. ⚠️ GET payment-balance (Needed for payout display)
4. ⚠️ GET payment-history (Needed for recent payments)
5. ⚠️ POST record-payment (Needed for transaction logging)
6. DELETE payment-methods (Delete functionality)
7. PUT payment-methods (Update functionality)
8. PUT set-default (Set default method)

