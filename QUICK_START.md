# 🚀 Quick Start - Your EMS Dashboard

## ✅ Your API is Already Configured!

Based on your `test_api.py` file, I've configured the dashboard to work with your backend:

- **API URL**: `https://172.30.113.15/api/v1`
- **Bearer Token**: Already saved in `.env` file

## 🎯 Start the Dashboard in 3 Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```

### Step 3: Login
1. Open browser at: **http://localhost:3000**
2. **Copy and paste this token** on the login page:

```
eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzUxMiJ9.eyJ1c2VyLm5hbWUiOiJBbHRoYWYiLCJpZCI6OTIzMjM4NTI0ODcsInRva2VuLnR5cGUiOiJQZXJzb25hbCBBY2Nlc3MgVG9rZW4iLCJwZXJtaXNzaW9ucyI6WyJ1c2VyLXNldHRpbmdzOnJlYWQiLCJ1c2VyLXNldHRpbmdzOnJlYWQtd3JpdGUiLCJ1c2VyLXNldHRpbmdzOmRlbGV0ZSIsInN5c3RlbS1zZXR0aW5nczpyZWFkIiwic3lzdGVtLXNldHRpbmdzOnJlYWQtd3JpdGUiLCJzeXN0ZW0tc2V0dGluZ3M6ZGVsZXRlIiwiZGlzY292ZXJ5LXNldHRpbmdzOnJlYWQiLCJkaXNjb3Zlcnktc2V0dGluZ3M6cmVhZC13cml0ZSIsImRpc2NvdmVyeS1zZXR0aW5nczpkZWxldGUiLCJtb25pdG9yLXNldHRpbmdzOnJlYWQiLCJtb25pdG9yLXNldHRpbmdzOnJlYWQtd3JpdGUiLCJtb25pdG9yLXNldHRpbmdzOmRlbGV0ZSIsImdyb3VwLXNldHRpbmdzOnJlYWQiLCJncm91cC1zZXR0aW5nczpyZWFkLXdyaXRlIiwiZ3JvdXAtc2V0dGluZ3M6ZGVsZXRlIiwiYWdlbnQtc2V0dGluZ3M6cmVhZCIsImFnZW50LXNldHRpbmdzOnJlYWQtd3JpdGUiLCJhZ2VudC1zZXR0aW5nczpkZWxldGUiLCJzbm1wLXRyYXAtc2V0dGluZ3M6cmVhZCIsInNubXAtdHJhcC1zZXR0aW5nczpyZWFkLXdyaXRlIiwic25tcC10cmFwLXNldHRpbmdzOmRlbGV0ZSIsInBsdWdpbi1saWJyYXJ5LXNldHRpbmdzOnJlYWQiLCJwbHVnaW4tbGlicmFyeS1zZXR0aW5nczpyZWFkLXdyaXRlIiwicGx1Z2luLWxpYnJhcnktc2V0dGluZ3M6ZGVsZXRlIiwiYXVkaXQtc2V0dGluZ3M6cmVhZCIsIm15LWFjY291bnQtc2V0dGluZ3M6cmVhZCIsIm15LWFjY291bnQtc2V0dGluZ3M6cmVhZC13cml0ZSIsIm5vdGlmaWNhdGlvbi1zZXR0aW5nczpyZWFkIiwiZGFzaGJvYXJkczpyZWFkLXdyaXRlIiwiZGFzaGJvYXJkczpkZWxldGUiLCJkYXNoYm9hcmRzOnJlYWQiLCJpbnZlbnRvcnk6cmVhZC13cml0ZSIsImludmVudG9yeTpkZWxldGUiLCJpbnZlbnRvcnk6cmVhZCIsInRlbXBsYXRlczpyZWFkLXdyaXRlIiwidGVtcGxhdGVzOmRlbGV0ZSIsInRlbXBsYXRlczpyZWFkIiwid2lkZ2V0czpyZWFkLXdyaXRlIiwid2lkZ2V0czpkZWxldGUiLCJ3aWRnZXRzOnJlYWQiLCJwb2xpY3ktc2V0dGluZ3M6cmVhZC13cml0ZSIsInBvbGljeS1zZXR0aW5nczpkZWxldGUiLCJwb2xpY3ktc2V0dGluZ3M6cmVhZCIsImZsb3ctc2V0dGluZ3M6cmVhZCIsImZsb3ctc2V0dGluZ3M6cmVhZC13cml0ZSIsImZsb3ctc2V0dGluZ3M6ZGVsZXRlIiwibG9nLXNldHRpbmdzOnJlYWQiLCJsb2ctc2V0dGluZ3M6cmVhZC13cml0ZSIsImxvZy1zZXR0aW5nczpkZWxldGUiLCJhaW9wcy1zZXR0aW5nczpyZWFkIiwiYWlvcHMtc2V0dGluZ3M6cmVhZC13cml0ZSIsImFpb3BzLXNldHRpbmdzOmRlbGV0ZSIsImxvZy1leHBsb3JlcjpyZWFkIiwibG9nLWV4cGxvcmVyOnJlYWQtd3JpdGUiLCJsb2ctZXhwbG9yZXI6ZGVsZXRlIiwiZmxvdy1leHBsb3JlcjpyZWFkIiwiYWxlcnQtZXhwbG9yZXI6cmVhZCIsInRyYXAtZXhwbG9yZXI6cmVhZCIsInRvcG9sb2d5OnJlYWQiLCJ0b3BvbG9neTpyZWFkLXdyaXRlIiwidG9wb2xvZ3k6ZGVsZXRlIiwicmVwb3J0czpyZWFkIiwicmVwb3J0czpyZWFkLXdyaXRlIiwicmVwb3J0czpkZWxldGUiLCJjb25maWc6cmVhZCIsImNvbmZpZzpyZWFkLXdyaXRlIiwiY29uZmlnOmRlbGV0ZSIsImFsZXJ0LWV4cGxvcmVyOnJlYWQtd3JpdGUiLCJpbnRlZ3JhdGlvbnM6cmVhZCIsImludGVncmF0aW9uczpyZWFkLXdyaXRlIiwiaW50ZWdyYXRpb25zOmRlbGV0ZSIsImNvbXBsaWFuY2Utc2V0dGluZ3M6cmVhZC13cml0ZSIsImNvbXBsaWFuY2Utc2V0dGluZ3M6ZGVsZXRlIiwiY29tcGxpYW5jZS1zZXR0aW5nczpyZWFkIiwidHJhY2U6cmVhZCIsInRyYWNlOnJlYWQtd3JpdGUiLCJ0YWctcnVsZXM6cmVhZCIsInRhZy1ydWxlczpyZWFkLXdyaXRlIiwidGFnLXJ1bGVzOmRlbGV0ZSIsIm5ldHJvdXRlLXNldHRpbmdzOnJlYWQiLCJuZXRyb3V0ZS1zZXR0aW5nczpyZWFkLXdyaXRlIiwibmV0cm91dGUtc2V0dGluZ3M6ZGVsZXRlIiwibmV0cm91dGUtZXhwbG9yZXI6cmVhZCIsInNsby1zZXR0aW5nczpyZWFkIiwic2xvLXNldHRpbmdzOnJlYWQtd3JpdGUiLCJzbG8tc2V0dGluZ3M6ZGVsZXRlIiwibWV0cmljLWV4cGxvcmVyczpyZWFkIiwibWV0cmljLWV4cGxvcmVyczpyZWFkLXdyaXRlIiwibWV0cmljLWV4cGxvcmVyczpkZWxldGUiLCJxdWVyeTpyZWFkIiwicXVlcnk6cmVhZC13cml0ZSIsImhlYWx0aC1tb25pdG9yaW5nOnJlYWQiLCJoZWFsdGgtbW9uaXRvcmluZzpyZWFkLXdyaXRlIiwiZG5zLXNlcnZlci1zZXR0aW5nczpyZWFkIiwiZG5zLXNlcnZlci1zZXR0aW5nczpyZWFkLXdyaXRlIiwiZG5zLXNlcnZlci1zZXR0aW5nczpkZWxldGUiLCJxdWVyeTpyZWFkIiwicXVlcnk6cmVhZC13cml0ZSIsInVzZXI6cmVhZC13cml0ZSIsInRva2VuOnJlYWQtd3JpdGUiXSwiaWF0IjoxNzY1MTk3ODExLCJleHAiOjE3NzI5NzM4MTEsImlzcyI6Ik1vdGFkYXRhIiwic3ViIjoiTW90YWRhdGEgQVBJIHYxIn0.gDpwLZCpNLK7fBoosu9ELLkNjg5W20eWT1jML5VGvq1I5JEef20MC15Hpfk2WjThbrMTtXXCe8gVr1S6zpJp9aMvAF-ZVH8IX1aI6P4BgCnGBpwe2SMg3H9Sgd9J4xNOTx1Hqp2twg5LCnHtu-bA43KFnKkIFGwM5QEJmC0Bt1CfPE3A-OQNJjWNIoqe6CGEwclP1S5xUI8F6s6hrDmg7KCM_tqf2JjGKNrF6ZmxSAa7fNNhUZ1UJ5kNbN8nrYwkcEp_X63lSkVS09JTmWdRie4BilQgvks1DLmdet8WaknxhYBtJABDJQ5UHdXEGQcrnON84nIjWH3ir8R-aFs88hBEowYqZIAzo89v8ghtDwTt_jduVB0i8HOSnavF-tRkuQg5PomOS2xjrtVAWhq_whUcqYteUf3bNGjmB3C416D4y6IEllltvzsFu0ajTagphr5IxQpdrfM3fl9Ln0n0IEFKlfZ78W6VcFdYNj2z0NKQt0_-71XfHu6t73AP9pzoPTRDq0_C9ky4wVsZLSQe9oGharicIRKk_1jCIvjNfYimYSgs7c1VYdMXjt1TApOF8rnMpmwkQSmrn2rHTK93bsiIieDg8D4qys6gX8eCAoCY0tpdeIrx3zib2kkkei6xI-Zvm_5VhcOtvo6LMSsDngxZ1DdIWTgGJOm7ZDG369A
```

3. Click **Login** button
4. You're in! 🎉

## 📊 What You Can Do Now

Once logged in, you can:

1. **Overview Dashboard** - See all your monitors at a glance
2. **Monitor List** - Search and filter your monitors
3. **Monitor Details** - Click any monitor to see detailed info
4. **Performance** - View dashboards and widgets
5. **Analytics** - Run historical analysis
6. **Alerts** - Manage your alerts

## ⚙️ Configuration Details

Your `.env` file is already configured with:
```env
VITE_API_BASE_URL=https://172.30.113.15/api/v1
VITE_BEARER_TOKEN=[your token]
```

The app uses the same settings as your `test_api.py`:
- ✅ Same API endpoint
- ✅ Same bearer token
- ✅ Same SSL configuration (self-signed cert handling)

## 🔧 SSL Certificate Note

Your API uses HTTPS with a self-signed certificate. The dashboard is configured to handle this (just like your Python script with `verify=False`).

For production, consider:
1. Using a proper SSL certificate
2. Or configuring your browser to trust the self-signed certificate

## 🚨 Troubleshooting

### Issue: "Network Error" or "Connection Failed"

**Check these:**
1. Is the API server running at `https://172.30.113.15`?
2. Can you access it from your Python script? (Run `test_api.py` to verify)
3. Browser might block mixed content (HTTPS API from HTTP localhost)

**Solution:**
- Use HTTPS for the dashboard by running: `npm run build` then serve with HTTPS
- Or test from the same network as your API

### Issue: "Invalid Token"

**Solution:**
- Copy the token exactly as shown above (it's very long!)
- Make sure there are no extra spaces

### Issue: CORS Error

**Solution:**
Your API server needs to allow requests from `http://localhost:3000`. Add CORS headers to your backend.

## 🎯 Token Information

Your token belongs to: **Althaf**

**Token expires:** March 2025

**Permissions:** Full access including:
- System settings
- Monitoring
- Dashboards
- Alerts
- Reports
- And more...

## 📞 Need Help?

1. Check browser console (F12) for errors
2. Verify API is accessible: Run your `test_api.py`
3. Check network tab in browser DevTools

---

## 🎉 Ready to Go!

Run these commands now:

```bash
npm install
npm run dev
```

Then login with the token above!

**Your monitoring dashboard awaits! 🚀**

