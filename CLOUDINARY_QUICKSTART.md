# Cloudinary Photo Upload - Quick Start Guide

## ✅ What's Been Set Up

Your Tinder2 app now supports cloud-based photo uploads via **Cloudinary**! 

### Backend
- ✅ `/api/upload/upload-image` - Upload single photo
- ✅ `/api/upload/upload-images` - Upload up to 5 photos at once
- ✅ Automatic image optimization
- ✅ 10MB per file, 50MB total payload limits

### Frontend
- ✅ Profile Settings → Edit Profile → Upload Photos
- ✅ Real-time upload progress indicator
- ✅ Drag-and-drop support
- ✅ Visual feedback during upload

## 🚀 Getting Started

### 1. Get Cloudinary Credentials
1. Visit: https://cloudinary.com/users/register/free
2. Sign up for free account
3. Go to Dashboard → Settings → API Keys
4. Copy your credentials:
   - Cloud Name
   - API Key
   - API Secret

### 2. Update Backend .env
Edit file: `backend/.env`

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

⚠️ **Keep API Secret private!** Never commit to GitHub.

### 3. Restart Backend
```bash
cd backend
node server.js
```

### 4. Test Upload
1. Open your app in browser
2. Go to Profile Settings
3. Click "Edit Profile"
4. Select photos to upload
5. Watch the progress bar!
6. Click "Save Profile"

## 📸 Features

| Feature | Details |
|---------|---------|
| **Single Upload** | Upload 1 photo with progress |
| **Batch Upload** | Upload up to 5 photos at once |
| **Auto Optimization** | Quality + format automatically optimized |
| **Cloud Storage** | Images stored securely on Cloudinary |
| **CDN Delivery** | Fast image loading worldwide |
| **Organization** | All images in `spark-dating/profiles/` folder |

## 🔍 How It Works

1. **User selects photos** in Edit Profile
2. **Frontend uploads** to `/api/upload/upload-images`
3. **Backend receives** files via multer middleware
4. **Backend sends** to Cloudinary API
5. **Cloudinary returns** secure HTTPS URLs
6. **Frontend stores** URLs in profile
7. **URLs saved** to MongoDB database

## 📂 File Organization

```
cloudinary:
└── spark-dating/
    └── profiles/
        ├── {userId}_1707860000000_0.jpg
        ├── {userId}_1707860000000_1.jpg
        └── {userId}_1707860000000_2.jpg
```

## 🔒 Security

- Images encrypted in transit (HTTPS)
- API Secret never exposed to frontend
- Only authenticated users can upload
- Rate limiting via Express
- Consider future NSFW detection

## 📝 API Endpoints

### Upload Single Image
```bash
POST /api/upload/upload-image
Authorization: Bearer {token}
Content-Type: multipart/form-data

File: image (single file)
```

**Response:**
```json
{
  "success": true,
  "imageUrl": "https://res.cloudinary.com/...",
  "message": "Image uploaded successfully"
}
```

### Upload Multiple Images
```bash
POST /api/upload/upload-images
Authorization: Bearer {token}
Content-Type: multipart/form-data

Files: images (up to 5 files)
```

**Response:**
```json
{
  "success": true,
  "imageUrls": [
    "https://res.cloudinary.com/...",
    "https://res.cloudinary.com/..."
  ],
  "message": "2 images uploaded successfully"
}
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot find Cloudinary module" | Run `npm install cloudinary` in backend |
| "CLOUDINARY_CLOUD_NAME not found" | Check `.env` file exists with correct variables |
| Upload fails on frontend | Check browser console for exact error |
| Images not saving | Ensure auth token is valid |
| Slow uploads | Reduce file size or use browser cache clear |

## 🔧 Advanced Configuration

### Limit Upload Size
Edit `backend/routes/upload.js`:
```javascript
limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
```

### Add More File Types
Edit `backend/routes/upload.js`:
```javascript
fileFilter: (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.includes('video')) {
    cb(null, true); // Accept videos too
  }
}
```

### Configure Upload Folder
Edit `backend/utils/cloudinary.js`:
```javascript
folder: 'spark-dating/videos', // Custom folder
```

## 📞 Support

- Cloudinary Docs: https://cloudinary.com/documentation
- Issues with uploads? Check browser Network tab
- API errors? Check backend console logs

## ✨ Next Steps

- [ ] Set up NSFW detection (Cloudinary AI)
- [ ] Add image cropping UI
- [ ] Implement image compression
- [ ] Add image gallery preview
- [ ] Set up backup storage

---

**Status:** ✅ Ready to use! Just add your Cloudinary credentials and restart the backend.
