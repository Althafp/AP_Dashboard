# PowerShell script to deploy to GCP Cloud Run (without server.js)

Write-Host "🚀 Building React app..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build complete!" -ForegroundColor Green
Write-Host ""

Write-Host "🐳 Building and pushing Docker image..." -ForegroundColor Cyan
# Use cloudbuild.yaml for build (tag is specified in cloudbuild.yaml)
gcloud builds submit --config cloudbuild.yaml .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker image pushed!" -ForegroundColor Green
Write-Host ""

Write-Host "☁️  Deploying to Cloud Run..." -ForegroundColor Cyan
gcloud run deploy ap-dashboard `
  --image gcr.io/focus-cumulus-477711-g5/ap-dashboard:nginx `
  --platform managed `
  --region asia-south1 `
  --allow-unauthenticated `
  --port 80 `
  --memory 256Mi `
  --cpu 1 `
  --timeout 300 `
  --max-instances 10

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "Your app is now live on Cloud Run!" -ForegroundColor Green

