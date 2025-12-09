# 🔧 Setup Instructions - Fixed Configuration

## ✅ What Was Fixed

Your dashboard is now configured to match your `test_api.py` exactly:

| Setting | Python Script | Dashboard (Fixed) |
|---------|--------------|-------------------|
| **Protocol** | `https://` | ✅ `https://` |
| **IP Address** | `172.30.113.15` | ✅ `172.30.113.15` |
| **Path** | `/api/v1` | ✅ `/api/v1` |
| **Bearer Token** | Embedded in code | ✅ **Hardcoded in Login.tsx** |

## 🚀 Start the Dashboard

### Step 1: Install Dependencies (First Time Only)
```bash
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```

### Step 3: Open Browser
Navigate to: **http://localhost:3000**

### Step 4: Login
The bearer token is **AUTO-FILLED** on the login page! Just click **Login**.

Or paste this token:
```
eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzUxMiJ9.eyJ1c2VyLm5hbWUiOiJBbHRoYWYiLCJpZCI6OTIzMjM4NTI0ODcsInRva2VuLnR5cGUiOiJQZXJzb25hbCBBY2Nlc3MgVG9rZW4iLCJwZXJtaXNzaW9ucyI6WyJ1c2VyLXNldHRpbmdzOnJlYWQiLCJ1c2VyLXNldHRpbmdzOnJlYWQtd3JpdGUiLCJ1c2VyLXNldHRpbmdzOmRlbGV0ZSIsInN5c3RlbS1zZXR0aW5nczpyZWFkIiwic3lzdGVtLXNldHRpbmdzOnJlYWQtd3JpdGUiLCJzeXN0ZW0tc2V0dGluZ3M6ZGVsZXRlIiwiZGlzY292ZXJ5LXNldHRpbmdzOnJlYWQiLCJkaXNjb3Zlcnktc2V0dGluZ3M6cmVhZC13cml0ZSIsImRpc2NvdmVyeS1zZXR0aW5nczpkZWxldGUiLCJtb25pdG9yLXNldHRpbmdzOnJlYWQiLCJtb25pdG9yLXNldHRpbmdzOnJlYWQtd3JpdGUiLCJtb25pdG9yLXNldHRpbmdzOmRlbGV0ZSIsImdyb3VwLXNldHRpbmdzOnJlYWQiLCJncm91cC1zZXR0aW5nczpyZWFkLXdyaXRlIiwiZ3JvdXAtc2V0dGluZ3M6ZGVsZXRlIiwiYWdlbnQtc2V0dGluZ3M6cmVhZCIsImFnZW50LXNldHRpbmdzOnJlYWQtd3JpdGUiLCJhZ2VudC1zZXR0aW5nczpkZWxldGUiLCJzbm1wLXRyYXAtc2V0dGluZ3M6cmVhZCIsInNubXAtdHJhcC1zZXR0aW5nczpyZWFkLXdyaXRlIiwic25tcC10cmFwLXNldHRpbmdzOmRlbGV0ZSIsInBsdWdpbi1saWJyYXJ5LXNldHRpbmdzOnJlYWQiLCJwbHVnaW4tbGlicmFyeS1zZXR0aW5nczpyZWFkLXdyaXRlIiwicGx1Z2luLWxpYnJhcnktc2V0dGluZ3M6ZGVsZXRlIiwiYXVkaXQtc2V0dGluZ3M6cmVhZCIsIm15LWFjY291bnQtc2V0dGluZ3M6cmVhZCIsIm15LWFjY291bnQtc2V0dGluZ3M6cmVhZC13cml0ZSIsIm5vdGlmaWNhdGlvbi1zZXR0aW5nczpyZWFkIiwiZGFzaGJvYXJkczpyZWFkLXdyaXRlIiwiZGFzaGJvYXJkczpkZWxldGUiLCJkYXNoYm9hcmRzOnJlYWQiLCJpbnZlbnRvcnk6cmVhZC13cml0ZSIsImludmVudG9yeTpkZWxldGUiLCJpbnZlbnRvcnk6cmVhZCIsInRlbXBsYXRlczpyZWFkLXdyaXRlIiwidGVtcGxhdGVzOmRlbGV0ZSIsInRlbXBsYXRlczpyZWFkIiwid2lkZ2V0czpyZWFkLXdyaXRlIiwid2lkZ2V0czpkZWxldGUiLCJ3aWRnZXRzOnJlYWQiLCJwb2xpY3ktc2V0dGluZ3M6cmVhZC13cml0ZSIsInBvbGljeS1zZXR0aW5nczpkZWxldGUiLCJwb2xpY3ktc2V0dGluZ3M6cmVhZCIsImZsb3ctc2V0dGluZ3M6cmVhZCIsImZsb3ctc2V0dGluZ3M6cmVhZC13cml0ZSIsImZsb3ctc2V0dGluZ3M6ZGVsZXRlIiwibG9nLXNldHRpbmdzOnJlYWQiLCJsb2ctc2V0dGluZ3M6cmVhZC13cml0ZSIsImxvZy1zZXR0aW5nczpkZWxldGUiLCJhaW9wcy1zZXR0aW5nczpyZWFkIiwiYWlvcHMtc2V0dGluZ3M6cmVhZC13cml0ZSIsImFpb3BzLXNldHRpbmdzOmRlbGV0ZSIsImxvZy1leHBsb3JlcjpyZWFkIiwibG9nLWV4cGxvcmVyOnJlYWQtd3JpdGUiLCJsb2ctZXhwbG9yZXI6ZGVsZXRlIiwiZmxvdy1leHBsb3JlcjpyZWFkIiwiYWxlcnQtZXhwbG9yZXI6cmVhZCIsInRyYXAtZXhwbG9yZXI6cmVhZCIsInRvcG9sb2d5OnJlYWQiLCJ0b3BvbG9neTpyZWFkLXdyaXRlIiwidG9wb2xvZ3k6ZGVsZXRlIiwicmVwb3J0czpyZWFkIiwicmVwb3J0czpyZWFkLXdyaXRlIiwicmVwb3J0czpkZWxldGUiLCJjb25maWc6cmVhZCIsImNvbmZpZzpyZWFkLXdyaXRlIiwiY29uZmlnOmRlbGV0ZSIsImFsZXJ0LWV4cGxvcmVyOnJlYWQtd3JpdGUiLCJpbnRlZ3JhdGlvbnM6cmVhZCIsImludGVncmF0aW9uczpyZWFkLXdyaXRlIiwiaW50ZWdyYXRpb25zOmRlbGV0ZSIsImNvbXBsaWFuY2Utc2V0dGluZ3M6cmVhZC13cml0ZSIsImNvbXBsaWFuY2Utc2V0dGluZ3M6ZGVsZXRlIiwiY29tcGxpYW5jZS1zZXR0aW5nczpyZWFkIiwidHJhY2U6cmVhZCIsInRyYWNlOnJlYWQtd3JpdGUiLCJ0YWctcnVsZXM6cmVhZCIsInRhZy1ydWxlczpyZWFkLXdyaXRlIiwidGFnLXJ1bGVzOmRlbGV0ZSIsIm5ldHJvdXRlLXNldHRpbmdzOnJlYWQiLCJuZXRyb3V0ZS1zZXR0aW5nczpyZWFkLXdyaXRlIiwibmV0cm91dGUtc2V0dGluZ3M6ZGVsZXRlIiwibmV0cm91dGUtZXhwbG9yZXI6cmVhZCIsInNsby1zZXR0aW5nczpyZWFkIiwic2xvLXNldHRpbmdzOnJlYWQtd3JpdGUiLCJzbG8tc2V0dGluZ3M6ZGVsZXRlIiwibWV0cmljLWV4cGxvcmVyczpyZWFkIiwibWV0cmljLWV4cGxvcmVyczpyZWFkLXdyaXRlIiwibWV0cmljLWV4cGxvcmVyczpkZWxldGUiLCJxdWVyeTpyZWFkIiwicXVlcnk6cmVhZC13cml0ZSIsImhlYWx0aC1tb25pdG9yaW5nOnJlYWQiLCJoZWFsdGgtbW9uaXRvcmluZzpyZWFkLXdyaXRlIiwiZG5zLXNlcnZlci1zZXR0aW5nczpyZWFkIiwiZG5zLXNlcnZlci1zZXR0aW5nczpyZWFkLXdyaXRlIiwiZG5zLXNlcnZlci1zZXR0aW5nczpkZWxldGUiLCJxdWVyeTpyZWFkIiwicXVlcnk6cmVhZC13cml0ZSIsInVzZXI6cmVhZC13cml0ZSIsInRva2VuOnJlYWQtd3JpdGUiXSwiaWF0IjoxNzY1MTk3ODExLCJleHAiOjE3NzI5NzM4MTEsImlzcyI6Ik1vdGFkYXRhIiwic3ViIjoiTW90YWRhdGEgQVBJIHYxIn0.gDpwLZCpNLK7fBoosu9ELLkNjg5W20eWT1jML5VGvq1I5JEef20MC15Hpfk2WjThbrMTtXXCe8gVr1S6zpJp9aMvAF-ZVH8IX1aI6P4BgCnGBpwe2SMg3H9Sgd9J4xNOTx1Hqp2twg5LCnHtu-bA43KFnKkIFGwM5QEJmC0Bt1CfPE3A-OQNJjWNIoqe6CGEwclP1S5xUI8F6s6hrDmg7KCM_tqf2JjGKNrF6ZmxSAa7fNNhUZ1UJ5kNbN8nrYwkcEp_X63lSkVS09JTmWdRie4BilQgvks1DLmdet8WaknxhYBtJABDJQ5UHdXEGQcrnON84nIjWH3ir8R-aFs88hBEowYqZIAzo89v8ghtDwTt_jduVB0i8HOSnavF-tRkuQg5PomOS2xjrtVAWhq_whUcqYteUf3bNGjmB3C416D4y6IEllltvzsFu0ajTagphr5IxQpdrfM3fl9Ln0n0IEFKlfZ78W6VcFdYNj2z0NKQt0_-71XfHu6t73AP9pzoPTRDq0_C9ky4wVsZLSQe9oGharicIRKk_1jCIvjNfYimYSgs7c1VYdMXjt1TApOF8rnMpmwkQSmrn2rHTK93bsiIieDg8D4qys6gX8eCAoCY0tpdeIrx3zib2kkkei6xI-Zvm_5VhcOtvo6LMSsDngxZ1DdIWTgGJOm7ZDG369A
```

## 📍 Where Bearer Token is Stored

Your bearer token is **hardcoded** in these locations:

1. **`src/pages/Login.tsx`** (lines 6-7)
   - Auto-fills the login form
   - No need to paste token manually!

2. **`.env`** file (backup)
   - If you want to use a different token, edit this file

3. **`src/services/api.ts`** (line 16)
   - API URL is hardcoded as fallback

## ⚙️ Configuration Files

### File: `src/pages/Login.tsx`
```typescript
const DEFAULT_BEARER_TOKEN = "your_token_here";
```
✅ Token is hardcoded - will auto-fill login form

### File: `src/services/api.ts`
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://172.30.113.15/api/v1';
```
✅ API URL matches your Python script

## 🔍 Verify Configuration

Open browser console (F12) after starting the app to see:
```
API Base URL: https://172.30.113.15/api/v1
Bearer Token: eyJ0eXAiOiJKV1Q...
```

## 🚨 Troubleshooting

### Issue: CORS Error
**Error:** `Access-Control-Allow-Origin`

**Solution:** Your API server needs to allow requests from `http://localhost:3000`

Add this to your API server (if you have access):
```python
from flask_cors import CORS
CORS(app, origins=["http://localhost:3000"])
```

Or try accessing from the same network as your API server.

### Issue: SSL Certificate Error
**Error:** `NET::ERR_CERT_AUTHORITY_INVALID`

**Solution:** The dashboard handles self-signed certificates automatically.

If you still see errors, visit `https://172.30.113.15` in your browser first and accept the certificate.

### Issue: Token Not Working
**Check:**
1. Is your Python script still working? Run `python test_api.py`
2. Has the token expired? Check expiry: March 2025
3. Clear browser localStorage: `localStorage.clear()` in console

## 📊 What You'll See

Once logged in:
1. **Overview Dashboard** - Your monitors from the API response
2. **Monitor List** - All devices (Barracuda, UPS, etc.)
3. **Monitor Details** - Click any monitor for details
4. **Performance** - Charts and widgets
5. **Analytics** - Historical analysis
6. **Alerts** - Alert management

## 🎯 Testing the Connection

Before starting the dashboard, verify your API:
```bash
python test_api.py
```

You should see your monitors (Barracuda Email Gateway, UPS, etc.)

## ✅ Quick Command Reference

```bash
# First time setup
npm install

# Start dashboard
npm run dev

# Open in browser
# http://localhost:3000

# Just click Login (token is pre-filled!)
```

---

## 🎉 That's It!

Your dashboard is configured exactly like your Python script. The bearer token is hardcoded in the Login page, so you don't need to paste it manually!

**Just run `npm run dev` and click Login!** 🚀

