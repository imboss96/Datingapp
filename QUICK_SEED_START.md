# ⚡ Data Seeding Quick Start Guide

## 🎯 What This Does

Creates **5000 realistic test users** with:
- ✓ Profile photos (random avatars)
- ✓ Interests (3-7 per user)
- ✓ Ages (18-50)
- ✓ Locations (25 US cities)
- ✓ Bios and much more
- ✓ Ready for matching and scrolling tests

---

## 🚀 Quick Start (3 Steps)

### Step 1: Generate CSV (30 seconds)

```bash
cd backend
node seed-data.js csv
```

✅ Creates `lunesa-test-users.csv` (5000 users)

### Step 2: Import to MongoDB (20 seconds)

```bash
node import-csv.js ./lunesa-test-users.csv
```

When prompted: Press `y` to clear old data

✅ 5000 users in database

### Step 3: Test It!

```bash
npm start                    # Terminal 1 (Backend)
npm run dev                  # Terminal 2 (Frontend)
```

Open [http://localhost:5173](http://localhost:5173) and:
- ✓ Login
- ✓ Go to "Discover"
- ✓ Swipe through 5000 users
- ✓ Check matches

---

## 📊 Alternative: Direct Database Seeding

If you want to skip CSV:

```bash
node seed-data.js          # Seed straight to MongoDB
```

That's it! No CSV needed.

---

## 📱 Alternative: Google Sheets

If you want to review/edit in Google Sheets first:

**Step 1:** Generate CSV
```bash
node seed-data.js csv
```

**Step 2:** Import to Google Sheets
- Go to [sheets.google.com](https://sheets.google.com)
- Click "New" → "Spreadsheet"
- File → Import → Upload `lunesa-test-users.csv`
- Separator: Comma

**Step 3:** (Optional) Edit users, then download

**Step 4:** Import to MongoDB
```bash
node import-csv.js ./lunesa-test-users-modified.csv
```

---

## 🎮 Testing Checklist

After seeding:

- [ ] Load /discover page - fast?
- [ ] Scroll through users - smooth?
- [ ] See all images - loading?
- [ ] Read bios and interests - displaying?
- [ ] Swipe right on users - working?
- [ ] View matches - showing correctly?
- [ ] Confetti animation - playing on match?

---

## 🔧 Customize It

```bash
# Generate 1000 users instead of 5000
node seed-data.js 1000

# Generate 1000 and export to CSV
node seed-data.js 1000 csv

# Export 5000 as CSV (without seeding DB)
node seed-data.js csv

# Show one sample user
node seed-data.js test

# Show data format
node seed-data.js format
```

---

## 📋 CSV Columns

The generated CSV has these columns:

| Column | Example |
|--------|---------|
| ID | 550e8400-e29b-41d4-a716-446655440000 |
| Email | john123@test-dating.com |
| Name | John Smith |
| Username | johnsmith123 |
| Age | 28 |
| Location | New York, NY |
| Bio | Love hiking and coffee ☕ |
| Interests | Photography,Hiking,Cooking |
| Profile Picture | https://i.pravatar.cc/150?img=... |
| Images | image1,image2,image3 |
| Is Premium | TRUE/FALSE |
| Coins | 50 |
| Latitude | 40.7128 |
| Longitude | -74.0060 |
| Verification Status | VERIFIED |
| Phone Verified | TRUE/FALSE |

---

## 🔍 Verify It Worked

```bash
# In MongoDB (mongosh)
> use lunesa
> db.users.countDocuments()
5000

> db.users.countDocuments({ isPremium: true })
500

> db.users.findOne()
{ name: "John Smith", age: 28, interests: [...], ... }
```

---

## ⚠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| "File not found" | Use full path or cd to backend/ first |
| "MongoDB connection failed" | Start MongoDB: `mongod --dbpath "C:\Data\db"` |
| "npm: command not found" | Install Node.js from nodejs.org |
| "CSV parse error" | Regenerate with `node seed-data.js csv` |
| "Slow performance" | Seeding is normal, testing scrolling checks performance |

---

## 💡 Pro Tips

1. **First time?** Just run: `node seed-data.js` (20 seconds)
2. **Want to review first?** Use `node seed-data.js csv` + Google Sheets
3. **Testing performance?** Start with 1000 users: `node seed-data.js 1000`
4. **Clear old data?** Answer `y` when import script asks
5. **Generate new images?** Each seed run gets fresh random avatars

---

## 📝 Complete Command Cheat Sheet

```bash
# ========== BASIC USAGE ==========
cd backend

# Seed 5000 to database directly
node seed-data.js

# Export 5000 to CSV
node seed-data.js csv

# Import CSV to database
node import-csv.js ./lunesa-test-users.csv

# ========== CUSTOM COUNTS ==========

# Seed 1000 users
node seed-data.js 1000

# Seed 10000 users
node seed-data.js 10000

# Export 1000 as CSV
node seed-data.js 1000 csv

# ========== TESTING ==========

# Show data format
node seed-data.js format

# Generate one sample user
node seed-data.js test

# ========== APPLICATION STARTUP ==========

# Start backend
npm start

# Start frontend (in another terminal)
npm run dev

# ========== DATABASE INSPECTION ==========

# MongoDB shell
mongosh lunesa

# Count all users
db.users.countDocuments()

# Count premium users
db.users.countDocuments({ isPremium: true })

# See one user
db.users.findOne()

# Clear all users
db.users.deleteMany({})
```

---

## 🎯 Expected Results

After running these commands:

✅ **Database:**
- 5000 users in MongoDB
- 500 premium users (10%)
- 3500 phone-verified (70%)
- All interests populated
- All images from pravatar.cc
- Distributed across 25 US cities

✅ **Frontend:**
- /discover page loads quickly
- Users display with photos
- Bios, interests, ages show correctly
- Swiping is smooth
- Matches display correctly
- Confetti animation works
- No lag or errors

✅ **Testing:**
- Can swipe through entire dataset
- Performance is acceptable
- Matching algorithm works
- Grid layout responsive

---

## ⏱️ Timing

```
Generate CSV     → 2-5 seconds
Import to DB     → 10-15 seconds
Test in app      → ~1 minute
Swipe 100 users  → 30-60 seconds
```

---

## 📞 Need Help?

See these files for more details:
- [DATA_SEEDING_COMPLETE_GUIDE.md](DATA_SEEDING_COMPLETE_GUIDE.md) - Full documentation
- [DATA_SEEDING_WORKFLOW.md](DATA_SEEDING_WORKFLOW.md) - Detailed diagrams

---

## ✨ What's Included

### Files Created:
1. ✅ `backend/seed-data.js` - Main generator (400+ lines)
2. ✅ `backend/import-csv.js` - CSV importer (200+ lines)
3. ✅ `lunesa-test-users.csv` - Generated file (5000 rows)

### Data Generated:
- 5000 complete user profiles
- Realistic names and emails
- Ages 18-50
- 25 different locations
- 3-7 interests per user
- Random profile photos (pravatar.cc)
- Premium status (10%)
- Verification status (70% phone verified)

### Ready For:
- ✅ Scrolling performance tests
- ✅ Match algorithm testing
- ✅ Load testing
- ✅ UI/UX verification
- ✅ Mobile responsive testing

---

**Start seeding in 30 seconds!** 🚀

```bash
cd backend && node seed-data.js csv
```

