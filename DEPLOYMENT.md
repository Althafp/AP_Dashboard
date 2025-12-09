# Deployment Guide

## Vercel Deployment

This application is deployed on Vercel and requires **VPN access** to work properly.

### How It Works

- **Development**: Uses Vite proxy (`/api` → `https://172.30.113.15/api/v1`)
- **Production**: Makes API calls directly from the browser to `https://172.30.113.15/api/v1`

### VPN Requirement

The API server at `https://172.30.113.15` is only accessible via VPN. When deployed on Vercel:

1. **Vercel server does NOT have VPN** - it cannot access the API
2. **User's browser makes API calls directly** - if the user has VPN, it works!

### User Experience

- ✅ **User has VPN**: All API calls work perfectly
- ❌ **User doesn't have VPN**: API calls will fail (expected behavior)

### Configuration

The app automatically detects environment:
- `import.meta.env.DEV === true` → Uses proxy (development)
- `import.meta.env.DEV === false` → Uses direct API URL (production)

### API Configuration

Located in `src/services/api.ts`:
```typescript
const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = isDevelopment 
  ? '/api'  // Development: use Vite proxy
  : 'https://172.30.113.15/api/v1';  // Production: direct from browser
```

### Troubleshooting

If API calls fail in production:
1. Check if user has VPN connected
2. Verify VPN can access `https://172.30.113.15`
3. Check browser console for CORS errors (may need API server to allow CORS from Vercel domain)

