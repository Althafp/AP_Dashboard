# 🔍 Vercel 404 Error - Troubleshooting Guide

## Current Issue
Getting `404` errors when calling `/api/query/objects/status?status=Up`

This means Vercel isn't finding or executing the serverless function.

## ✅ Step-by-Step Fix

### Step 1: Verify File Structure
Make sure your project has this structure:
```
EMS_Gashboard/
├── api/
│   ├── [...path].js    ← Proxy function (MUST EXIST)
│   └── test.js         ← Test endpoint
├── src/
├── vercel.json
└── package.json
```

### Step 2: Check Vercel Dashboard

1. **Go to Vercel Dashboard** → Your Project
2. **Click on latest deployment**
3. **Check "Functions" tab:**
   - You should see `api/[...path]` listed
   - If it's NOT there → Function file wasn't deployed

### Step 3: Verify Function is Committed

```bash
# Check if api folder is in git
git status

# If not, add it:
git add api/
git commit -m "Add Vercel API proxy function"
git push
```

### Step 4: Test the Function Directly

After deploying, test these URLs:

1. **Test endpoint:** `https://your-app.vercel.app/api/test`
   - Should return JSON: `{ "message": "Vercel API function is working!" }`
   - If 404 → Functions aren't working at all

2. **Proxy endpoint:** `https://your-app.vercel.app/api/query/objects`
   - Should proxy to your API
   - Check browser Network tab for response

### Step 5: Check Vercel Logs

1. Go to **Vercel Dashboard** → Your Project → **Deployments**
2. Click on latest deployment → **Functions** tab
3. Click on `api/[...path]` → **View Logs**
4. Look for:
   - `Proxy function called:` - Function is being invoked
   - Any error messages

### Step 6: Verify Environment Variables

1. Go to **Settings** → **Environment Variables**
2. **DELETE** `VITE_API_BASE_URL` if it exists
3. This ensures the app uses `/api` (relative path)

## 🔧 Alternative: Use Vercel Rewrites (If Functions Don't Work)

If serverless functions still don't work, we can use Vercel's Edge Functions or a different approach.

### Option A: Check if it's a Build Issue

Sometimes Vercel needs explicit configuration:

Update `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "functions": {
    "api/[...path].js": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ]
}
```

### Option B: Use a Different Function Structure

If catch-all routes don't work, try individual endpoints:

Create `api/proxy.js`:
```javascript
// Handle all /api/* requests
export default async function handler(req, res) {
  // Extract path from URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace('/api/', '');
  // ... rest of proxy code
}
```

## 🚨 Common Issues

### Issue 1: Function Not Deployed
**Symptom:** 404 on `/api/test`  
**Fix:** 
- Ensure `api/` folder is committed to git
- Push to repository
- Redeploy on Vercel

### Issue 2: Wrong Base URL
**Symptom:** Requests go directly to `223.196.186.236` (bypassing proxy)  
**Fix:**
- Remove `VITE_API_BASE_URL` from Vercel environment variables
- App should use `/api` (relative path)

### Issue 3: Function Not Recognized
**Symptom:** No function listed in Vercel Functions tab  
**Fix:**
- Check file is at `api/[...path].js` (not `src/api/` or elsewhere)
- Ensure file uses `export default async function handler(req, res)`
- Redeploy

### Issue 4: Build Configuration
**Symptom:** Function exists but returns 404  
**Fix:**
- Check `vercel.json` configuration
- Verify build output includes `api/` folder
- Check Vercel build logs for errors

## 📋 Quick Checklist

- [ ] `api/[...path].js` exists in root directory
- [ ] File is committed to git
- [ ] Pushed to repository
- [ ] Redeployed on Vercel
- [ ] `VITE_API_BASE_URL` removed from Vercel env vars
- [ ] Function appears in Vercel Functions tab
- [ ] `/api/test` endpoint works
- [ ] Checked Vercel function logs

## 🎯 Next Steps

1. **Verify file structure** (Step 1)
2. **Check Vercel dashboard** (Step 2)
3. **Test `/api/test` endpoint** (Step 4)
4. **Check function logs** (Step 5)
5. **If still 404, try Alternative Option A or B**

---

**If none of this works, the issue might be:**
- Vercel account/plan limitations
- Project configuration issues
- Need to use a different deployment approach

Let me know what you find in the Vercel dashboard!


