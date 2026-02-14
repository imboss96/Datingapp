# Deploy Backend to Vercel

## Step 1: Push Backend to GitHub

Create a new GitHub repository for your backend (or add it to existing repo):

```bash
cd backend
git init
git add .
git commit -m "Backend setup for Vercel deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_BACKEND_REPO.git
git push -u origin main
```

## Step 2: Create Vercel Account & Project

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click **"New Project"**
4. Import your backend repository
5. Framework: Select **"Other" / "Node.js"**
6. Root Directory: Leave as `.` or select `/backend` if in monorepo
7. Click **"Deploy"**

## Step 3: Add Environment Variables

After deployment (it will fail first), add environment variables:

1. Go to your **Vercel Project** → **Settings** → **Environment Variables**
2. Add each variable:

### Required Variables:

| Variable | Value | Example |
|----------|-------|---------|
| `MONGODB_URI` | Your MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/spark-dating` |
| `JWT_SECRET` | Strong random secret | `your-super-secret-key-min-32-chars` |
| `CORS_ORIGIN` | Your Vercel frontend URL | `https://your-frontend.vercel.app` |
| `WS_ORIGIN` | Your Vercel frontend URL | `https://your-frontend.vercel.app` |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard | `dxxxxx` |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard | `123456789012345` |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard | `xxxxxxxxxxxxx` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console | `399767936973-xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console | `GOCSPX-xxxxx` |

**Important:** For all variables, select **Production, Preview, and Development** environments.

## Step 4: Redeploy

1. After adding variables, Vercel will auto-redeploy
2. Check **Deployments** tab to see status
3. Once deployment succeeds, note your backend URL: `https://your-project.vercel.app`

## Step 5: Update Frontend Environment Variables

Add to Vercel frontend project:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://your-backend.vercel.app/api` |
| `VITE_WS_URL` | `wss://your-backend.vercel.app` |
| `VITE_GOOGLE_CLIENT_ID` | `399767936973-qcbt20e5v2sokcf0s0uosmpk694on5j5.apps.googleusercontent.com` |

## For Existing Monorepo (if both frontend + backend in same repo)

If your backend is in `/backend` folder:

1. In Vercel dashboard, create **2 separate projects**:
   - One for frontend (root directory: `.`)
   - One for backend (root directory: `./backend`)

Or use **monorepo approach**:

**Create `vercel.json` in root:**
```json
{
  "projects": {
    "frontend": {
      "rootDirectory": ".",
      "buildCommand": "npm run build"
    },
    "backend": {
      "rootDirectory": "backend"
    }
  }
}
```

## Verify Deployment

Test your backend is working:

```bash
# Test API endpoint
curl https://your-backend.vercel.app/api/users

# Test WebSocket (should upgrade successfully)
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" https://your-backend.vercel.app
```

## Common Issues

### 1. WebSocket Not Working
- Make sure `WS_ORIGIN` matches your frontend URL exactly
- Check backend CORS configuration matches

### 2. CORS Errors
- Verify `CORS_ORIGIN` in environment variables
- Must match frontend domain exactly
- Include protocol: `https://...` not just domain

### 3. MongoDB Connection Failed
- Verify `MONGODB_URI` is correct
- Check if IP whitelist allows Vercel IPs: Add `0.0.0.0/0` in MongoDB Atlas Network Access
- Ensure MongoDB user has proper permissions

### 4. Port Issues
- Vercel sets `process.env.PORT` automatically
- Your server.js already uses: `const PORT = process.env.PORT || 5000`
- Don't hardcode port 5000

## Next Steps

1. Deploy backend to Vercel ✓
2. Get backend URL: `https://xxxxx.vercel.app`
3. Update frontend `VITE_API_URL` and `VITE_WS_URL` with this URL
4. Redeploy frontend
5. Test in browser - typing indicators, messages, login should all work

## Debugging

Check Vercel logs:
1. Go to **Deployments**
2. Click latest deployment
3. View **Logs** tab for errors

For local testing before deploying:
```bash
cd backend
npm install -g vercel
vercel dev
```
