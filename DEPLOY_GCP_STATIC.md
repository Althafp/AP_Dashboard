# 🚀 Deploy to GCP (Static Files - No server.js)

This guide shows how to deploy your React app to GCP without using server.js.

## Option 1: Cloud Run with Nginx (Recommended)

### Prerequisites
- Google Cloud SDK installed
- Project ID: `focus-cumulus-477711-g5`
- Region: `asia-south1`

### Steps

1. **Build and push Docker image:**

**Option A: Using cloudbuild.yaml (Recommended)**
```bash
gcloud builds submit --config cloudbuild.yaml .
```

Note: The image tag is specified in `cloudbuild.yaml`, so don't use `--tag` flag.

**Option B: Temporarily rename Dockerfile**
```bash
# Windows PowerShell
Copy-Item Dockerfile Dockerfile.old
Copy-Item Dockerfile.nginx Dockerfile
gcloud builds submit --tag gcr.io/focus-cumulus-477711-g5/ap-dashboard:nginx
Remove-Item Dockerfile
Rename-Item Dockerfile.old Dockerfile
```

2. **Deploy to Cloud Run:**
```bash
gcloud run deploy ap-dashboard \
  --image gcr.io/focus-cumulus-477711-g5/ap-dashboard:nginx \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 80 \
  --memory 256Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10
```

3. **Access your app:**
The deployment will give you a URL like: `https://ap-dashboard-xxxxx-xx.a.run.app`

---

## Option 2: Cloud Storage + Cloud CDN (Simplest)

### Steps

1. **Build your app:**
```bash
npm run build
```

2. **Create a Cloud Storage bucket:**
```bash
gsutil mb -p focus-cumulus-477711-g5 -l asia-south1 gs://ap-dashboard-static
```

3. **Enable static website hosting:**
```bash
gsutil web set -m index.html -e index.html gs://ap-dashboard-static
```

4. **Upload your built files:**
```bash
# Upload dist folder contents
gsutil -m cp -r dist/* gs://ap-dashboard-static/
```

5. **Make bucket public:**
```bash
gsutil iam ch allUsers:objectViewer gs://ap-dashboard-static
```

6. **Access your app:**
Your app will be available at:
```
https://storage.googleapis.com/ap-dashboard-static/index.html
```

### Optional: Set up Custom Domain
1. Create a Cloud Load Balancer
2. Point your domain to the load balancer
3. Configure Cloud CDN for better performance

---

## Option 3: Firebase Hosting (Easiest)

### Steps

1. **Install Firebase CLI:**
```bash
npm install -g firebase-tools
```

2. **Login:**
```bash
firebase login
```

3. **Initialize Firebase:**
```bash
firebase init hosting
```
- Select your project
- Set public directory to `dist`
- Configure as single-page app: Yes
- Set up automatic builds: No

4. **Build and deploy:**
```bash
npm run build
firebase deploy --only hosting
```

---

## Important Notes

### API Configuration
Since you're not using server.js, the app makes **direct API calls** from the browser to:
- `https://172.30.113.15/api/v1`

**Requirements:**
- Users must have VPN access to reach the API
- CORS must be enabled on the API server
- The API must accept requests from your Cloud Run/Storage domain

### Environment Variables
If you need environment variables, you can:
1. **Cloud Run**: Set them in the deployment command:
```bash
gcloud run deploy ap-dashboard \
  --set-env-vars "VITE_API_BASE_URL=https://172.30.113.15/api/v1" \
  ...
```

2. **Build-time**: Create a `.env.production` file:
```
VITE_API_BASE_URL=https://172.30.113.15/api/v1
```

---

## Quick Deploy Script

Save this as `deploy-gcp.sh`:

```bash
#!/bin/bash

# Build the app
npm run build

# Build and push Docker image
gcloud builds submit -f Dockerfile.nginx --tag gcr.io/focus-cumulus-477711-g5/ap-dashboard:nginx

# Deploy to Cloud Run
gcloud run deploy ap-dashboard \
  --image gcr.io/focus-cumulus-477711-g5/ap-dashboard:nginx \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 80 \
  --memory 256Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10

echo "✅ Deployment complete!"
```

Make it executable:
```bash
chmod +x deploy-gcp.sh
./deploy-gcp.sh
```

---

## Troubleshooting

### CORS Issues
If you get CORS errors, the API server needs to allow your domain:
- Add your Cloud Run URL to CORS allowed origins
- Or use a VPC connector if the API is internal

### 404 Errors on Refresh
- Cloud Run with nginx: Already handled by `nginx.conf`
- Cloud Storage: Make sure `index.html` is set as error page
- Firebase: Configured automatically

### API Not Accessible
- Users must connect to VPN before accessing the app
- The API server must allow requests from browser origins

