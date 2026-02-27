# Photo Verification Admin - Deployment Checklist

## Before Going Live

### ✅ Backend Setup
- [ ] MongoDB is installed and running
- [ ] `.env` file has all required variables:
  - `MONGODB_URI` - Database connection
  - `JWT_SECRET` - Strong secret key
  - `CLOUDINARY_CLOUD_NAME` - Cloudinary account
  - `CLOUDINARY_API_KEY` - Cloudinary API key
  - `CLOUDINARY_API_SECRET` - Cloudinary secret
  - `PORT` - Server port (5000)
  - `CORS_ORIGIN` - Frontend URL
- [ ] Backend dependencies installed: `npm install`
- [ ] Backend can start: `npm run dev`
- [ ] Health check works: `curl http://localhost:5000/api/health`

### ✅ Frontend Setup
- [ ] React and dependencies installed: `npm install`
- [ ] Frontend can start: `npm run dev`
- [ ] Can access http://localhost:3001
- [ ] `.env.local` configured if needed

### ✅ Admin Account Setup
One of these three options:

**Option 1: Create Test Moderator (Recommended for testing)**
```bash
cd backend
node create-test-moderator.js
# Credentials: moderator@test.com / moderator123
```

**Option 2: Promote Existing User**
```bash
cd backend
node setup-admin.js your.email@example.com ADMIN
# Restart backend & frontend after
```

**Option 3: Direct Database Update**
```javascript
// MongoDB shell
use spark-dating
db.users.updateOne(
  { email: "your.email@example.com" },
  { $set: { role: "ADMIN" } }
)
```

### ✅ Feature Testing

**Photo Upload Test**
- [ ] Regular user can submit photo for verification
- [ ] Photo appears in Cloudinary
- [ ] Status shows as "pending" in database

**Admin Access Test**
- [ ] Login as admin/moderator
- [ ] Can access Moderator Panel (Shield icon)
- [ ] Can see "Verifications" tab
- [ ] Dashboard loads without errors

**Photo Review Test**
- [ ] Can see pending photos in gallery
- [ ] Can click to view large preview
- [ ] Can run AI analysis (takes 1-3s)
- [ ] Analysis shows quality score
- [ ] Can approve photo
- [ ] Approval updates user's verification status
- [ ] User sees ✓ verified badge

**Photo Rejection Test**
- [ ] Can select rejection reason
- [ ] Can add admin notes
- [ ] Can click "Reject"
- [ ] Photo disappears from pending list
- [ ] User is notified
- [ ] Can resubmit after 7 days

**Statistics Test**
- [ ] Pending count decreases after decision
- [ ] Approved count increases on approval
- [ ] Rejected count increases on rejection
- [ ] Average time calculates correctly

### ✅ API Endpoints Test

Test using curl or Postman:

**Get Pending Reviews**
```bash
curl -H "Cookie: authToken=YOUR_TOKEN" \
  http://localhost:5000/api/verification/pending-reviews
```
Expected: `{ stats: {...}, verifications: [...] }`

**Analyze Photo**
```bash
curl -X POST \
  -H "Cookie: authToken=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  "http://localhost:5000/api/verification/analyze-photo/VERIFICATION_ID"
```
Expected: `{ qualityScore, faceDetected, faceCount, ... }`

**Review Photo**
```bash
curl -X PUT \
  -H "Cookie: authToken=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"decision":"approve","notes":"Looks good"}' \
  "http://localhost:5000/api/verification/review/VERIFICATION_ID"
```
Expected: `{ success: true, message: "Photo approved successfully" }`

### ✅ Email Notifications

- [ ] Email service configured in `.env` (optional)
- [ ] Admin can review photos without emails
- [ ] Users notified of approval/rejection (if email enabled)

### ✅ Security Checks

- [ ] All endpoints require JWT authentication
- [ ] ADMIN/MODERATOR role is checked
- [ ] Photos are on Cloudinary (not your server)
- [ ] Admin actions are logged
- [ ] JWT secret is strong (min 32 chars)
- [ ] HTTPS will be used in production
- [ ] CORS configured properly

### ✅ Performance Checks

- [ ] Dashboard loads in <1 second
- [ ] AI analysis completes in <5 seconds
- [ ] Approve/reject responds in <500ms
- [ ] Can handle 100+ pending photos
- [ ] Auto-refresh doesn't consume resources

### ✅ Database Checks

**PhotoVerification Collection**
```javascript
db.photoVerifications.findOne()
// Should have fields:
// - userId, photoUrl, publicId, status
// - submittedAt, reviewedAt, reviewedBy
// - reason, notes, antiSpoofScore
```

**User Collection**
```javascript
db.users.findOne({ role: "ADMIN" })
// Should have:
// - role: "ADMIN" or "MODERATOR"
// - isPhotoVerified, photoVerifiedAt (after approval)
```

### ✅ UI/UX Checks

- [ ] Dashboard theme matches app
- [ ] Icons render correctly
- [ ] Buttons are clickable
- [ ] Status indicators show correct colors
- [ ] No broken images
- [ ] No console errors (F12 check)
- [ ] Mobile-responsive (if needed)
- [ ] Loading states work
- [ ] Error messages clear

### ✅ Moderation Guidelines

- [ ] Team trained on quality standards
- [ ] Rejection reasons documented
- [ ] Appeal process documented (if applicable)
- [ ] Typical review time is 5-15 minutes
- [ ] Consistency targets set (70-80% approval)
- [ ] Escalation process defined
- [ ] Support email for users provided

### ✅ Documentation

- [ ] Setup guide reviewed
- [ ] Quick start tested
- [ ] Admin guide bookmarked
- [ ] Team trained
- [ ] Support contacts listed
- [ ] Troubleshooting guide available

### ✅ Deployment Configuration

**For Development**
- [ ] `NODE_ENV=development`
- [ ] `MONGODB_URI=mongodb://localhost:27017/spark-dating`
- [ ] Test accounts created and working

**For Production**
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI` points to production DB
- [ ] JWT_SECRET changed to strong value
- [ ] HTTPS enabled
- [ ] CORS_ORIGIN updated
- [ ] Cloudinary production account configured
- [ ] Admin accounts created
- [ ] Backup system configured
- [ ] Monitoring enabled
- [ ] Logs configured

### ✅ Launch Readiness

- [ ] All tests pass
- [ ] No critical issues
- [ ] Performance acceptable
- [ ] Team trained
- [ ] Support ready
- [ ] Monitoring configured
- [ ] Rollback plan documented
- [ ] Launch date set

---

## Quick Verification

Run this to verify everything is set up:

```bash
# Check backend
curl http://localhost:5000/api/health

# Check frontend loads
curl http://localhost:3001 | grep -o "React"

# Check MongoDB
mongosh --eval "db.version()"

# Check admin exists
mongosh --eval "db.spark-dating.users.find({role:'ADMIN'}).count()"
```

All should return success responses.

---

## Rollback Procedure

If issues occur:

1. **Stop Backend**: `Ctrl+C` in terminal
2. **Stop Frontend**: `Ctrl+C` in terminal
3. **Reset Database** (if needed):
   ```bash
   mongosh
   use spark-dating
   db.photoVerifications.deleteMany({})
   ```
4. **Restart**:
   ```bash
   npm run dev  # Both backend and frontend
   ```

---

## Post-Launch Monitoring

After launch, monitor:

- [ ] Error logs for API issues
- [ ] Performance metrics
- [ ] User feedback on verification process
- [ ] Admin workload and review times
- [ ] Appeal/support requests
- [ ] Database growth
- [ ] Cloudinary usage

---

## Success Indicators

You know it's working if:

✅ Photos appear in pending gallery within seconds
✅ AI analysis completes without errors
✅ Approve/reject responses instant
✅ User badges update immediately
✅ No database errors in logs
✅ Load times under 1 second
✅ Team can review 5-10 photos per hour
✅ Approval rate is 70-80%
✅ User feedback is positive

---

## Support Contact

For issues, check:

1. Backend logs (Terminal)
2. Browser console (F12)
3. MongoDB logs
4. Cloudinary dashboard
5. This checklist

If stuck:
- Review error message carefully
- Check .env file variables
- Restart backend and frontend
- Clear browser cache
- Try different browser
- Check documentation files

---

## Sign-Off

- [ ] Checked: All systems operational
- [ ] Tested: All features working
- [ ] Verified: Security in place
- [ ] Ready: Team trained and ready
- [ ] Launch: Approval given

**Admin System is LIVE! 🚀**

