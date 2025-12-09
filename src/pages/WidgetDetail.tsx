import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Share2, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiService } from '../services/api';
import type { Widget, Metric } from '../types';
import { format, subHours, subDays } from 'date-fns';

export const WidgetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [widget, setWidget] = useState<Widget | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [timeRange, setTimeRange] = useState<string>('1h');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadWidgetData(id);
    }
  }, [id, timeRange]);

  const loadWidgetData = async (widgetId: string) => {
    try {
      const widgetData = await apiService.getWidgetById(widgetId);
      setWidget(widgetData);
      
      // Load historical data
      const now = new Date();
      const start = timeRange === '1h' ? subHours(now, 1) :
                    timeRange === '24h' ? subHours(now, 24) :
                    timeRange === '7d' ? subDays(now, 7) :
                    subDays(now, 30);

      const histogramData = await apiService.getMetricHistogram({
        monitorIds: [widgetId],
        metricNames: ['value'],
        aggregator: 'avg',
        timeRange: {
          start: start.toISOString(),
          end: now.toISOString(),
        },
      });
      
      setMetrics(histogramData);
    } catch (error) {
      console.error('Error loading widget details:', error);
      // Generate mock data
      setWidget({
        id: widgetId,
        title: 'Performance Metric',
        type: 'line',
        dashboardId: '1',
      });
      setMetrics(generateMockMetrics());
    } finally {
      setLoading(false);
    }
  };

  const generateMockMetrics = (): Metric[] => {
    const count = timeRange === '1h' ? 60 : timeRange === '24h' ? 144 : 168;
    const data: Metric[] = [];
    const now = new Date();
    
    for (let i = count; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60000);
      data.push({
        timestamp: timestamp.toISOString(),
        value: 50 + Math.random() * 50,
        status: 'Up',
        instance: 'default',
      });
    }
    return data;
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    if (format === 'csv') {
      const csv = [
        ['Timestamp', 'Value', 'Status', 'Instance'],
        ...metrics.map(m => [m.timestamp, m.value, m.status, m.instance]),
      ].map(row => row.join(',')).join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `widget-${id}-${Date.now()}.csv`;
      a.click();
    } else {
      alert('PDF export would be implemented with a PDF library');
    }
  };

  const chartData = metrics.map(m => ({
    time: format(new Date(m.timestamp), 'HH:mm'),
    value: m.value,
  }));

  const stats = {
    current: metrics[metrics.length - 1]?.value || 0,
    average: metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length || 0,
    min: Math.min(...metrics.map(m => m.value)) || 0,
    max: Math.max(...metrics.map(m => m.value)) || 0,
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
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/performance')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Performance
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{widget?.title}</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleExport('csv')}
            className="btn-secondary flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="btn-secondary flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </button>
          <button className="btn-secondary flex items-center">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600">Current</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.current.toFixed(2)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Average</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.average.toFixed(2)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Minimum</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.min.toFixed(2)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Maximum</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.max.toFixed(2)}</p>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="card">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-gray-600" />
          <label className="text-sm font-medium text-gray-700">Time Range:</label>
          <div className="flex space-x-2">
            {[
              { value: '1h', label: 'Last Hour' },
              { value: '24h', label: 'Last 24 Hours' },
              { value: '7d', label: 'Last 7 Days' },
              { value: '30d', label: 'Last 30 Days' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === option.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Trend</h2>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#0ea5e9"
              fillOpacity={1}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Metrics Table */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Raw Metrics</h2>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Instance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics.slice().reverse().map((metric, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(metric.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {metric.value.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`status-badge ${
                      metric.status === 'Up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {metric.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {metric.instance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

