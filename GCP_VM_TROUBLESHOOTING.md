# 🔧 GCP VM Connection Troubleshooting

## Issue: External IP Not Loading

### Step 1: Verify Server is Running

**On your VM (SSH session):**

```bash
# Check if the server is actually running
ps aux | grep "vite\|node"

# Check if port 3000 is listening
sudo netstat -tlnp | grep 3000
# OR
sudo ss -tlnp | grep 3000
```

**Expected output:**
```
tcp  0  0  0.0.0.0:3000  0.0.0.0:*  LISTEN  <pid>/node
```

If you see `127.0.0.1:3000` instead of `0.0.0.0:3000`, the server is NOT accepting external connections!

### Step 2: Fix Firewall Rule (Most Common Issue)

The firewall rule might not be applied to your VM. Here's how to fix it:

#### Option A: Apply Network Tag to VM

1. **Go to GCP Console** → Compute Engine → VM instances
2. **Click on your VM** (`ems-dashboard-vm`)
3. **Click "EDIT"** (top bar)
4. **Scroll to "Network interfaces"**
5. **Click on the network interface** → **"Edit"**
6. **Add Network Tag:** `ems-dashboard`
7. **Click "DONE"** → **"SAVE"**

#### Option B: Update Firewall Rule to Target Specific VM

1. **Go to GCP Console** → VPC Network → Firewall
2. **Find your rule** (`allow-ems-dashboard`)
3. **Click on it** → **"EDIT"**
4. **Change "Targets"** from "All instances" to:
   - **"Specified target tags"**
   - **Add tag:** `ems-dashboard`
5. **Click "SAVE"**

#### Option C: Create New Firewall Rule (Simplest)

**Run this command on your local machine (with gcloud CLI):**

```bash
gcloud compute firewall-rules create allow-ems-dashboard-port-3000 \
  --allow tcp:3000 \
  --source-ranges 0.0.0.0/0 \
  --description "Allow EMS Dashboard on port 3000" \
  --direction INGRESS
```

**OR create it in Console:**

1. **GCP Console** → VPC Network → Firewall
2. **Click "CREATE FIREWALL RULE"**
3. **Configure:**
   - **Name:** `allow-ems-dashboard-port-3000`
   - **Direction:** Ingress
   - **Action:** Allow
   - **Targets:** All instances in the network
   - **Source IP ranges:** `0.0.0.0/0`
   - **Protocols and ports:** 
     - ✅ TCP
     - **Ports:** `3000`
4. **Click "CREATE"**

### Step 3: Verify Firewall Rule is Active

```bash
# From your local machine
gcloud compute firewall-rules list --filter="name:allow-ems-dashboard"

# Should show your rule with status "ENABLED"
```

### Step 4: Test Connection from VM Itself

**On your VM:**

```bash
# Test if port is accessible locally
curl http://localhost:3000

# Test if port is accessible via internal IP
curl http://$(hostname -I | awk '{print $1}'):3000
```

If these work but external IP doesn't, it's a firewall issue.

### Step 5: Check VM External IP

**On your VM:**

```bash
# Get external IP
curl -H "Metadata-Flavor: Google" http://169.254.169.254/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip
```

**OR in GCP Console:**
- Compute Engine → VM instances
- Check the **External IP** column

### Step 6: Test from Your Local Machine

```bash
# Replace EXTERNAL_IP with your actual VM external IP
curl http://EXTERNAL_IP:3000

# If this times out or fails, firewall is blocking
```

### Step 7: Check Vite Configuration

**On your VM, verify `vite.config.ts` has:**

```typescript
server: {
  port: 3000,
  host: '0.0.0.0', // This is CRITICAL!
  // ...
}
```

**If `host` is missing or set to `localhost`, fix it:**

```bash
# Edit vite.config.ts
nano vite.config.ts

# Make sure it has:
host: '0.0.0.0',
```

### Step 8: Restart Server with Correct Settings

**On your VM:**

```bash
# Stop current server (Ctrl+C)

# Start again with explicit host
npm run dev -- --host 0.0.0.0 --port 3000
```

**You should see:**
```
VITE ready in XXX ms

➜  Local:   http://localhost:3000/
➜  Network: http://VM-INTERNAL-IP:3000/
➜  Network: http://VM-EXTERNAL-IP:3000/
```

If you see "Network" URLs, the server is accepting external connections!

### Step 9: Fix the Socket Warning (Optional)

The socket warning is usually harmless, but to fix it:

**On your VM, create/update `.env` file:**

```bash
nano .env
```

**Add:**
```
NODE_OPTIONS=--no-warnings
```

**Then restart:**
```bash
npm run dev -- --host 0.0.0.0 --port 3000
```

---

## 🔍 Quick Diagnostic Commands

**Run these on your VM to diagnose:**

```bash
# 1. Check if server is running
ps aux | grep vite

# 2. Check if port 3000 is listening on 0.0.0.0
sudo netstat -tlnp | grep 3000

# 3. Test local connection
curl http://localhost:3000

# 4. Get VM internal IP
hostname -I

# 5. Get VM external IP
curl -H "Metadata-Flavor: Google" http://169.254.169.254/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip

# 6. Check firewall rules
gcloud compute firewall-rules list --filter="name:allow-ems-dashboard"
```

---

## ✅ Most Likely Solutions (In Order)

1. **Firewall rule not applied** → Follow Step 2 (Option C is easiest)
2. **Server not binding to 0.0.0.0** → Check Step 7
3. **Wrong external IP** → Check Step 5
4. **Port 3000 blocked by default** → Create firewall rule (Step 2)

---

## 🚀 Quick Fix Script

**Run this on your VM:**

```bash
#!/bin/bash

# Stop any running server
pkill -f "vite\|node"

# Verify vite.config.ts has host: '0.0.0.0'
if ! grep -q "host: '0.0.0.0'" vite.config.ts; then
  echo "⚠️  vite.config.ts needs host: '0.0.0.0'"
  echo "Please update vite.config.ts manually"
fi

# Start server
npm run dev -- --host 0.0.0.0 --port 3000
```

**Save as `start-server.sh`, make executable, and run:**
```bash
chmod +x start-server.sh
./start-server.sh
```

---

## 📋 Checklist

- [ ] Server is running (`ps aux | grep vite`)
- [ ] Port 3000 is listening on `0.0.0.0:3000` (not `127.0.0.1:3000`)
- [ ] Firewall rule exists and is enabled
- [ ] Firewall rule allows port 3000
- [ ] Firewall rule source is `0.0.0.0/0` (or your IP)
- [ ] `vite.config.ts` has `host: '0.0.0.0'`
- [ ] Server shows "Network: http://..." in output
- [ ] External IP is correct
- [ ] Can access `http://EXTERNAL_IP:3000` from browser

---

**After fixing, try accessing:** `http://YOUR-VM-EXTERNAL-IP:3000`


