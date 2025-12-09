# 🔌 API Endpoints Reference

Quick reference for all API endpoints used in the EMS Dashboard.

## 🔐 Authentication

All requests require Bearer token in the Authorization header:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

## 📊 Monitor Endpoints

### Get All Monitors
```http
GET /query/objects
```
Returns all monitors with their current status and metadata.

**Response:**
```typescript
Monitor[] {
  id: string
  name: string
  type: string
  status: 'Up' | 'Down' | 'Warning' | 'Unreachable' | 'Unknown'
  severity: 'Critical' | 'Major' | 'Warning' | 'Clear'
  lastPollTime: string (ISO date)
  group: string
}
```

### Filter by Status
```http
GET /query/objects/status?status={status}
```
**Parameters:**
- `status`: Up, Down, Warning, Unreachable, Unknown

### Filter by Severity
```http
GET /query/objects/severity?severity={severity}
```
**Parameters:**
- `severity`: Critical, Major, Warning, Clear

### Get Monitor Details
```http
GET /query/objects/:id
```
Returns detailed information for a specific monitor.

### Get Monitor Status
```http
GET /query/objects/:id/status
```
Returns current status summary for a monitor.

### Get Monitor Instances
```http
GET /query/objects/:id/instances
```
**Response:**
```typescript
MonitorInstance[] {
  id: string
  name: string
  status: MonitorStatus
  metricCount: number
  lastUpdated: string (ISO date)
}
```

### Get Poll Information
```http
GET /query/objects/:id/poll-info
```
**Response:**
```typescript
PollInfo[] {
  metricGroup: string
  lastPollTime: string (ISO date)
  values: Record<string, any>
}
```

### Get Monitor Group
```http
GET /query/objects/:id/group
```
Returns group information for a monitor.

## 📈 Visualization Endpoints

### List Dashboards
```http
GET /visualization/dashboards
```
**Response:**
```typescript
Dashboard[] {
  id: string
  name: string
  description?: string
}
```

### Get Dashboard Widgets
```http
GET /visualization/dashboards/:id
```
Returns all widgets for a specific dashboard.

**Response:**
```typescript
Widget[] {
  id: string
  title: string
  type: 'line' | 'area' | 'bar' | 'pie' | 'gauge' | 'heatmap' | 'donut'
  dashboardId: string
}
```

### Get Widget Details
```http
GET /visualization/widgets/:id
```
Returns metadata for a specific widget.

### Get Widget Data
```http
GET /query/visualization/:widgetId
```
Returns real-time KPI values for a widget.

**Response:**
```typescript
WidgetData {
  widgetId: string
  data: any
  timestamp: string (ISO date)
}
```

## 📊 Metrics & Analytics

### Historical Metric Analysis
```http
POST /query/metric/histogram
```

**Request Body:**
```typescript
{
  monitorIds: string[]
  metricNames: string[]
  aggregator: 'avg' | 'min' | 'max' | 'sum'
  timeRange: {
    start: string (ISO date)
    end: string (ISO date)
  }
}
```

**Response:**
```typescript
Metric[] {
  timestamp: string (ISO date)
  value: number
  status: MonitorStatus
  instance: string
}
```

## 🔔 Alert Endpoints

### Get Alerts by Severity
```http
GET /query/objects/severity
```
Returns all alerts.

**With filter:**
```http
GET /query/objects/severity?severity={severity}
```

**Response:**
```typescript
Alert[] {
  id: string
  monitorId: string
  monitorName: string
  severity: Severity
  message: string
  timestamp: string (ISO date)
  acknowledged: boolean
}
```

## 📋 Usage Examples

### JavaScript/TypeScript (Axios)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://your-api-url/api',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Get all monitors
const monitors = await api.get('/query/objects');

// Filter by status
const downMonitors = await api.get('/query/objects/status?status=Down');

// Get monitor details
const monitor = await api.get('/query/objects/12345');

// Historical analysis
const metrics = await api.post('/query/metric/histogram', {
  monitorIds: ['monitor-1', 'monitor-2'],
  metricNames: ['cpu', 'memory'],
  aggregator: 'avg',
  timeRange: {
    start: '2024-01-01T00:00:00Z',
    end: '2024-01-07T23:59:59Z'
  }
});
```

### cURL Examples

```bash
# Get all monitors
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://your-api-url/api/query/objects

# Get down monitors
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://your-api-url/api/query/objects/status?status=Down

# Get monitor details
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://your-api-url/api/query/objects/12345

# Historical analysis
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "monitorIds": ["monitor-1"],
       "metricNames": ["cpu"],
       "aggregator": "avg",
       "timeRange": {
         "start": "2024-01-01T00:00:00Z",
         "end": "2024-01-07T23:59:59Z"
       }
     }' \
     http://your-api-url/api/query/metric/histogram
```

## 🔍 Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "error": "Invalid or expired token"
}
```
**Solution:** Refresh bearer token and login again.

#### 404 Not Found
```json
{
  "error": "Resource not found"
}
```
**Solution:** Verify the resource ID exists.

#### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Detailed error message"
}
```
**Solution:** Check API logs, contact administrator.

## 🌐 CORS Configuration

If you encounter CORS errors, ensure your API server has proper CORS headers:

```javascript
// Example Express.js CORS config
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## 📝 Notes

1. All timestamps are in ISO 8601 format
2. All endpoints require bearer token authentication
3. Rate limiting may apply (check with your API provider)
4. Some endpoints support pagination (check API docs)
5. Response data may include additional fields not listed here

## 🔗 Where Endpoints are Used

| Endpoint | Used In | Purpose |
|----------|---------|---------|
| `GET /query/objects` | Overview, MonitorList | Display all monitors |
| `GET /query/objects/status` | Overview (on click), MonitorList | Filter by status |
| `GET /query/objects/severity` | MonitorList, Alerts | Filter by severity |
| `GET /query/objects/:id` | MonitorDetails | Show monitor info |
| `GET /query/objects/:id/instances` | MonitorDetails | Show instances |
| `GET /query/objects/:id/poll-info` | MonitorDetails | Show poll data |
| `GET /visualization/dashboards` | Performance | List dashboards |
| `GET /visualization/dashboards/:id` | Performance | Load widgets |
| `GET /query/visualization/:widgetId` | Performance, WidgetDetail | Get widget data |
| `POST /query/metric/histogram` | Analytics, WidgetDetail | Historical analysis |

## 🎯 Testing Endpoints

You can test endpoints using:

1. **Browser DevTools** - Network tab
2. **Postman** - API testing tool
3. **cURL** - Command line
4. **Insomnia** - REST client
5. **Thunder Client** - VS Code extension

---

**💡 Tip:** Keep this reference handy while developing or debugging!

