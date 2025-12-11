# 🚀 Deploy to GCP Compute Engine VM Instance

## Quick Steps

### Step 1: Create VM Instance

1. **Go to GCP Console** → Compute Engine → VM instances
2. **Click "Create Instance"**
3. **Configure:**
   - **Name:** `ems-dashboard-vm`
   - **Region:** `asia-south1` (or your preferred region)
   - **Machine type:** `e2-small` or `e2-medium` (1-2 vCPU, 2-4GB RAM)
   - **Boot disk:** 
     - OS: **Ubuntu 22.04 LTS**
     - Size: **20GB** (minimum)
   - **Firewall:** 
     - ✅ Allow HTTP traffic
     - ✅ Allow HTTPS traffic
4. **Click "Create"**

### Step 2: SSH into VM

```bash
# From your local machine
gcloud compute ssh ems-dashboard-vm --zone=asia-south1-a
```

Or use the **"SSH" button** in GCP Console.

### Step 3: Install Node.js and Git

```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Git
sudo apt install -y git

# Verify installation
node --version  # Should show v18.x or higher
npm --version
git --version
```

### Step 4: Clone Your Repository

```bash
# Clone your repository
git clone <your-repo-url> ems-dashboard
cd ems-dashboard

# Or upload files using SCP from your local machine:
# scp -r . user@vm-external-ip:/home/user/ems-dashboard
```

### Step 5: Install Dependencies and Run

```bash
# Install dependencies
npm install

# Run the dev server (with proxy)
npm run dev -- --host 0.0.0.0 --port 3000
```

The `--host 0.0.0.0` flag allows external connections (like ngrok).

### Step 6: Configure Firewall

1. **Go to GCP Console** → VPC Network → Firewall
2. **Create Firewall Rule:**
   - **Name:** `allow-ems-dashboard`
   - **Direction:** Ingress
   - **Action:** Allow
   - **Targets:** All instances in the network
   - **Source IP ranges:** `0.0.0.0/0` (or restrict to specific IPs)
   - **Protocols and ports:** 
     - ✅ TCP
     - **Ports:** `3000`
3. **Click "Create"**

### Step 7: Access Your App

1. **Get VM External IP:**
   - GCP Console → Compute Engine → VM instances
   - Copy the **External IP** address

2. **Access in browser:**
   ```
   http://YOUR-VM-EXTERNAL-IP:3000
   ```

---

## 🎯 Option 2: Run as a Service (Recommended for Production)

This keeps the app running even after you disconnect.

### Step 1: Create Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/ems-dashboard.service
```

**Paste this content:**
```ini
[Unit]
Description=EMS Dashboard Application
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/ems-dashboard
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm run dev -- --host 0.0.0.0 --port 3000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Replace:**
- `YOUR_USERNAME` with your actual username (run `whoami` to check)
- `/home/YOUR_USERNAME/ems-dashboard` with your actual project path

### Step 2: Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (starts on boot)
sudo systemctl enable ems-dashboard

# Start service
sudo systemctl start ems-dashboard

# Check status
sudo systemctl status ems-dashboard

# View logs
sudo journalctl -u ems-dashboard -f
```

### Step 3: Manage Service

```bash
# Stop service
sudo systemctl stop ems-dashboard

# Restart service
sudo systemctl restart ems-dashboard

# View logs
sudo journalctl -u ems-dashboard -n 50
```

---

## 🔒 Option 3: Use Nginx as Reverse Proxy (Production Setup)

This is better for production with HTTPS support.

### Step 1: Install Nginx

```bash
sudo apt install -y nginx
```

### Step 2: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/ems-dashboard
```

**Paste this:**
```nginx
server {
    listen 80;
    server_name YOUR_VM_EXTERNAL_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass https://223.196.186.236/api/v1;
        proxy_ssl_verify off;  # Bypass SSL certificate validation
        proxy_set_header Host 223.196.186.236;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Replace:** `YOUR_VM_EXTERNAL_IP` with your actual VM IP

### Step 3: Enable Site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/ems-dashboard /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### Step 4: Update Firewall

Allow port 80 (HTTP) in GCP Firewall rules.

### Step 5: Access

Now access via: `http://YOUR_VM_EXTERNAL_IP` (port 80, no need for :3000)

---

## 📋 Quick Setup Script

Save this as `setup-vm.sh` and run on your VM:

```bash
#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs git

# Install dependencies
npm install

# Create systemd service (adjust paths)
sudo tee /etc/systemd/system/ems-dashboard.service > /dev/null <<EOF
[Unit]
Description=EMS Dashboard
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/npm run dev -- --host 0.0.0.0 --port 3000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable ems-dashboard
sudo systemctl start ems-dashboard

echo "✅ Setup complete! Check status with: sudo systemctl status ems-dashboard"
```

**Make executable and run:**
```bash
chmod +x setup-vm.sh
./setup-vm.sh
```

---

## 🔍 Troubleshooting

### Can't access from browser
- Check GCP Firewall rules (allow port 3000 or 80)
- Check VM has external IP
- Verify service is running: `sudo systemctl status ems-dashboard`

### Service won't start
- Check logs: `sudo journalctl -u ems-dashboard -n 50`
- Verify paths in service file are correct
- Check Node.js is installed: `which node`

### API calls fail
- The Vite proxy should handle this automatically
- Check `vite.config.ts` has the proxy configuration
- Verify API server is accessible from VM

### Port already in use
```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>
```

---

## 💡 Why This Works

1. **Vite dev server** runs on the VM (just like on your local machine)
2. **Proxy is built-in** - `vite.config.ts` already has the proxy configuration
3. **No SSL issues** - Proxy bypasses SSL validation server-side
4. **Same as ngrok** - But running on a permanent VM instead of tunneling

---

## 🎯 Next Steps

1. Create VM instance
2. SSH into VM
3. Install Node.js
4. Clone/upload your code
5. Run `npm run dev -- --host 0.0.0.0 --port 3000`
6. Configure firewall
7. Access via VM external IP

**That's it!** Your app will work exactly like it does with ngrok, but on a permanent GCP VM.

