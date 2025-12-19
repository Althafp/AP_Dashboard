import axios, { AxiosInstance } from 'axios';
import type {
  Monitor,
  MonitorInstance,
  PollInfo,
  Dashboard,
  Widget,
  WidgetData,
  Metric,
  HistogramRequest,
  StatusSummary,
  SeveritySummary,
  Alert,
} from '../types';

// Use relative /api path which will be proxied:
// - In development: Vite proxy forwards to https://223.196.186.236/api/v1
// - In production (Vercel): Serverless function proxies to https://223.196.186.236/api/v1
// Set VITE_API_BASE_URL only if you want to bypass the proxy (not recommended)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Hardcoded bearer token (safe because VPN is required)
const BEARER_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzUxMiJ9.eyJ1c2VyLm5hbWUiOiJBbHRoYWYiLCJpZCI6OTIzMjM4NTI0ODcsInRva2VuLnR5cGUiOiJQZXJzb25hbCBBY2Nlc3MgVG9rZW4iLCJwZXJtaXNzaW9ucyI6WyJ1c2VyLXNldHRpbmdzOnJlYWQiLCJ1c2VyLXNldHRpbmdzOnJlYWQtd3JpdGUiLCJ1c2VyLXNldHRpbmdzOmRlbGV0ZSIsInN5c3RlbS1zZXR0aW5nczpyZWFkIiwic3lzdGVtLXNldHRpbmdzOnJlYWQtd3JpdGUiLCJzeXN0ZW0tc2V0dGluZ3M6ZGVsZXRlIiwiZGlzY292ZXJ5LXNldHRpbmdzOnJlYWQiLCJkaXNjb3Zlcnktc2V0dGluZ3M6cmVhZC13cml0ZSIsImRpc2NvdmVyeS1zZXR0aW5nczpkZWxldGUiLCJtb25pdG9yLXNldHRpbmdzOnJlYWQiLCJtb25pdG9yLXNldHRpbmdzOnJlYWQtd3JpdGUiLCJtb25pdG9yLXNldHRpbmdzOmRlbGV0ZSIsImdyb3VwLXNldHRpbmdzOnJlYWQiLCJncm91cC1zZXR0aW5nczpyZWFkLXdyaXRlIiwiZ3JvdXAtc2V0dGluZ3M6ZGVsZXRlIiwiYWdlbnQtc2V0dGluZ3M6cmVhZCIsImFnZW50LXNldHRpbmdzOnJlYWQtd3JpdGUiLCJhZ2VudC1zZXR0aW5nczpkZWxldGUiLCJzbm1wLXRyYXAtc2V0dGluZ3M6cmVhZCIsInNubXAtdHJhcC1zZXR0aW5nczpyZWFkLXdyaXRlIiwic25tcC10cmFwLXNldHRpbmdzOmRlbGV0ZSIsInBsdWdpbi1saWJyYXJ5LXNldHRpbmdzOnJlYWQiLCJwbHVnaW4tbGlicmFyeS1zZXR0aW5nczpyZWFkLXdyaXRlIiwicGx1Z2luLWxpYnJhcnktc2V0dGluZ3M6ZGVsZXRlIiwiYXVkaXQtc2V0dGluZ3M6cmVhZCIsIm15LWFjY291bnQtc2V0dGluZ3M6cmVhZCIsIm15LWFjY291bnQtc2V0dGluZ3M6cmVhZC13cml0ZSIsIm5vdGlmaWNhdGlvbi1zZXR0aW5nczpyZWFkIiwiZGFzaGJvYXJkczpyZWFkLXdyaXRlIiwiZGFzaGJvYXJkczpkZWxldGUiLCJkYXNoYm9hcmRzOnJlYWQiLCJpbnZlbnRvcnk6cmVhZC13cml0ZSIsImludmVudG9yeTpkZWxldGUiLCJpbnZlbnRvcnk6cmVhZCIsInRlbXBsYXRlczpyZWFkLXdyaXRlIiwidGVtcGxhdGVzOmRlbGV0ZSIsInRlbXBsYXRlczpyZWFkIiwid2lkZ2V0czpyZWFkLXdyaXRlIiwid2lkZ2V0czpkZWxldGUiLCJ3aWRnZXRzOnJlYWQiLCJwb2xpY3ktc2V0dGluZ3M6cmVhZC13cml0ZSIsInBvbGljeS1zZXR0aW5nczpkZWxldGUiLCJwb2xpY3ktc2V0dGluZ3M6cmVhZCIsImZsb3ctc2V0dGluZ3M6cmVhZCIsImZsb3ctc2V0dGluZ3M6cmVhZC13cml0ZSIsImZsb3ctc2V0dGluZ3M6ZGVsZXRlIiwibG9nLXNldHRpbmdzOnJlYWQiLCJsb2ctc2V0dGluZ3M6cmVhZC13cml0ZSIsImxvZy1zZXR0aW5nczpkZWxldGUiLCJhaW9wcy1zZXR0aW5nczpyZWFkIiwiYWlvcHMtc2V0dGluZ3M6cmVhZC13cml0ZSIsImFpb3BzLXNldHRpbmdzOmRlbGV0ZSIsImxvZy1leHBsb3JlcjpyZWFkIiwibG9nLWV4cGxvcmVyOnJlYWQtd3JpdGUiLCJsb2ctZXhwbG9yZXI6ZGVsZXRlIiwiZmxvdy1leHBsb3JlcjpyZWFkIiwiYWxlcnQtZXhwbG9yZXI6cmVhZCIsInRyYXAtZXhwbG9yZXI6cmVhZCIsInRvcG9sb2d5OnJlYWQiLCJ0b3BvbG9neTpyZWFkLXdyaXRlIiwidG9wb2xvZ3k6ZGVsZXRlIiwicmVwb3J0czpyZWFkIiwicmVwb3J0czpyZWFkLXdyaXRlIiwicmVwb3J0czpkZWxldGUiLCJjb25maWc6cmVhZCIsImNvbmZpZzpyZWFkLXdyaXRlIiwiY29uZmlnOmRlbGV0ZSIsImFsZXJ0LWV4cGxvcmVyOnJlYWQtd3JpdGUiLCJpbnRlZ3JhdGlvbnM6cmVhZCIsImludGVncmF0aW9uczpyZWFkLXdyaXRlIiwiaW50ZWdyYXRpb25zOmRlbGV0ZSIsImNvbXBsaWFuY2Utc2V0dGluZ3M6cmVhZC13cml0ZSIsImNvbXBsaWFuY2Utc2V0dGluZ3M6ZGVsZXRlIiwiY29tcGxpYW5jZS1zZXR0aW5nczpyZWFkIiwidHJhY2U6cmVhZCIsInRyYWNlOnJlYWQtd3JpdGUiLCJ0YWctcnVsZXM6cmVhZCIsInRhZy1ydWxlczpyZWFkLXdyaXRlIiwidGFnLXJ1bGVzOmRlbGV0ZSIsIm5ldHJvdXRlLXNldHRpbmdzOnJlYWQiLCJuZXRyb3V0ZS1zZXR0aW5nczpyZWFkLXdyaXRlIiwibmV0cm91dGUtc2V0dGluZ3M6ZGVsZXRlIiwibmV0cm91dGUtZXhwbG9yZXI6cmVhZCIsInNsby1zZXR0aW5nczpyZWFkIiwic2xvLXNldHRpbmdzOnJlYWQtd3JpdGUiLCJzbG8tc2V0dGluZ3M6ZGVsZXRlIiwibWV0cmljLWV4cGxvcmVyczpyZWFkIiwibWV0cmljLWV4cGxvcmVyczpyZWFkLXdyaXRlIiwibWV0cmljLWV4cGxvcmVyczpkZWxldGUiLCJxdWVyeTpyZWFkIiwicXVlcnk6cmVhZC13cml0ZSIsImhlYWx0aC1tb25pdG9yaW5nOnJlYWQiLCJoZWFsdGgtbW9uaXRvcmluZzpyZWFkLXdyaXRlIiwiZG5zLXNlcnZlci1zZXR0aW5nczpyZWFkIiwiZG5zLXNlcnZlci1zZXR0aW5nczpyZWFkLXdyaXRlIiwiZG5zLXNlcnZlci1zZXR0aW5nczpkZWxldGUiLCJxdWVyeTpyZWFkIiwicXVlcnk6cmVhZC13cml0ZSIsInVzZXI6cmVhZC13cml0ZSIsInRva2VuOnJlYWQtd3JpdGUiXSwiaWF0IjoxNzY1MTk3ODExLCJleHAiOjE3NzI5NzM4MTEsImlzcyI6Ik1vdGFkYXRhIiwic3ViIjoiTW90YWRhdGEgQVBJIHYxIn0.gDpwLZCpNLK7fBoosu9ELLkNjg5W20eWT1jML5VGvq1I5JEef20MC15Hpfk2WjThbrMTtXXCe8gVr1S6zpJp9aMvAF-ZVH8IX1aI6P4BgCnGBpwe2SMg3H9Sgd9J4xNOTx1Hqp2twg5LCnHtu-bA43KFnKkIFGwM5QEJmC0Bt1CfPE3A-OQNJjWNIoqe6CGEwclP1S5xUI8F6s6hrDmg7KCM_tqf2JjGKNrF6ZmxSAa7fNNhUZ1UJ5kNbN8nrYwkcEp_X63lSkVS09JTmWdRie4BilQgvks1DLmdet8WaknxhYBtJABDJQ5UHdXEGQcrnON84nIjWH3ir8R-aFs88hBEowYqZIAzo89v8ghtDwTt_jduVB0i8HOSnavF-tRkuQg5PomOS2xjrtVAWhq_whUcqYteUf3bNGjmB3C416D4y6IEllltvzsFu0ajTagphr5IxQpdrfM3fl9Ln0n0IEFKlfZ78W6VcFdYNj2z0NKQt0_-71XfHu6t73AP9pzoPTRDq0_C9ky4wVsZLSQe9oGharicIRKk_1jCIvjNfYimYSgs7c1VYdMXjt1TApOF8rnMpmwkQSmrn2rHTK93bsiIieDg8D4qys6gX8eCAoCY0tpdeIrx3zib2kkkei6xI-Zvm_5VhcOtvo6LMSsDngxZ1DdIWTgGJOm7ZDG369A";

class ApiService {
  private api: AxiosInstance;

  constructor() {
    // Set the required cookie in the browser
    // Browsers don't allow setting Cookie header directly, so we set it via document.cookie
    document.cookie = 'client.id=Q5VZ97naQhyLIH0Vz4MSXvzbMyCYTjPwz+1hVJ643pA=; path=/';
    
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${BEARER_TOKEN}`, // Hardcoded bearer token
      },
      withCredentials: true, // Allow cookies to be sent automatically
      // Disable SSL verification for self-signed certificates (like your Python test)
      // Note: In production, you should use proper SSL certificates
      // @ts-ignore
      rejectUnauthorized: false,
    });

    // Add request interceptor to always include bearer token
    this.api.interceptors.request.use(
      (config) => {
        // Always use hardcoded bearer token
        config.headers.Authorization = `Bearer ${BEARER_TOKEN}`;
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        // Don't redirect to login on 401 - just log the error
        if (error.response?.status === 401) {
          console.error('API authentication error:', error);
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication - now uses username/password, bearer token is hardcoded
  async login(username: string, password: string): Promise<boolean> {
    try {
      // Validate username/password against credentials
      // Hardcoded credentials (safe because VPN is required)
      const validUsers = [
        { username: 'MATRIX1', password: 'APCCTV' },
        { username: 'MATRIX2', password: 'APCCTV' },
        { username: 'MATRIX3', password: 'APCCTV' },
      ];
      
      const user = validUsers.find(
        (u) => u.username === username && u.password === password
      );
      
      if (!user) {
        throw new Error('Invalid username or password');
      }
      
      // Store username for display
      localStorage.setItem('username', username);
      // Bearer token is already hardcoded in constructor, no need to store
      
      // Test API access by fetching monitors
      await this.getAllMonitors();
      return true;
    } catch (error) {
      throw error;
    }
  }

  logout(): void {
    localStorage.removeItem('username');
  }

  // Public API access for custom calls
  getApi() {
    return this.api;
  }

  // Monitor Endpoints
  async getAllMonitors(): Promise<Monitor[]> {
    const response = await this.api.get('/query/objects');
    // API returns { result: [...] } format
    const monitors = response.data.result || response.data || [];
    
    // Map API fields to our format
    // NOTE: /query/objects doesn't return actual operational status (Up/Down)
    // object.state is just ENABLE/DISABLE (enabled/disabled), not operational status
    // So we don't set status here - it will be undefined and hidden in UI when "All Status" is selected
    return monitors.map((m: any) => ({
      ...m,
      id: m.id || m['object.id'],
      name: m['object.name'] || m.name,
      type: m['object.type'] || m.type,
      status: undefined, // Don't set static status - it's not accurate from /query/objects
      severity: 'Clear', // Default if not provided
      lastPollTime: m['object.modification.time'] || m['object.creation.time'] || new Date().toISOString(),
      group: m['object.groups']?.[0] || 'Default',
    }));
  }

  async getMonitorsByStatus(status: string): Promise<Monitor[]> {
    const response = await this.api.get(`/query/objects/status?status=${status}`);
    const monitors = response.data.result || response.data || [];
    
    // Map API fields to our format
    // IMPORTANT: Use actual status from API, not the filter value
    // The API returns monitors that match the status, but we should use their actual status
    return monitors.map((m: any) => {
      // Determine actual status from the monitor data
      // API might return status in different fields
      let actualStatus = status; // Default to filter status
      
      // Check if API provides status directly
      if (m.status) {
        actualStatus = m.status;
      } else if (m['object.state']) {
        // Map object.state to status
        actualStatus = m['object.state'] === 'ENABLE' ? 'Up' : 
                      m['object.state'] === 'DISABLE' ? 'Down' : 
                      m['object.state'];
      } else if (m.state) {
        actualStatus = m.state === 'ENABLE' ? 'Up' : 
                      m.state === 'DISABLE' ? 'Down' : 
                      m.state;
      }
      
      return {
        ...m,
        id: m.id || m['object.id'],
        name: m['object.name'] || m.name,
        type: m['object.type'] || m.type,
        status: actualStatus, // Use actual status from API, not forced filter value
        severity: m.severity || 'Clear',
        lastPollTime: m['object.modification.time'] || m['object.creation.time'] || new Date().toISOString(),
        group: m['object.groups']?.[0] || 'Default',
      };
    });
  }

  async getMonitorsBySeverity(severity: string): Promise<Monitor[]> {
    const response = await this.api.get(`/query/objects/severity?severity=${severity}`);
    return response.data.result || response.data || [];
  }

  async getMonitorById(id: string): Promise<Monitor> {
    const response = await this.api.get(`/query/objects/${id}`);
    // API might return { result: [{...}] } or { result: {...} } or just {...}
    let data = response.data.result;
    
    // Handle different response structures
    if (Array.isArray(data)) {
      data = data[0] || {};
    } else if (!data) {
      data = response.data || {};
    }
    
    console.log('getMonitorById - Raw API Response:', JSON.stringify(response.data, null, 2));
    console.log('getMonitorById - Extracted Data:', JSON.stringify(data, null, 2));
    
    // Map API fields to our format, but keep all original fields
    return {
      ...data, // Keep all original API fields
      id: data.id || data['object.id'] || id,
      name: data['object.name'] || data.name || 'Monitor',
      type: data['object.type'] || data.type || 'N/A',
      status: data['object.state'] === 'ENABLE' ? 'Up' : (data['object.state'] === 'DISABLE' ? 'Down' : data['object.state'] || 'Unknown'),
      severity: data.severity || 'Clear',
      lastPollTime: data['object.modification.time'] || data['object.creation.time'] || '',
      group: data['object.groups']?.[0] || 'Default',
    };
  }

  async getMonitorStatus(id: string): Promise<any> {
    const response = await this.api.get(`/query/objects/${id}/status`);
    // API returns { result: {...} } or { status: "...", ... }
    return response.data.result || response.data || {};
  }

  async getMonitorInstances(id: string): Promise<MonitorInstance[]> {
    const response = await this.api.get(`/query/objects/${id}/instances`);
    // Log the FULL API response to understand the structure
    console.log('Instances API - Full Response:', JSON.stringify(response.data, null, 2));
    
    // API can return different structures:
    // 1. { result: { interfaces: [...] } } - Most common
    // 2. { result: [...] } - Direct array
    // 3. { result: {} } - Empty object
    // 4. {} - Empty response
    
    const result = response.data.result;
    
    // Check if result has 'interfaces' property (most common case)
    if (result && typeof result === 'object' && 'interfaces' in result) {
      const interfaces = result.interfaces;
      if (Array.isArray(interfaces)) {
        console.log('Instances API - Found interfaces array with', interfaces.length, 'items');
        return interfaces;
      }
    }
    
    // Check if result is directly an array
    if (Array.isArray(result)) {
      console.log('Instances API - Result is array with', result.length, 'items');
      return result;
    }
    
    // Check if result is an empty object
    if (result && typeof result === 'object') {
      const keys = Object.keys(result);
      if (keys.length === 0) {
        console.log('Instances API - Empty result object, returning empty array');
        return [];
      }
      // If result has other properties, try to find any array property
      for (const key of keys) {
        if (Array.isArray(result[key])) {
          console.log(`Instances API - Found array in result.${key} with`, result[key].length, 'items');
          return result[key];
        }
      }
    }
    
    // Check if response.data itself is an array (no 'result' field)
    if (Array.isArray(response.data)) {
      console.log('Instances API - Response.data is array');
      return response.data;
    }
    
    // Default: return empty array
    console.log('Instances API - No instances found, returning empty array');
    return [];
  }

  async getMonitorPollInfo(id: string): Promise<PollInfo> {
    const response = await this.api.get(`/query/objects/${id}/poll-info`);
    // Log the FULL API response to understand the structure
    console.log('Poll Info API - Full Response:', JSON.stringify(response.data, null, 2));
    console.log('Poll Info API - Response Type:', typeof response.data);
    console.log('Poll Info API - Has result?', 'result' in response.data);
    
    // API returns { result: {...} } - single object with metric groups
    let pollInfo = response.data.result;
    
    // If no result field, use response.data directly
    if (pollInfo === undefined || pollInfo === null) {
      pollInfo = response.data;
    }
    
    // If still nothing, return empty object
    if (!pollInfo) {
      console.log('Poll Info API - No data, returning empty object');
      return {};
    }
    
    // Ensure it's an object, not an array
    if (Array.isArray(pollInfo)) {
      console.log('Poll Info API - Result is array, taking first item');
      return pollInfo.length > 0 ? pollInfo[0] : {};
    }
    
    console.log('Poll Info API - Returning object with keys:', Object.keys(pollInfo));
    return pollInfo;
  }

  async getMonitorGroup(id: string): Promise<any> {
    const response = await this.api.get(`/query/objects/${id}/group`);
    return response.data;
  }

  // Dashboard & Visualization Endpoints
  async getDashboards(): Promise<Dashboard[]> {
    const response = await this.api.get('/visualization/dashboards');
    const data = response.data.result || response.data || {};
    
    // API returns dashboards grouped by category
    // Extract all dashboards from all categories
    const allDashboards: Dashboard[] = [];
    
    for (const category in data) {
      if (Array.isArray(data[category])) {
        data[category].forEach((dashboard: any) => {
          allDashboards.push({
            id: dashboard.id?.toString() || dashboard['dashboard.name'],
            name: dashboard['dashboard.name'] || 'Unnamed Dashboard',
            description: dashboard['dashboard.category'] || 'No description',
            category: dashboard['dashboard.category'] || category,
          });
        });
      }
    }
    
    return allDashboards;
  }

  async getDashboardById(id: string): Promise<Widget[]> {
    const response = await this.api.get(`/visualization/dashboards/${id}`);
    return response.data.result || response.data || [];
  }

  async getWidgetData(widgetId: string): Promise<WidgetData> {
    const response = await this.api.get(`/query/visualization/${widgetId}`);
    return response.data;
  }

  async getWidgetById(id: string): Promise<Widget> {
    const response = await this.api.get(`/visualization/widgets/${id}`);
    return response.data;
  }

  // Metric Endpoints
  async getMetricHistogram(request: HistogramRequest): Promise<Metric[]> {
    const response = await this.api.post('/query/metric/histogram', request);
    return response.data;
  }

  // Status & Severity Summaries
  async getStatusSummary(): Promise<StatusSummary> {
    try {
      // Use the API's status filtering endpoints
      // Valid statuses: Up, Down, Unreachable, Maintenance, Disable, Unknown
      const [allMonitors, upMonitors, downMonitors, unreachableMonitors, maintenanceMonitors] = await Promise.all([
        this.api.get('/query/objects'),
        this.api.get('/query/objects/status?status=Up'),
        this.api.get('/query/objects/status?status=Down'),
        this.api.get('/query/objects/status?status=Unreachable'),
        this.api.get('/query/objects/status?status=Maintenance'),
      ]);

      const total = allMonitors.data.result?.length || 0;
      const up = upMonitors.data.result?.length || 0;
      const down = downMonitors.data.result?.length || 0;
      const unreachable = unreachableMonitors.data.result?.length || 0;
      const maintenance = maintenanceMonitors.data.result?.length || 0;

      return {
        total,
        up,
        down,
        warning: maintenance, // Treat maintenance as warning
        unreachable,
        unknown: total - up - down - unreachable - maintenance,
      };
    } catch (error) {
      console.error('Error getting status summary:', error);
      return { total: 0, up: 0, down: 0, warning: 0, unreachable: 0, unknown: 0 };
    }
  }

  async getSeveritySummary(): Promise<SeveritySummary> {
    const monitors = await this.getAllMonitors();
    return {
      critical: monitors.filter(m => m.severity === 'Critical').length,
      major: monitors.filter(m => m.severity === 'Major').length,
      warning: monitors.filter(m => m.severity === 'Warning').length,
      clear: monitors.filter(m => m.severity === 'Clear').length,
    };
  }

  // Alerts - Severity filtering requires a severity parameter
  async getAlertsBySeverity(severity?: string): Promise<Alert[]> {
    try {
      // API requires severity parameter, valid values: Clear, Major, Warning, Critical, Down, Unreachable
      const severityParam = severity || 'Critical';
      const response = await this.api.get(`/query/objects/severity?severity=${severityParam}`);
      const monitors = response.data.result || response.data || [];
      
      // Map to Alert format
      return monitors.map((m: any, index: number) => ({
        id: `alert-${m.id || index}`,
        monitorId: m.id || m['object.id'],
        monitorName: m['object.name'] || m.name || 'Unknown',
        severity: severityParam as any,
        message: `${m['object.type'] || 'Monitor'} alert`,
        timestamp: m['object.modification.time'] || m['object.creation.time'] || new Date().toISOString(),
        acknowledged: false,
      }));
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
  }
}

export const apiService = new ApiService();

