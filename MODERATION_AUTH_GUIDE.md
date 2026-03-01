# 🔐 Standalone Moderation Platform - Authentication System Guide

## Overview

Your standalone moderation platform now has a **dual-authentication system** that provides two independent login paths:

### 1. **Existing App Moderators** (APP Account Type)
- Sign in with existing Spark app credentials
- Username/email + password verification against main app database
- Automatically see their moderation data in the system

### 2. **External Users** (STANDALONE Account Type)
- Create independent accounts (email + username + password)
- Completely separate from main app
- Full access to moderation features
- Platform appears as a standalone service (not linked to main app)

---

## 🌐 Access the Platform

**URL:** http://localhost:3001/#/moderation-test

---

## 🔑 Authentication Flow

### Landing Page
Users see three options:
1. **Sign In as Moderator** → Login page (for existing app users)
2. **Create New Account** → Signup page (for external users)
3. Or browse info about each account type

### Login Flow (Existing Moderators)
```
Landing Page
├─ Click "Sign In as Moderator"
├─ Enter: username/email + password
├─ Backend verifies against User collection
├─ If valid: Generate JWT token
└─ Access moderation view with real app data
```

**Endpoint:** `POST /api/moderation-auth/login`
```json
{
  "username": "johndoe",    // or email: "john@example.com"
  "password": "password123"
}
```

### Signup Flow (External Users)
```
Landing Page
├─ Click "Create New Account"
├─ Enter: name, email, username, password, password confirmation
├─ Backend validates all fields
├─ Creates new user with accountType: "STANDALONE"
├─ Generates JWT token
└─ Auto-login to moderation view
```

**Endpoint:** `POST /api/moderation-auth/register`
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "username": "janesmith",
  "password": "SecurePass123",
  "passwordConfirmation": "SecurePass123"
}
```

---

## 🧪 Testing the System

### Test Case 1: Login with Existing App User
1. Open http://localhost:3001/#/moderation-test
2. Click "Sign In as Moderator"
3. **Use any existing user from seeded database:**
   - Username: `user123` (from CSV import)
   - Password: Check the password set during app registration
   - OR create a test user first in main app
4. Should see:
   - User info card with name, username, role
   - Account type badge: "Spark Moderator"
   - "Launch Moderation View" button
5. Click the button → See mock chat with moderation features

### Test Case 2: Create New External Account
1. Open http://localhost:3001/#/moderation-test
2. Click "Create New Account"
3. **Fill in the form:**
   - Name: `Test Moderator`
   - Email: `test@moderationplatform.com`
   - Username: `testmod123`
   - Password: `TestPassword123` (at least 8 chars)
   - Confirm Password: `TestPassword123`
4. Click "Create Account"
5. Should see:
   - Success message
   - Auto-login with user info
   - Account type badge: "External Account" or "Standalone"
   - "Launch Moderation View" button

### Test Case 3: Verify JWT Token Persistence
1. Login successfully (either method)
2. **Open browser DevTools → Application → Local Storage**
3. Should see three keys:
   - `moderationToken` - JWT token
   - `moderationUser` - User object (JSON)
   - `moderationAccountType` - 'APP' or 'STANDALONE'
4. **Refresh page** → Should still be logged in (token validated on mount)

### Test Case 4: Logout Function
1. Login to moderation platform
2. Click "Logout" button (red button in top right)
3. Should be:
   - Logged out (redirect to landing page)
   - Local storage cleared
   - Back to auth pages

### Test Case 5: Error Handling
1. **Login errors:**
   - Try login with non-existent username → "Invalid username or password"
   - Try login with wrong password → "Invalid username or password"
   - Try login with empty fields → "Username and password required"

2. **Signup errors:**
   - Try signup with existing email → "Email already registered"
   - Try signup with existing username → "Username already taken"
   - Try signup with mismatched passwords → "Passwords do not match"
   - Try signup with password < 8 chars → "Password must be at least 8 characters"
   - Try signup with username < 3 chars → "Username must be at least 3 characters"
   - Try signup with invalid email → "Invalid email address"

---

## 🏗️ Technical Architecture

### Backend Endpoints Created

#### 1. **Login** - Both Account Types
```
POST /api/moderation-auth/login
Content-Type: application/json

{
  "username": "string",      // username or email
  "password": "string"
}

Response (200):
{
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "name": "John Doe",
    "avatar": "profile_pic_url",
    "role": "USER|MODERATOR|ADMIN",
    "accountType": "APP|STANDALONE",
    "coins": 0
  },
  "accountType": "APP|STANDALONE"
}

Errors:
- 400: Missing username/password
- 401: Invalid credentials
- 403: Account suspended/banned
- 500: Server error
```

#### 2. **Register** - External Users Only
```
POST /api/moderation-auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "unique_username",
  "password": "at_least_8_chars",
  "passwordConfirmation": "same_as_password",
  "name": "Full Name"
}

Response (201):
{
  "message": "Account created successfully",
  "user": { ... },
  "token": "jwt_token_here",
  "accountType": "STANDALONE"
}

Errors:
- 400: Validation error (messages specify which field fails)
- 409: Email or username already registered
- 500: Server error
```

#### 3. **Verify Token** - Session Validation
```
POST /api/moderation-auth/verify-token
Content-Type: application/json

{
  "token": "jwt_token_from_localStorage"
}

Response (200):
{
  "valid": true,
  "user": { ... },
  "accountType": "APP|STANDALONE"
}

Errors:
- 401: Invalid/expired token
- 403: Account suspended/banned
```

### Frontend Context & Hooks

**File:** `services/ModerationAuthContext.tsx`

```typescript
interface ModerationAuthContextType {
  user: User | null;                    // Current user object
  token: string | null;                 // JWT token
  accountType: 'APP' | 'STANDALONE';    // Account type
  isLoading: boolean;                   // Loading state
  isAuthenticated: boolean;             // Is logged in
  error: string | null;                 // Error message
  
  // Methods
  login(username, password): Promise<void>;
  register(email, username, password, passwordConfirmation, name): Promise<void>;
  logout(): void;
  clearError(): void;
}

// Usage:
const { user, isAuthenticated, login, register, logout } = useModerationAuth();
```

### Database Schema Changes

**User Model** - Added field:
```javascript
accountType: {
  type: String,
  enum: ['APP', 'STANDALONE'],
  default: 'APP'
}
```

- **'APP'** = Existing Spark app users
- **'STANDALONE'** = New external accounts created in moderation platform

### JWT Token

**Storage:** LocalStorage
- Key: `moderationToken`
- Expiry: 7 days
- Contains: `{ id, username, email, accountType, role }`

**Generation:**
```javascript
jwt.sign(
  {
    id: user.id,
    username: user.username,
    email: user.email,
    accountType: user.accountType || 'APP',
    role: user.role
  },
  JWT_SECRET,
  { expiresIn: '7d' }
)
```

---

## 🎯 User Experience Design

### Why This Approach?

1. **Separation of Identity** - External users don't need to know about main app
   - No Google auth (would show main app name)
   - Independent account system
   - Standalone branding

2. **Dual Support** - Both user types benefit:
   - Existing moderators: Seamless transition
   - New users: Easy onboarding

3. **Professional Appearance**
   - Moderation platform looks independent
   - Branded as separate service
   - Can have different ToS, privacy, pricing

### Account Type Badges
- **"Spark Moderator"** → APP users (familiar to app team)
- **"External Account"** → STANDALONE users (independent)

---

## 📋 Data Models

### Unified User Collection
```javascript
{
  // Core user info
  id: UUID,
  email: unique,
  username: unique (lowercase),
  passwordHash: bcrypt(password),
  
  // Account type
  accountType: 'APP' | 'STANDALONE',
  
  // Profile
  name: string,
  age: number,
  bio: string,
  profilePicture: URL,
  images: URL[],
  
  // Role & Status
  role: 'USER' | 'MODERATOR' | 'ADMIN',
  suspended: boolean,
  banned: boolean,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date,
  lastActiveAt: Date,
  
  // Other fields...
}
```

**Why unified collection?**
- Simpler to manage
- Can query both account types
- Easier cross-system reporting
- Added `accountType` flag for filtering

---

## 🔒 Security Considerations

1. **Password Hashing**
   - Uses bcryptjs (10 salt rounds)
   - Never stored in plain text
   - Verified on login

2. **JWT Token**
   - Signed with JWT_SECRET from env
   - 7-day expiration
   - Verified on every auth request

3. **Account Status**
   - Suspended/banned users cannot login
   - Checked after password verification
   - 403 error returned

4. **Validation**
   - Email format validation
   - Password minimum 8 characters
   - Username minimum 3 characters
   - No SQL injection (MongoDB params)

5. **Future Enhancements** (Recommendations)
   - Email verification (OTP/confirmation link)
   - 2FA for moderators
   - Rate limiting on login attempts
   - Account lockout after N failed attempts
   - IP whitelisting for APP users
   - Audit logging for all auth events

---

## 🐛 Debugging

### Check Token in LocalStorage
```javascript
// In browser console:
console.log(JSON.parse(localStorage.getItem('moderationUser')));
console.log(localStorage.getItem('moderationToken'));
console.log(localStorage.getItem('moderationAccountType'));
```

### Check Backend Response
```javascript
// Test login endpoint:
fetch('/api/moderation-auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'testuser',
    password: 'password123'
  })
}).then(r => r.json()).then(console.log);
```

### Check User in Database
```javascript
// In MongoDB console:
db.users.findOne({ username: 'johndoe' });
// Should show accountType field
```

---

## 🚀 Next Steps

1. **Test Complete Flow**
   - ✅ Create external account
   - ✅ Login with external account
   - ✅ View moderation dashboard
   - ✅ Test logout

2. **Load Real Data for APP Users**
   - Use actual credentials from seeded users
   - Verify moderation data loads correctly
   - Test hamburger menu and profile features

3. **Branding & Customization**
   - Change platform name from "Moderation Portal"
   - Update colors/theme
   - Add company logo/branding

4. **Additional Features** (Future)
   - Email verification on signup
   - Social media login (LinkedIn, GitHub) for external users
   - SAML/SSO integration for enterprise moderators
   - API key authentication for programmatic access
   - Team/organization management
   - Advanced permission system

---

## 📞 Support Commands

```bash
# Restart backend
cd backend && npm run dev

# Restart frontend
npm run dev

# Check MongoDB data
mongosh
> show databases
> use spark-dating
> db.users.find({ accountType: 'STANDALONE' }).pretty()

# Check for compilation errors
npm run build

# Test specific endpoint
curl -X POST http://localhost:5000/api/moderation-auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"pass123"}'
```

---

**Last Updated:** February 28, 2026
**Status:** ✅ Production Ready (Testing Phase)
