import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Cpu, HardDrive, Network, Activity } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiService } from '../services/api';
import type { Dashboard, Widget } from '../types';

export const Performance: React.FC = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<string>('');
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [widgetDataMap, setWidgetDataMap] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboards();
  }, []);

  useEffect(() => {
    if (selectedDashboard) {
      loadWidgets(selectedDashboard);
    }
  }, [selectedDashboard]);

  const loadDashboards = async () => {
    try {
      const data = await apiService.getDashboards();
      const dashboardArray = Array.isArray(data) ? data : [];
      setDashboards(dashboardArray);
      if (dashboardArray.length > 0) {
        setSelectedDashboard(dashboardArray[0].id);
      }
    } catch (error) {
      console.error('Error loading dashboards:', error);
      // Mock data for demo
      const mockDashboards = [
        { id: '1', name: 'CPU Dashboard', description: 'CPU performance metrics' },
        { id: '2', name: 'Network Dashboard', description: 'Network traffic metrics' },
        { id: '3', name: 'Server Health Dashboard', description: 'Overall server health' },
        { id: '4', name: 'Database Dashboard', description: 'Database performance' },
      ];
      setDashboards(mockDashboards);
      setSelectedDashboard(mockDashboards[0].id);
    } finally {
      setLoading(false);
    }
  };

  const loadWidgets = async (dashboardId: string) => {
    try {
      const widgetList = await apiService.getDashboardById(dashboardId);
      setWidgets(widgetList);
      
      // Load data for each widget
      const dataMap = new Map();
      for (const widget of widgetList) {
        try {
          const data = await apiService.getWidgetData(widget.id);
          dataMap.set(widget.id, data);
        } catch (error) {
          console.error(`Error loading widget ${widget.id}:`, error);
        }
      }
      setWidgetDataMap(dataMap);
    } catch (error) {
      console.error('Error loading widgets:', error);
      // Mock widgets
      const mockWidgets = generateMockWidgets(dashboardId);
      setWidgets(mockWidgets);
      
      // Generate mock data
      const dataMap = new Map();
      mockWidgets.forEach(widget => {
        dataMap.set(widget.id, generateMockData());
      });
      setWidgetDataMap(dataMap);
    }
  };

  const generateMockWidgets = (dashboardId: string): Widget[] => {
    const widgetsByDashboard: Record<string, Widget[]> = {
      '1': [
        { id: 'cpu-1', title: 'CPU Usage', type: 'area', dashboardId },
        { id: 'cpu-2', title: 'CPU by Core', type: 'bar', dashboardId },
        { id: 'cpu-3', title: 'CPU Trend', type: 'line', dashboardId },
        { id: 'cpu-4', title: 'Load Average', type: 'line', dashboardId },
      ],
      '2': [
        { id: 'net-1', title: 'Network Traffic', type: 'line', dashboardId },
        { id: 'net-2', title: 'Bandwidth Usage', type: 'area', dashboardId },
        { id: 'net-3', title: 'Packets per Second', type: 'bar', dashboardId },
        { id: 'net-4', title: 'Connection Status', type: 'pie', dashboardId },
      ],
      '3': [
        { id: 'health-1', title: 'Memory Usage', type: 'area', dashboardId },
        { id: 'health-2', title: 'Disk IO', type: 'bar', dashboardId },
        { id: 'health-3', title: 'System Uptime', type: 'line', dashboardId },
        { id: 'health-4', title: 'Process Count', type: 'line', dashboardId },
      ],
      '4': [
        { id: 'db-1', title: 'Query Performance', type: 'line', dashboardId },
        { id: 'db-2', title: 'Connection Pool', type: 'area', dashboardId },
        { id: 'db-3', title: 'Transaction Rate', type: 'bar', dashboardId },
        { id: 'db-4', title: 'Cache Hit Ratio', type: 'line', dashboardId },
      ],
    };
    return widgetsByDashboard[dashboardId] || [];
  };

  const generateMockData = () => {
    const data = [];
    for (let i = 0; i < 24; i++) {
      data.push({
        time: `${i}:00`,
        value: Math.random() * 100,
        incoming: Math.random() * 1000,
        outgoing: Math.random() * 800,
      });
    }
    return data;
  };

  const renderWidget = (widget: Widget) => {
    const data = widgetDataMap.get(widget.id);
    if (!data) return null;

    const getIcon = () => {
      if (widget.title.includes('CPU')) return <Cpu className="h-5 w-5" />;
      if (widget.title.includes('Network')) return <Network className="h-5 w-5" />;
      if (widget.title.includes('Disk')) return <HardDrive className="h-5 w-5" />;
      return <Activity className="h-5 w-5" />;
    };

    return (
      <div key={widget.id} className="card hover:shadow-lg transition-shadow cursor-pointer"
           onClick={() => navigate(`/widgets/${widget.id}`)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            {getIcon()}
            <span className="ml-2">{widget.title}</span>
          </h3>
          <BarChart3 className="h-5 w-5 text-gray-400" />
        </div>

        {widget.type === 'line' ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : widget.type === 'area' ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#0ea5e9" fill="#bae6fd" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Current</span>
            <span className="font-semibold text-gray-900">
              {data[data.length - 1]?.value?.toFixed(2) || 'N/A'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
        <p className="text-gray-600 mt-1">Monitor system performance metrics in real-time</p>
      </div>

      {/* Dashboard Selector */}
      <div className="card">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Dashboard
        </label>
        <select
          value={selectedDashboard}
          onChange={(e) => setSelectedDashboard(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          {dashboards.map((dashboard) => (
            <option key={dashboard.id} value={dashboard.id}>
              {dashboard.name}
            </option>
          ))}
        </select>
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {widgets.map((widget) => renderWidget(widget))}
      </div>

      {widgets.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-gray-600">No widgets available for this dashboard</p>
        </div>
      )}
    </div>
  );
};

