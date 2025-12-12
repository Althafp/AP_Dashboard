# 🔍 Debugging API 500 Errors on GCP VM

## Problem
You're getting `500 Internal Server Error` when the frontend tries to call `/api/query/objects/status?status=Up`

## What I've Done

1. ✅ **Added better error logging** to `vite.config.ts` - The proxy will now log all requests and errors
2. ✅ **Added timeout handling** - 30 second timeout for API requests
3. ✅ **Created test script** - `test_api_from_vm.sh` to test API connectivity

## Step 1: Test API Connectivity from VM

Run this on your GCP VM to test if the API server is accessible:

```bash
# Make the script executable
chmod +x test_api_from_vm.sh

# Run the test
./test_api_from_vm.sh
```

**OR** test with Python (if you have it installed):

```bash
python test_api.py
```

### What to Look For:
- ✅ **If it works**: The API server is accessible, the issue is with the proxy configuration
- ❌ **If it fails**: The API server is NOT accessible from the VM (network/firewall issue)

## Step 2: Check Vite Dev Server Logs

When you run `npm run dev`, you should now see detailed proxy logs:

```
[Proxy] Forwarding GET /api/query/objects/status?status=Up to https://172.30.113.15/api/v1/query/objects/status?status=Up
[Proxy] Response 500 for GET /api/query/objects/status?status=Up
[Proxy] Server error 500 from API server
```

**OR** if there's a connection error:

```
[Proxy Error] connect ECONNREFUSED 172.30.113.15:443
[Proxy Error] Request URL: /api/query/objects/status?status=Up
```

## Step 3: Common Issues & Solutions

### Issue 1: API Server Not Accessible from VM

**Symptom**: `[Proxy Error] connect ECONNREFUSED` or `ETIMEDOUT`

**Possible Causes**:
- The API server at `172.30.113.15` is only accessible from your local network
- GCP VM doesn't have internet access to that IP
- Firewall blocking outbound connections

**Solutions**:
1. **Check if API server is on a private network**: If `172.30.113.15` is a private IP, the GCP VM won't be able to reach it
2. **Use VPN or SSH tunnel**: Set up a tunnel from your local machine to the VM
3. **Change API URL**: If the API is accessible via a different URL from the VM

### Issue 2: SSL Certificate Issues

**Symptom**: `[Proxy Error] self signed certificate` or SSL errors

**Solution**: The proxy is already configured with `secure: false`, but you might need to check Node.js SSL settings.

### Issue 3: API Server Returns 500

**Symptom**: `[Proxy] Response 500` - The proxy successfully connects, but API returns 500

**Possible Causes**:
- API server is having issues
- Authentication token expired
- Request format is incorrect

**Solutions**:
1. **Check API server logs** (if you have access)
2. **Test with curl** (see Step 1)
3. **Verify token is still valid**

## Step 4: Alternative Solution - Direct API URL

If the proxy doesn't work, you can bypass it by setting an environment variable:

```bash
# On the VM, create a .env file
echo "VITE_API_BASE_URL=https://172.30.113.15/api/v1" > .env

# Restart the dev server
npm run dev
```

**Note**: This will bypass the proxy and make direct API calls. You might encounter CORS errors if the API server doesn't allow requests from `http://34.47.192.48:3000`.

## Step 5: Check Network Connectivity

Test basic connectivity:

```bash
# Test if you can reach the API server
ping 172.30.113.15

# Test HTTPS connection
curl -k -I https://172.30.113.15

# Test specific API endpoint
curl -k -X GET "https://172.30.113.15/api/v1/query/objects/status?status=Up" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Cookie: client.id=Q5VZ97naQhyLIH0Vz4MSXvzbMyCYTjPwz+1hVJ643pA="
```

## Next Steps

1. **Run the test script** (`test_api_from_vm.sh`) and share the output
2. **Check the Vite dev server logs** when you make a request - look for `[Proxy]` messages
3. **Share the error details** from the browser console (Network tab → click on the failed request → Response tab)

## Quick Diagnostic Commands

```bash
# Test API connectivity
./test_api_from_vm.sh

# Or with Python
python test_api.py

# Check if port 443 is reachable
nc -zv 172.30.113.15 443

# Check DNS resolution
nslookup 172.30.113.15

# Check network routes
traceroute 172.30.113.15
```

---

**After running these tests, share the output and I can help you fix the specific issue!**

