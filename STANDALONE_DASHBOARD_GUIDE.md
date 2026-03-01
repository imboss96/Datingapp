# Standalone Moderator Dashboard Documentation

## Overview

The new Standalone Moderator Dashboard provides a comprehensive platform for standalone moderators to manage their earnings, profiles, payment methods, and moderate chats all in one integrated interface.

## Components

### 1. **StandaloneModeratorDashboard.tsx** (Main Page)
The central hub for all moderator activities with three main tabs:

#### Overview Tab
- **User Profile Card**: Displays moderator information with quick edit button
- **Stats Grid**: Real-time display of:
  - Session Earnings: Daily earnings since 12:00 hrs
  - Total Earnings: Cumulative lifetime earnings
  - Moderated Chats: Total chats worked on
  - Account Type: STANDALONE or APP designation
- **Quick Actions**: Buttons to launch moderation, view chats, or manage payments

#### Profile Tab
- **View Mode**: Shows current profile information
  - Name, Username, Email, Age
  - Location, Bio, Role
- **Edit Mode**: Full profile editing with:
  - Text field updates
  - Real-time validation
  - Backend synchronization via PUT `/users/{userId}`
  - Success/error feedback

#### Moderation Tab
- **Launch Moderation View**: Opens floating ChatModerationView modal
- **View Moderated Chats**: Opens modal showing all chats worked on

---

### 2. **PaymentMethodModal.tsx** (Payment Management)
Complete payment method management interface.

#### Features
- **Add Payment Methods**: Three types supported
  - M-Pesa (Mobile wallet)
  - Credit Card
  - Bank Transfer

#### Type-Specific Details
- **M-Pesa**: Phone number input
- **Card**: Card number, expiry, CVV
- **Bank Transfer**: Account number, bank name

#### List Management
- View all saved payment methods
- See last updated timestamp
- Mark default method
- Remove old methods
- Success/error notifications

---

### 3. **ModeratedChatsModal.tsx** (Chat History)
Displays all chats the moderator has worked on with reply status tracking.

#### Features
- **Real-time Chat Listing**: Fetches from `/moderation/moderated-chats`
- **Reply Status Indicators**:
  - ✅ Green badge: Chat has been replied to
  - ⏱️ Amber badge: Awaiting response (unreplied)
- **Chat Information**:
  - Participant names and avatars
  - Message count
  - Last updated date
  - Chat ID reference

#### Filtering
- **All**: Show all moderated chats
- **Replied**: Show only chats moderator has replied to
- **Unreplied**: Show chats pending moderator response

#### Statistics
- Total chats count
- Replied chats count
- Unreplied chats count
- Refresh button to sync latest data

---

### 4. **Floating ChatModerationView Integration**
When moderator clicks "Launch Moderation View", the full ChatModerationView opens as a floating modal with all existing features:
- Chat message viewing
- Message moderation (flag, delete, edit)
- User action (warn, ban, block)
- Reply functionality
- Profile editing for chat participants
- Replied chats tracking callback

---

## Data Flow

### Profile Editing Flow
```
User clicks "Edit Profile"
    ↓
Edit form opens with current data
    ↓
User makes changes
    ↓
Clicks "Save Changes"
    ↓
PUT /users/{userId} API call
    ↓
Backend validates and updates
    ↓
Response returned with updated user
    ↓
Local state updates
    ↓
Success message displayed
    ↓
Edit mode closes, view mode shows new data
```

### Payment Method Flow
```
User clicks "Payment Methods"
    ↓
Modal opens, fetches existing methods
    ↓
Displays current payment methods
    ↓
User selects type and fills form
    ↓
Clicks "Add Payment Method"
    ↓
Data validated on frontend
    ↓
Saved to local state
    ↓
Success notification
    ↓
Method appears in list
```

### Moderated Chats Flow
```
User clicks "Moderated Chats"
    ↓
Modal opens
    ↓
GET /moderation/moderated-chats called
    ↓
Chats fetched from backend
    ↓
Grouped by reply status
    ↓
User can filter by status
    ↓
Click refresh to sync latest
```

### Session Earnings Flow
```
Moderator replies to chat
    ↓
Backend increments session earnings (+$0.10)
    ↓
POST /moderation/session-earnings/add called
    ↓
Dashboard refreshes stats every 30 seconds
    ↓
SessionEarnings displayed on Overview
    ↓
At 12:00 hrs UTC, automatic reset
    ↓
Amount added to total earnings
    ↓
Session resets to $0.00
```

---

## API Endpoints Used

### Profile Management
- `PUT /users/{userId}` - Update profile information
- `GET /users/{userId}` - Fetch specific user data

### Session Earnings
- `GET /moderation/session-earnings` - Fetch current earnings
- `POST /moderation/session-earnings/add` - Increment earnings
- `POST /moderation/session-earnings/clear` - Clear session (automatic)
- `GET /moderation/earnings-history` - Historical earnings breakdown

### Moderated Chats
- `GET /moderation/moderated-chats` - Fetch all moderated chats with reply status

### Moderation (from ChatModerationView)
- `POST /moderation/send-response/{chatId}` - Send moderator reply
- `PUT /moderation/mark-replied/{chatId}` - Mark chat as replied
- `GET /moderation/unreplied-chats` - Fetch unreplied chats
- `GET /moderation/replied-chats` - Fetch replied chats

---

## State Management

### StandaloneModeratorDashboard State
```typescript
// UI State
activeTab: 'overview' | 'profile' | 'moderation'
showPaymentModal: boolean
showModeratedChatsModal: boolean
showModerationView: boolean
isEditingProfile: boolean

// Profile Editing
profileData: User | null
profileChanges: Partial<User>
uploadingProfile: boolean
profileError: string
profileSuccess: string

// Stats
sessionEarnings: number
totalEarnings: number
moderatedChatsCount: number
```

### PaymentMethodModal State
```typescript
paymentMethods: PaymentMethod[]
loading: boolean
selectedType: 'mpesa' | 'card' | 'bank_transfer'
formData: Record<string, string>
error: string
success: string
```

### ModeratedChatsModal State
```typescript
chats: ModeratedChat[]
loading: boolean
error: string
filter: 'all' | 'replied' | 'unreplied'
```

---

## User Workflows

### Workflow 1: New Moderator Setup
1. Sign up or log in
2. Go to Profile tab
3. Click "Edit Profile"
4. Fill in personal information
5. Save profile
6. Go to Payment Methods
7. Add payment method (M-Pesa/Card/Bank)
8. Verify payment method saved
9. Go to Moderation tab
10. Click "Launch Moderation View"
11. Start moderating chats

### Workflow 2: Monitor Earnings
1. Dashboard Overview shows real-time earnings
2. Session earnings update as you reply to chats
3. Each reply: +$0.10
4. Daily reset at 12:00 hrs (automatic)
5. Total earnings accumulate across all sessions
6. View earnings history in menu

### Workflow 3: Track Work
1. Click "Moderated Chats" button
2. View all chats you've worked on
3. Filter by reply status
4. See participant info and message counts
5. Identify chats awaiting response
6. Manually refresh to sync latest
7. Reply status clearly marked:
    - ✅ Green = replied
    - ⏱️ Amber = pending

---

## Authentication Integration

The dashboard integrates with `ModerationAuthContext` which handles:
- User login/registration
- Token management (httpOnly cookies)
- Role-based access (MODERATOR | ADMIN)
- Account type (APP | STANDALONE)
- Auto-logout on token expiry
- Session persistence

---

## Styling & UI/UX

### Color Scheme
- **Primary**: Blue (#2563eb) for main actions
- **Success**: Green (#16a34a) for confirmations
- **Danger**: Red (#dc2626) for destructive actions
- **Warning**: Amber (#d97706) for pending items
- **Status**: Purple for historical data

### Responsive Design
- Mobile-first approach
- Tablet optimization (grid-cols-2)
- Desktop full layout (grid-cols-3+)
- Touch-friendly buttons (min 44px)
- Scrollable modals on small screens

### Accessibility
- ARIA labels on interactive elements
- Font Awesome icons with semantic meaning
- Color not sole indicator of status
- Keyboard navigation support
- Clear focus states

---

## Error Handling

### Frontend Validation
- Required field checks
- Email format validation
- Payment field format validation
- File size checks (photos)

### Backend Integration Errors
- Failed API calls show user-friendly messages
- Timeout handling
- Network error recovery
- Form submission retry capability

### User Feedback
- Success messages (3-second auto-dismiss)
- Error messages (persistent until dismissed)
- Loading states (spinner + disabled buttons)
- Form validation feedback (red borders)

---

## Future Enhancements

### Planned Features
1. **Payment Processing**: Actual payment gateway integration
2. **Earnings Report**: Export earnings history as PDF/CSV
3. **Performance Analytics**: Charts showing moderation trends
4. **Team Management**: View team members' statistics
5. **Dispute Resolution**: Handle payment disputes
6. **Withdrawal System**: Request payouts
7. **Notifications**: Real-time alerts for new chats
8. **Mobile App**: Native iOS/Android version

### Technical Debt
1. Move payment method state to backend
2. Add WebSocket for real-time earnings updates
3. Implement caching for moderated chats
4. Add offline mode support
5. Optimize image loading for avatars

---

## Testing Checklist

### Profile Management
- [ ] Create new profile with all fields
- [ ] Edit each field individually
- [ ] Save without making changes
- [ ] Verify data persists after refresh
- [ ] Cancel editing without saving

### Payment Methods
- [ ] Add M-Pesa method
- [ ] Add Card method
- [ ] Add Bank Transfer method
- [ ] Remove payment method
- [ ] Mark as default
- [ ] Verify persistence

### Moderated Chats
- [ ] Filter by "All" shows all chats
- [ ] Filter by "Replied" shows only replied chats
- [ ] Filter by "Unreplied" shows pending chats
- [ ] Statistics update correctly
- [ ] Chat details display properly
- [ ] Refresh updates latest data

### Earnings Tracking
- [ ] Session earnings display correctly
- [ ] Total earnings shown accurately
- [ ] Daily reset at 12:00 hrs works
- [ ] Stats refresh every 30 seconds
- [ ] Moderated chats count updates

### Moderation View
- [ ] Launch moderation from Overview
- [ ] Launch moderation from Moderation tab
- [ ] Close moderation returns to dashboard
- [ ] Profile editing works in moderation
- [ ] Replied chats callback triggers
- [ ] Earnings increment on reply

---

## Configuration

### Environment Variables
No specific environment variables needed beyond existing app setup.

### Backend Configuration
Ensure these endpoints exist:
```
POST /moderation/session-earnings/add
GET /moderation/session-earnings
POST /moderation/session-earnings/clear
GET /moderation/earnings-history
GET /moderation/moderated-chats
PUT /users/{userId}
GET /users/{userId}
```

---

## Support & Troubleshooting

### Common Issues

**Issue**: Profile changes not saving
- Check browser console for API errors
- Verify user ID is correct
- Check backend logs

**Issue**: Payment methods not showing
- Reload page to refresh
- Check browser localStorage
- Verify API endpoint accessible

**Issue**: Moderated chats empty
- User may have no moderated chats yet
- Click refresh button to sync
- Check filter settings

**Issue**: Session earnings not updating
- Refresh page to fetch latest
- Verify moderation replies are registering
- Check 12:00 hrs reset time

---

## Version History

### v1.0.0 (Current)
- Initial release
- Profile editing
- Payment method management
- Moderated chats tracking
- Session earnings monitoring
- Floating ChatModerationView integration

