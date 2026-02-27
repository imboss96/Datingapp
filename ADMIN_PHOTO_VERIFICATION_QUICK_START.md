# Photo Verification Admin Dashboard - Quick Start

## 🚀 30-Second Setup

### 1. Create Test Moderator
```bash
cd backend
node create-test-moderator.js
```

**Output:**
```
✅ Test moderator created successfully!

📧 Email: moderator@test.com
🔑 Password: moderator123
```

### 2. Start Backend & Frontend
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
npm run dev
```

### 3. Login
- Email: `moderator@test.com`
- Password: `moderator123`

### 4. Access Admin Dashboard
1. Click the **Shield Icon** 🛡️ in sidebar → "Moderator Panel"
2. Click **"Verifications"** tab at top
3. See pending photos in the left panel

---

## 📊 Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  Photo Verification Admin                    🔄 Refresh  │
└─────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Pending: 5   │ Approved: 42 │ Rejected: 8  │ Avg: 2.5h    │
└──────────────┴──────────────┴──────────────┴──────────────┘

┌─────────────────────────┐  ┌──────────────────────────────┐
│                         │  │                              │
│ Pending Photos          │  │  Photo Preview               │
│ ─────────────────────   │  │  ┌────────────────────────┐  │
│ ✓ User #123  [72%] 2h  │  │  │                        │  │
│   ago                   │  │  │     [Large Image]      │  │
│                         │  │  │                        │  │
│ ✓ User #456  [88%] 4h ◄┼──┼─ │  ID Photo              │  │
│   ago                   │  │  │                        │  │
│                         │  │  │                        │  │
│ ✓ User #789  [54%] 1h │  │  │                        │  │
│   ago                   │  │  │                        │  │
│                         │  │  └────────────────────────┘  │
│ ⊕ 2 more...             │  │                              │
│                         │  │  Quality: [████████░░] 88%  │
└─────────────────────────┘  │  Face Detection: ✓ 1 face    │
                             │  Suitable: ✓ Yes             │
                             │                              │
                             │  Recommendations:            │
                             │  ✓ Photo looks excellent!    │
                             │                              │
                             │  ┌──────────────────────────┐ │
                             │  │ Admin Notes (optional)   │ │
                             │  │ [─────────────────────] │ │
                             │  │                        │ │
                             │  └──────────────────────────┘ │
                             │                              │
                             │  ┌─────────┐  ┌─────────┐   │
                             │  │ ✓ Approve│  │✗ Reject│   │
                             │  └─────────┘  └─────────┘   │
                             │                              │
                             └──────────────────────────────┘
```

---

## 🎯 Review Workflow

### Step 1: Select a Photo
Click any thumbnail in the left panel. Photo appears on right.

### Step 2: Run AI Analysis
Click "Run AI Analysis" button
- ⏱️ Takes 1-3 seconds
- Shows quality score
- Detects faces
- Provides recommendations

### Step 3: Make Decision
- ✓ **APPROVE**: User gets verified badge
  - Optional: Add admin notes
  - Click "Approve"
  
- ✗ **REJECT**: User notified, can resubmit after 7 days
  - Select rejection reason
  - Optional: Add admin notes
  - Click "Confirm Rejection"

### Step 4: Continue
Next pending photo appears automatically

---

## 📊 Understanding Quality Scores

| Score | Color | Meaning |
|-------|-------|---------|
| 80-100% | 🟢 Green | Excellent - Approve |
| 60-79% | 🟡 Yellow | Good - May need review |
| 0-59% | 🔴 Red | Poor - Usually reject |

---

## 🔍 What the AI Analyzes

✓ **Face Detection**
- 1 face = Ideal
- 0 faces = Likely reject
- 2+ faces = Usually reject

✓ **Image Quality**
- Resolution (minimum 800x600)
- File size (100KB - 5MB)
- Brightness and contrast
- Aspect ratio

✓ **Photo Suitability**
- Clear face
- Good lighting
- No obstructions
- Recent photo

---

## 💭 Rejection Reasons

| Reason | When to Use |
|--------|------------|
| No face detected | Photo has no visible face |
| Multiple faces detected | 2+ people in photo |
| Face not clear | Can't identify person |
| Blurry image | Out of focus |
| Poor lighting | Too dark or harsh shadows |
| Not a selfie/ID photo | Wrong type of photo |
| Inappropriate content | Shows inappropriate material |
| Photo appears outdated | Too old/different person |
| Other | Custom reason |

---

## ⚙️ Settings

### Auto-Refresh
- **Enabled**: Page refreshes every 30 seconds
- **Disabled**: Manual refresh only
- Toggle in top-right corner

### Manual Refresh
Click "🔄 Refresh" button to reload immediately

---

## 📈 Statistics

### Pending Review
Photos waiting approval

### Approved
Successfully verified users (they see ✓ badge)

### Rejected
Photos that didn't meet criteria

### Average Review Time
Mean time from submission to decision (in hours)

---

## 🐛 Troubleshooting

### Photos Won't Load?
```bash
# Check backend running
curl http://localhost:5000/api/health

# Check if using correct role
# Login and verify role is MODERATOR or ADMIN
```

### Analysis Shows Error?
- Restart backend
- Check Cloudinary API key in .env
- Try manual review anyway

### Approve/Reject Button Greyed Out?
- Select a photo first
- Check role in database
- Re-login

### No Pending Photos?
- ✓ Great job! All caught up
- Use refresh button to check again
- Wait for users to submit

---

## 🔐 Security Tips

✅ DO:
- Review each photo carefully
- Add notes to decisions
- Use strong password
- Log out when done
- Report suspicious submissions

❌ DON'T:
- Approve without reviewing
- Share credentials
- Approve photos of famous people
- Make inconsistent decisions

---

## 📱 What Users See

### After Approval
- ✓ Verified badge on profile
- Profile shows in discovery longer
- Can access premium features (if applicable)

### After Rejection
- Email notification with reason
- Can resubmit after 7 days
- Appeals process (if configured)

---

## 📞 Support

If something isn't working:

1. Check browser console (F12 → Console)
2. Check backend logs
3. Verify admin role in database
4. Restart both backend and frontend
5. Try a different browser

---

## ✨ Pro Tips

1. **Batch Review**: Review during specific hours
2. **Consistency**: Keep similar standards for all users
3. **Notes**: Always document unusual cases
4. **Quality**: Use AI analysis before deciding
5. **Speed**: Aim for 5-10 minutes per photo

---

## 📊 Common Stats

- Approval rate: ~70-80% usually good
- Review time: Target 5-15 minutes per photo
- Completion rate: Try to clear pending daily
- False positives: Rare, <2% with AI analysis

