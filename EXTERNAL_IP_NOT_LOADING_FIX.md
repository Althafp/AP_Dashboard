# 🔧 External IP Not Loading - Quick Fix

## Problem
External IP `http://34.47.192.48:3000` was working yesterday, but after running `npm run dev` in tmux, it's not loading anymore.

## ✅ Quick Checks

### 1. Verify Server is Running with Correct Host Binding

**On your GCP VM (in tmux or SSH):**

```bash
# Check if server is listening on 0.0.0.0 (external) or 127.0.0.1 (local only)
sudo netstat -tlnp | grep 3000
# OR
sudo ss -tlnp | grep 3000
```

**✅ CORRECT (External access enabled):**
```
tcp  0  0  0.0.0.0:3000  0.0.0.0:*  LISTEN  <pid>/node
```

**❌ WRONG (Local only - won't work externally):**
```
tcp  0  0  127.0.0.1:3000  0.0.0.0:*  LISTEN  <pid>/node
```

### 2. Check How Server Was Started

**If you see `127.0.0.1:3000` instead of `0.0.0.0:3000`:**

The server was started **WITHOUT** the `--host 0.0.0.0` flag!

**Fix:**
1. **Stop the current server** (Ctrl+C in tmux)
2. **Start it correctly:**
   ```bash
   npm run dev
   ```
   
   This will use the script from `package.json` which includes `--host 0.0.0.0`

**OR manually:**
```bash
vite --host 0.0.0.0 --port 3000
```

### 3. Verify Firewall Rule

The firewall rule exists, but verify it's applied:

```bash
gcloud compute firewall-rules list --filter="name:allow-ems-dashboard-port-3000"
```

Should show:
```
NAME                           NETWORK  DIRECTION  PRIORITY  ALLOW     DENY  DISABLED
allow-ems-dashboard-port-3000  default  INGRESS    1000      tcp:3000        False
```

### 4. Test External Access

**From your local machine (not the VM):**

```bash
# Test if port is accessible
curl -I http://34.47.192.48:3000

# OR use browser
# Open: http://34.47.192.48:3000
```

## 🚀 Step-by-Step Fix

### Step 1: Stop Current Server

In your tmux session:
```bash
# Press Ctrl+C to stop the server
```

### Step 2: Verify package.json Script

Make sure `package.json` has:
```json
"scripts": {
  "dev": "vite --host 0.0.0.0"
}
```

### Step 3: Start Server Correctly

```bash
npm run dev
```

**Look for this output:**
```
VITE ready in XXX ms

➜  Local:   http://localhost:3000/
➜  Network: http://0.0.0.0:3000/
```

**✅ If you see "Network: http://0.0.0.0:3000/"** - External access is enabled!

**❌ If you only see "Local: http://localhost:3000/"** - External access is NOT enabled!

### Step 4: Verify Port Binding

In another terminal (or new tmux window):
```bash
sudo netstat -tlnp | grep 3000
```

Should show: `0.0.0.0:3000` (not `127.0.0.1:3000`)

### Step 5: Test External Access

From your browser or local machine:
```
http://34.47.192.48:3000
```

## 🔍 Common Issues

### Issue 1: Server Binding to localhost Only

**Symptom:** `netstat` shows `127.0.0.1:3000` instead of `0.0.0.0:3000`

**Cause:** Server started without `--host 0.0.0.0` flag

**Fix:** 
```bash
# Stop server (Ctrl+C)
npm run dev  # This includes --host 0.0.0.0
```

### Issue 2: Firewall Rule Not Applied

**Symptom:** Port 3000 not accessible from outside

**Fix:**
```bash
# Verify firewall rule exists
gcloud compute firewall-rules list --filter="name:allow-ems-dashboard-port-3000"

# If it doesn't exist, create it:
gcloud compute firewall-rules create allow-ems-dashboard-port-3000 \
  --allow tcp:3000 \
  --source-ranges 0.0.0.0/0 \
  --description "Allow EMS Dashboard on port 3000" \
  --direction INGRESS
```

### Issue 3: Server Not Running

**Symptom:** Nothing listening on port 3000

**Fix:**
```bash
# Check if server is running
ps aux | grep vite

# If not running, start it:
npm run dev
```

## ✅ Verification Checklist

- [ ] Server is running (`ps aux | grep vite`)
- [ ] Server is listening on `0.0.0.0:3000` (not `127.0.0.1:3000`)
- [ ] Firewall rule exists and is enabled
- [ ] Can access `http://localhost:3000` from VM
- [ ] Can access `http://34.47.192.48:3000` from external browser

## 🎯 Quick Command Reference

```bash
# Check server status
ps aux | grep vite

# Check port binding
sudo netstat -tlnp | grep 3000

# Check firewall rule
gcloud compute firewall-rules list --filter="name:allow-ems-dashboard-port-3000"

# Start server correctly
npm run dev

# Test local access
curl http://localhost:3000

# Test external access (from your local machine)
curl http://34.47.192.48:3000
```

---

**Most likely issue:** Server was started without `--host 0.0.0.0` flag. Just restart with `npm run dev` and it should work!


