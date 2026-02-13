# Cloudinary Integration Setup Guide

## Getting Your Cloudinary Credentials

You need to set up a Cloudinary account to enable photo uploads for your Spark Dating app.

### Step 1: Create a Cloudinary Account
1. Go to https://cloudinary.com
2. Click "Sign up for free"
3. Complete the registration process
4. Verify your email

### Step 2: Get Your API Credentials
1. Log in to your Cloudinary Dashboard
2. In the top right, you'll see your **Cloud Name** 
3. Click on the gear icon (Settings) in the top right
4. Go to the "API Keys" tab
5. Copy:
   - **Cloud Name** - Your cloud name (top of dashboard)
   - **API Key** - Your API Key (in API Keys section)
   - **API Secret** - Your API Secret (in API Keys section, keep this SECRET!)

⚠️ **WARNING**: Never commit your API Secret to version control!

### Step 3: Update Environment Variables
Update your `/backend/.env` file:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

### Step 4: Restart Your Backend Server
```bash
cd backend
npm start
```

## Features Enabled

✅ **Single Image Upload** - `POST /api/upload/upload-image`
- Upload one profile photo
- Returns Cloudinary URL

✅ **Batch Upload** - `POST /api/upload/upload-images`
- Upload up to 5 images at once
- Returns array of Cloudinary URLs

✅ **Automatic Optimization**
- Images are automatically compressed
- Converted to optimal formats (WebP, etc.)
- Organized in `spark-dating/profiles/` folder

✅ **File Size Limits**
- Per file: 10MB
- Multiple files: 50MB total

## Troubleshooting

### "Error: CLOUDINARY_CLOUD_NAME not found"
- Make sure `.env` file exists in `/backend/` directory
- Check you've added all three variables
- Restart the backend server

### "401 Unauthorized - Invalid credentials"
- Verify your API Key and API Secret are correct
- Check there are no extra spaces in the .env file
- Log in to Cloudinary dashboard to confirm credentials

### Upload fails on frontend
- Check browser console for error messages
- Verify file size is under 10MB
- Ensure CORS is enabled (it should be by default)

## File Naming Convention

Uploaded images are stored as:
- **Folder**: `spark-dating/profiles/`
- **Filename**: `{userId}_{timestamp}_{index}`

Example: `spark-dating/profiles/54b8d05c-c1e8-414e-a0ed-0c8d6c902ad5_1707860000000_0.jpg`

This ensures:
- Easy identification of who uploaded the image
- No filename conflicts
- Easy management and deletion

## Security Notes

1. **Never share your API Secret** - It's like a password
2. Use **Unsigned uploads** for production (requires pre-signed upload tokens)
3. Consider using **Upload Presets** for client-side uploads
4. Implement **Rate limiting** to prevent abuse
5. Set up **Cloudinary Moderation** for NSFW content detection

## Resources

- Cloudinary Dashboard: https://cloudinary.com/console
- Documentation: https://cloudinary.com/documentation
- API Reference: https://cloudinary.com/documentation/cloudinary_api
