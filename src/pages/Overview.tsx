import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  HelpCircle,
  TrendingUp 
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiService } from '../services/api';
import type { StatusSummary, SeveritySummary, Monitor } from '../types';

export const Overview: React.FC = () => {
  const [statusSummary, setStatusSummary] = useState<StatusSummary | null>(null);
  const [severitySummary, setSeveritySummary] = useState<SeveritySummary | null>(null);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [status, severity, allMonitors] = await Promise.all([
        apiService.getStatusSummary(),
        apiService.getSeveritySummary(),
        apiService.getAllMonitors(),
      ]);
      setStatusSummary(status);
      setSeveritySummary(severity);
      setMonitors(allMonitors);
    } catch (error) {
      console.error('Error loading overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statusData = statusSummary ? [
    { name: 'Up', value: statusSummary.up, color: '#10b981' },
    { name: 'Down', value: statusSummary.down, color: '#ef4444' },
    { name: 'Warning', value: statusSummary.warning, color: '#f59e0b' },
    { name: 'Unreachable', value: statusSummary.unreachable, color: '#6b7280' },
    { name: 'Unknown', value: statusSummary.unknown, color: '#9ca3af' },
  ] : [];

  const severityData = severitySummary ? [
    { name: 'Critical', value: severitySummary.critical },
    { name: 'Major', value: severitySummary.major },
    { name: 'Warning', value: severitySummary.warning },
    { name: 'Clear', value: severitySummary.clear },
  ] : [];

  const handleStatusClick = (status: string) => {
    navigate(`/monitors?status=${status}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Overview Dashboard</h1>
        <p className="text-gray-600 mt-1">Monitor your infrastructure at a glance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div 
          className="card cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleStatusClick('all')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Monitors</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {statusSummary?.total || 0}
              </p>
            </div>
            <Activity className="h-12 w-12 text-primary-600" />
          </div>
        </div>

        <div 
          className="card cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleStatusClick('Up')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Up</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {statusSummary?.up || 0}
              </p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div 
          className="card cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleStatusClick('Down')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Down</p>
              <p className="text-3xl font-bold text-red-600 mt-1">
                {statusSummary?.down || 0}
              </p>
            </div>
            <XCircle className="h-12 w-12 text-red-600" />
          </div>
        </div>

        <div 
          className="card cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleStatusClick('Warning')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Warning</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">
                {statusSummary?.warning || 0}
              </p>
            </div>
            <AlertTriangle className="h-12 w-12 text-yellow-600" />
          </div>
        </div>

        <div 
          className="card cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleStatusClick('Unknown')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unknown</p>
              <p className="text-3xl font-bold text-gray-600 mt-1">
                {statusSummary?.unknown || 0}
              </p>
            </div>
            <HelpCircle className="h-12 w-12 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Status Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Severity Bar Chart */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Severity Levels</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={severityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Monitor Activity</h2>
          <button 
            onClick={() => navigate('/monitors')}
            className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center"
          >
            View All
            <TrendingUp className="h-4 w-4 ml-1" />
          </button>
        </div>
        <div className="space-y-3">
          {monitors.slice(0, 5).map((monitor) => (
            <div
              key={monitor.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => navigate(`/monitors/${monitor.id}`)}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  monitor.status === 'Up' ? 'bg-green-500' :
                  monitor.status === 'Down' ? 'bg-red-500' :
                  monitor.status === 'Warning' ? 'bg-yellow-500' :
                  'bg-gray-500'
                }`} />
                <div>
                  <p className="font-medium text-gray-900">{monitor.name || monitor['object.name']}</p>
                  <p className="text-sm text-gray-600">{monitor.type || monitor['object.type']} • {monitor.group || 'Default'}</p>
                </div>
              </div>
              <span className={`status-badge ${
                monitor.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                monitor.severity === 'Major' ? 'bg-orange-100 text-orange-800' :
                monitor.severity === 'Warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {monitor.status || monitor['object.state']}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

