# 🔧 Fix External IP Access - Step by Step Guide

## Problem
- Server is running on internal IPs: `10.160.0.2:3000` and `192.168.50.4:3000`
- External IP `http://34.47.192.48:3000` is not accessible
- Need to access from outside the GCP VM

## ✅ Solution Steps

### **ON GCP VM (SSH into your VM):**

#### Step 1: Verify Server is Running Correctly

```bash
# Check if server is listening on all interfaces
sudo netstat -tlnp | grep 3000
# OR
sudo ss -tlnp | grep 3000
```

**✅ CORRECT Output:**
```
tcp  0  0  0.0.0.0:3000  0.0.0.0:*  LISTEN  <pid>/node
```

**❌ WRONG Output (if you see this, server is localhost only):**
```
tcp  0  0  127.0.0.1:3000  0.0.0.0:*  LISTEN  <pid>/node
```

#### Step 2: Stop Current Server

In your tmux session (or terminal where server is running):
```bash
# Press Ctrl+C to stop the server
```

#### Step 3: Navigate to Project Directory

```bash
cd ~/EMS_Gashboard
# OR wherever you cloned the project
```

#### Step 4: Install Dependencies (if needed)

```bash
# Check if node_modules exists
ls node_modules

# If not, install:
npm install
```

#### Step 5: Start Server with Correct Command

```bash
# Use npm script (recommended)
npm run dev

# OR manually with full path to vite:
npx vite --host 0.0.0.0 --port 3000
```

**Expected Output:**
```
VITE v5.4.21  ready in XXX ms

➜  Local:   http://localhost:3000/
➜  Network: http://0.0.0.0:3000/    ← Should see this!
```

#### Step 6: Verify Port Binding

In a **new terminal/tmux window** (keep server running in first window):

```bash
sudo netstat -tlnp | grep 3000
```

Should show: `0.0.0.0:3000` (NOT `127.0.0.1:3000`)

#### Step 7: Test Local Access on VM

```bash
curl -I http://localhost:3000
```

Should return: `HTTP/1.1 200 OK`

---

### **ON YOUR LOCAL MACHINE (Windows):**

#### Step 1: Test External IP Access

```powershell
# Test if port is accessible
curl -I http://34.47.192.48:3000

# OR use browser:
# Open: http://34.47.192.48:3000
```

#### Step 2: If Connection Refused - Check Firewall

The firewall rule should already exist, but verify:

```powershell
gcloud compute firewall-rules list --filter="name:allow-ems-dashboard-port-3000"
```

**If rule doesn't exist or is disabled, create it:**

```powershell
gcloud compute firewall-rules create allow-ems-dashboard-port-3000 `
  --allow tcp:3000 `
  --source-ranges 0.0.0.0/0 `
  --description "Allow EMS Dashboard on port 3000" `
  --direction INGRESS
```

#### Step 3: Verify VM Has External IP

```powershell
gcloud compute instances list
```

Look for your VM and verify it has an external IP `34.47.192.48`

---

## 🔍 Troubleshooting

### Issue 1: "vite command not found"

**Solution:**
```bash
# Use npx (comes with npm)
npx vite --host 0.0.0.0 --port 3000

# OR install vite globally (not recommended)
npm install -g vite
vite --host 0.0.0.0 --port 3000

# OR use npm script (best option)
npm run dev
```

### Issue 2: Server Shows Internal IPs Only

**Symptom:** Output shows `Network: http://10.160.0.2:3000/` but not `0.0.0.0:3000`

**This is actually OK!** The server IS listening on all interfaces (`0.0.0.0`), but Vite shows the specific network interfaces it detected.

**Verify with:**
```bash
sudo netstat -tlnp | grep 3000
```

If it shows `0.0.0.0:3000`, external access should work!

### Issue 3: External IP Still Not Accessible

**Check these:**

1. **Firewall Rule Applied:**
   ```bash
   gcloud compute firewall-rules list --filter="name:allow-ems-dashboard-port-3000"
   ```

2. **VM Network Tags (if using tags):**
   ```bash
   gcloud compute instances describe <VM_NAME> --zone=<ZONE> --format="get(tags.items)"
   ```

3. **VM Has External IP:**
   ```bash
   gcloud compute instances list
   ```

4. **Test from VM itself:**
   ```bash
   # On VM, test if external IP is reachable
   curl -I http://34.47.192.48:3000
   ```

### Issue 4: Connection Timeout

**Possible causes:**
- Firewall blocking
- VM doesn't have external IP
- Network configuration issue

**Fix:**
1. Verify firewall rule exists and is enabled
2. Check VM has external IP assigned
3. Try accessing from different network

---

## ✅ Complete Checklist

### On GCP VM:
- [ ] Server is running (`ps aux | grep vite`)
- [ ] Server listening on `0.0.0.0:3000` (check with `netstat`)
- [ ] Can access `http://localhost:3000` from VM
- [ ] Server started with `npm run dev` or `npx vite --host 0.0.0.0`

### On Local Machine:
- [ ] Firewall rule exists and is enabled
- [ ] VM has external IP `34.47.192.48`
- [ ] Can access `http://34.47.192.48:3000` from browser
- [ ] No connection timeout errors

---

## 🚀 Quick Start Commands

### On GCP VM:
```bash
# Navigate to project
cd ~/EMS_Gashboard

# Stop any running server (Ctrl+C)

# Start server
npm run dev

# In another terminal, verify
sudo netstat -tlnp | grep 3000
```

### On Local Machine:
```powershell
# Test access
curl -I http://34.47.192.48:3000

# Check firewall
gcloud compute firewall-rules list --filter="name:allow-ems-dashboard-port-3000"
```

---

## 📝 Notes

- **Internal IPs shown by Vite are normal** - The server IS listening on all interfaces even if Vite shows specific IPs
- **Key check:** `netstat` should show `0.0.0.0:3000` not `127.0.0.1:3000`
- **Firewall rule must allow `0.0.0.0/0`** (all sources) for external access
- **VM must have external IP** assigned

---

**Most Common Issue:** Server not started with `--host 0.0.0.0`. Always use `npm run dev` which includes this flag!


