# EMS Dashboard

🚀 **Enterprise Monitoring System Dashboard** - A comprehensive monitoring solution built with React, TypeScript, and modern web technologies.

## 🎯 Features

### Complete Monitoring Workflow

- **🔐 Authentication** - Secure login with bearer token
- **📊 Overview Dashboard** - Real-time KPIs, status distribution, and severity metrics
- **📝 Monitor Management** - List, search, and filter all monitors
- **🔍 Detailed Monitoring** - Deep dive into monitor instances and poll data
- **📈 Performance Dashboard** - Multi-dashboard widget system with customizable views
- **📉 Widget Analytics** - Drill-down charts with time-series analysis
- **🔬 Historical Analytics** - Custom metric analysis with statistical insights
- **🔔 Alert Management** - Comprehensive alert tracking and acknowledgment

### Technical Stack

- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Beautiful data visualizations
- **React Router** - Client-side routing
- **Axios** - HTTP client with interceptors
- **date-fns** - Date manipulation

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ or higher
- npm or yarn
- Bearer token for API authentication

### Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Configure environment variables:**

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://your-api-url/api
```

3. **Start the development server:**

```bash
npm run dev
```

The application will open at `http://localhost:3000`

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🏗️ Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── Layout.tsx     # Main layout with sidebar
│   └── ProtectedRoute.tsx  # Route protection
├── context/          # React context providers
│   └── AuthContext.tsx     # Authentication context
├── pages/            # Application pages
│   ├── Login.tsx           # Login page
│   ├── Overview.tsx        # Main dashboard
│   ├── MonitorList.tsx     # Monitor list with filters
│   ├── MonitorDetails.tsx  # Monitor detail view
│   ├── Performance.tsx     # Performance dashboard
│   ├── WidgetDetail.tsx    # Widget drill-down
│   ├── Analytics.tsx       # Historical analytics
│   └── Alerts.tsx          # Alert management
├── services/         # API services
│   └── api.ts        # API client with bearer auth
├── types/            # TypeScript type definitions
│   └── index.ts      # All type definitions
├── App.tsx           # Main app component with routing
├── main.tsx          # Application entry point
└── index.css         # Global styles

## 🔑 Authentication

The application uses bearer token authentication:

1. Navigate to the login page
2. Enter your bearer token
3. The token is stored in localStorage
4. All API requests include the token in the Authorization header

## 📊 API Integration

The application integrates with the following endpoints:

### Monitor Endpoints
- `GET /query/objects` - Get all monitors
- `GET /query/objects/status?status={status}` - Filter by status
- `GET /query/objects/severity?severity={severity}` - Filter by severity
- `GET /query/objects/:id` - Get monitor details
- `GET /query/objects/:id/instances` - Get monitor instances
- `GET /query/objects/:id/poll-info` - Get poll information

### Dashboard & Visualization
- `GET /visualization/dashboards` - List dashboards
- `GET /visualization/dashboards/:id` - Get dashboard widgets
- `GET /visualization/widgets/:id` - Get widget details
- `GET /query/visualization/:widgetId` - Get widget data

### Metrics & Analytics
- `POST /query/metric/histogram` - Historical metric analysis

## 🎨 UI Components

### Overview Dashboard
- KPI cards showing total monitors, up/down/warning counts
- Pie chart for status distribution
- Bar chart for severity levels
- Recent activity feed

### Monitor List
- Searchable and filterable table
- Status indicators with color coding
- Severity badges
- Click-through to details

### Monitor Details
- Status badge and severity chip
- Instance table with metrics
- Last poll information panels
- Performance dashboard link

### Performance Dashboard
- Dashboard selector
- Widget grid with mini charts
- Click-through to detailed views
- Real-time data updates

### Widget Detail View
- Large interactive charts
- Time range selector (1h, 24h, 7d, 30d)
- Statistical summary
- Export to CSV/PDF
- Raw metrics table

### Analytics
- Custom query builder
- Multi-monitor comparison
- Statistical insights
- Trend analysis charts
- Anomaly detection

### Alerts
- Alert distribution charts
- Severity and status filters
- Acknowledgment system
- Real-time alert feed

## 🔧 Configuration

### API Base URL

Update `VITE_API_BASE_URL` in `.env` file to point to your API server.

### Customization

- **Colors**: Modify `tailwind.config.js` for custom color schemes
- **Charts**: Customize chart options in component files
- **Layouts**: Adjust grid layouts in page components

## 📱 Responsive Design

The dashboard is fully responsive and works on:
- Desktop (1920px+)
- Laptop (1280px+)
- Tablet (768px+)
- Mobile (320px+)

## 🚀 Deployment

### Build for production:

```bash
npm run build
```

The `dist/` folder contains the production-ready files.

### Deploy to:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Any static hosting service

## 🔒 Security

- Bearer token authentication
- Protected routes
- Token stored in localStorage
- Automatic logout on 401 errors
- Request/response interceptors

## 🐛 Troubleshooting

### API Connection Issues
- Verify `VITE_API_BASE_URL` is correct
- Check bearer token validity
- Ensure CORS is configured on API server

### Build Issues
- Clear `node_modules` and reinstall
- Delete `dist/` folder
- Check Node.js version

## 📝 License

ISC

## 👥 Support

For issues or questions, please contact your system administrator.

---

**Built with ❤️ for enterprise monitoring**

