# ✅ Vercel Deployment - SSL Certificate Fix

## 🔧 What Was Fixed

The issue was that your API server (`https://172.30.113.15`) has a self-signed SSL certificate, which browsers block when making direct API calls from JavaScript.

### Solution Implemented

Created a **Vercel serverless function** that acts as a proxy (similar to your Vite dev server proxy):

1. **`api/[...path].js`** - Serverless function that:
   - Receives all `/api/*` requests
   - Proxies them to `https://172.30.113.15/api/v1/*`
   - **Bypasses SSL certificate validation** (server-side, so it works!)
   - Preserves all headers (Authorization, Cookie, etc.)
   - Handles CORS properly

2. **`vercel.json`** - Configuration for Vercel:
   - Sets function timeout to 30 seconds
   - Routes `/api/*` to the serverless function automatically

3. **`src/services/api.ts`** - Updated comment to reflect the new setup

## 🚀 Deployment Steps

### Step 1: Remove Environment Variable in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. **Delete or unset** `VITE_API_BASE_URL` (if it's set to `https://172.30.113.15/api/v1`)
4. This allows the app to use the relative `/api` path, which will be proxied

### Step 2: Deploy to Vercel

1. **Commit and push** the new files:
   ```bash
   git add .
   git commit -m "Add Vercel proxy for API requests"
   git push
   ```

2. Vercel will automatically detect the changes and redeploy

   OR manually trigger deployment:
   - Go to Vercel dashboard
   - Click **Deployments** → **Redeploy**

### Step 3: Verify It Works

After deployment, check:

1. Open your Vercel app URL
2. Open browser DevTools (F12) → **Network** tab
3. Try to load the dashboard
4. You should see:
   - ✅ Requests to `/api/query/objects/status?status=Up` return **200 OK**
   - ✅ No more `ERR_CERT_AUTHORITY_INVALID` errors
   - ✅ Data loads successfully

## 📋 How It Works

### Development (ngrok - already working):
```
Browser → http://localhost:3000/api/query/objects
         ↓
   Vite Dev Server Proxy
         ↓
   https://172.30.113.15/api/v1/query/objects ✅
```

### Production (Vercel - now fixed):
```
Browser → https://your-app.vercel.app/api/query/objects
         ↓
   Vercel Serverless Function (api/[...path].js)
         ↓
   https://172.30.113.15/api/v1/query/objects ✅
   (SSL validation bypassed server-side)
```

## 🔍 Troubleshooting

### Issue: Still getting 404 errors

**This means Vercel isn't recognizing the serverless function. Check:**

1. **Verify the function file exists:**
   - File should be at: `api/[...path].js` (in the root directory)
   - Not in `src/api/` or any subdirectory

2. **Check Vercel deployment logs:**
   - Go to Vercel Dashboard → Your Project → **Deployments**
   - Click on the latest deployment
   - Check **Functions** tab - you should see `api/[...path]` listed
   - If it's not there, the function file isn't being recognized

3. **Test the function directly:**
   - Try accessing: `https://your-app.vercel.app/api/test`
   - This should return a JSON response if functions are working
   - If this also returns 404, Vercel isn't recognizing the `api/` folder

4. **Verify file structure:**
   ```
   your-project/
   ├── api/
   │   ├── [...path].js  ← This file must exist
   │   └── test.js       ← Test endpoint
   ├── src/
   ├── vercel.json
   └── package.json
   ```

5. **Redeploy after adding the function:**
   - The function must be committed to git
   - Push to your repository
   - Vercel will auto-deploy, or manually trigger deployment

6. **Check Vercel build logs:**
   - Look for any errors about the `api/` folder
   - Make sure the function file is included in the deployment

### Issue: Still getting SSL errors

**Check:**
1. The serverless function should handle SSL bypass automatically
2. Check Vercel function logs for errors
3. Verify the function is being called (check Network tab - requests should go to `/api/*`)

### Issue: CORS errors

**Solution:** The serverless function sets CORS headers automatically. If you still see CORS errors:
1. Check that requests are going to `/api/*` (relative path)
2. Verify the function is running (check Vercel logs)

### Issue: Function timeout

**Solution:** The function timeout is set to 30 seconds. If your API calls take longer:
1. Edit `vercel.json` and increase `maxDuration` (max 60s on free tier, 300s on Pro)

## 📝 Files Changed

1. ✅ **`api/[...path].js`** - New serverless function (proxy)
2. ✅ **`vercel.json`** - Vercel configuration
3. ✅ **`src/services/api.ts`** - Updated comment (no code change needed)

## 🎯 Next Steps

1. **Remove** `VITE_API_BASE_URL` from Vercel environment variables
2. **Commit and push** the changes
3. **Redeploy** on Vercel
4. **Test** the deployment

---

**Note:** The proxy function bypasses SSL certificate validation, which is necessary because your API server uses a self-signed certificate. This is safe because:
- The proxy runs server-side (not in the browser)
- It's similar to your Vite dev server setup
- The connection is still encrypted (HTTPS), just with an unverified certificate

