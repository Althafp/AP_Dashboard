# 🚀 Quick Setup Guide - EMS Dashboard

## Prerequisites Check

Before starting, make sure you have:
- ✅ Node.js 16+ installed
- ✅ npm or yarn installed
- ✅ Your Bearer Token ready
- ✅ API endpoint URL

## Step-by-Step Installation

### 1. Install Dependencies

Open your terminal in the project directory and run:

```bash
npm install
```

This will install all required packages including:
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- React Router
- Axios
- and more...

### 2. Configure Environment

Create a `.env` file in the project root (if not already created):

```env
VITE_API_BASE_URL=http://your-api-url:port/api
```

Replace `http://your-api-url:port/api` with your actual API endpoint.

### 3. Start Development Server

```bash
npm run dev
```

The application will start at: **http://localhost:3000**

### 4. Login

1. Navigate to http://localhost:3000
2. You'll be redirected to the login page
3. Enter your **Bearer Token**
4. Click **Login**

If successful, you'll be redirected to the Overview Dashboard!

## 📊 Application Flow

Once logged in, you can navigate through:

1. **Overview Dashboard** (`/`)
   - See KPI cards (Total, Up, Down, Warning, Unknown)
   - View status distribution pie chart
   - Check severity bar chart
   - Browse recent monitor activity

2. **Monitors** (`/monitors`)
   - Search and filter monitors
   - View status and severity
   - Click "View Details" to see more

3. **Monitor Details** (`/monitors/:id`)
   - See monitor status and info
   - View instances table
   - Check last poll information
   - Click "View Performance" for charts

4. **Performance** (`/performance`)
   - Select dashboards (CPU, Network, Server Health, Database)
   - View widget grid with charts
   - Click any widget for detailed view

5. **Widget Detail** (`/widgets/:id`)
   - Large interactive charts
   - Select time range (1h, 24h, 7d, 30d)
   - View statistics
   - Export to CSV/PDF
   - See raw metrics table

6. **Analytics** (`/analytics`)
   - Enter monitor IDs
   - Select metrics and aggregator
   - Choose date range
   - Click "Analyze"
   - View trends and insights

7. **Alerts** (`/alerts`)
   - View all alerts
   - Filter by severity and status
   - Acknowledge alerts
   - See alert distribution

## 🔧 Common Issues & Solutions

### Issue: API Connection Failed

**Solution:**
- Check `.env` file has correct `VITE_API_BASE_URL`
- Verify API server is running
- Check bearer token is valid
- Ensure no CORS issues

### Issue: Login Not Working

**Solution:**
- Verify bearer token is correct
- Check API endpoint responds to `/query/objects`
- Open browser console for error messages

### Issue: Charts Not Showing

**Solution:**
- Wait for data to load (spinner will show)
- Check browser console for errors
- Verify API endpoints return data

### Issue: Build Errors

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Clear build cache
rm -rf dist
npm run build
```

## 📱 Testing on Different Devices

The dashboard is responsive! Test on:

- Desktop: Works great on 1920px+ screens
- Laptop: Optimized for 1280px+
- Tablet: Responsive on 768px+
- Mobile: Accessible on 320px+

## 🎨 Customization

### Change Primary Color

Edit `tailwind.config.js`:

```js
primary: {
  500: '#0ea5e9',  // Change this
  600: '#0284c7',  // And this
  // ... other shades
}
```

### Change API Timeout

Edit `src/services/api.ts`:

```typescript
this.api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,  // Add this (10 seconds)
  // ...
});
```

### Add New Pages

1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation link in `src/components/Layout.tsx`

## 🏗️ Build for Production

When ready to deploy:

```bash
npm run build
```

The production files will be in the `dist/` folder.

### Deploy to Vercel:

```bash
npm install -g vercel
vercel
```

### Deploy to Netlify:

```bash
npm install -g netlify-cli
netlify deploy --prod
```

## 📞 Need Help?

If you encounter issues:

1. Check the browser console (F12)
2. Review the README.md
3. Verify all environment variables
4. Ensure API server is accessible
5. Check bearer token validity

## 🎉 You're All Set!

Enjoy your comprehensive EMS Dashboard with:
- ✨ Beautiful UI
- 📊 Interactive charts
- 🔍 Powerful filtering
- 📈 Performance analytics
- 🔔 Alert management
- 📱 Responsive design

Happy monitoring! 🚀

