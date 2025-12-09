import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Filter, Bell } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiService } from '../services/api';
import type { Alert } from '../types';
import { format } from 'date-fns';

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  useEffect(() => {
    filterAlerts();
  }, [alerts, severityFilter, statusFilter]);

  const loadAlerts = async () => {
    try {
      // Load alerts for all severity levels
      const [critical, major, warning] = await Promise.all([
        apiService.getAlertsBySeverity('Critical'),
        apiService.getAlertsBySeverity('Major'),
        apiService.getAlertsBySeverity('Warning'),
      ]);
      
      const allAlerts = [...critical, ...major, ...warning];
      setAlerts(allAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAlerts = () => {
    let filtered = [...alerts];

    if (severityFilter !== 'all') {
      filtered = filtered.filter(a => a.severity === severityFilter);
    }

    if (statusFilter === 'acknowledged') {
      filtered = filtered.filter(a => a.acknowledged);
    } else if (statusFilter === 'unacknowledged') {
      filtered = filtered.filter(a => !a.acknowledged);
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    setFilteredAlerts(filtered);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-600 bg-red-100';
      case 'Major': return 'text-orange-600 bg-orange-100';
      case 'Warning': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Critical':
      case 'Major':
      case 'Warning':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <CheckCircle className="h-5 w-5" />;
    }
  };

  const severityData = [
    { name: 'Critical', count: alerts.filter(a => a.severity === 'Critical').length },
    { name: 'Major', count: alerts.filter(a => a.severity === 'Major').length },
    { name: 'Warning', count: alerts.filter(a => a.severity === 'Warning').length },
  ];

  const handleAcknowledge = (alertId: string) => {
    setAlerts(alerts.map(a => 
      a.id === alertId ? { ...a, acknowledged: true } : a
    ));
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
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Bell className="h-8 w-8 mr-3 text-primary-600" />
          Alerts & Notifications
        </h1>
        <p className="text-gray-600 mt-1">Monitor and manage system alerts</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Alerts</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{alerts.length}</p>
            </div>
            <Bell className="h-10 w-10 text-gray-400" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical</p>
              <p className="text-3xl font-bold text-red-600 mt-1">
                {alerts.filter(a => a.severity === 'Critical').length}
              </p>
            </div>
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Major</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">
                {alerts.filter(a => a.severity === 'Major').length}
              </p>
            </div>
            <AlertTriangle className="h-10 w-10 text-orange-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unacknowledged</p>
              <p className="text-3xl font-bold text-primary-600 mt-1">
                {alerts.filter(a => !a.acknowledged).length}
              </p>
            </div>
            <Bell className="h-10 w-10 text-primary-600" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Alert Distribution by Severity</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={severityData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#0ea5e9" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity
              </label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Severities</option>
                <option value="Critical">Critical</option>
                <option value="Major">Major</option>
                <option value="Warning">Warning</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Status</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="unacknowledged">Unacknowledged</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredAlerts.length} of {alerts.length} alerts
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`card hover:shadow-lg transition-shadow ${
              !alert.acknowledged ? 'border-l-4 border-primary-600' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)}`}>
                  {getSeverityIcon(alert.severity)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {alert.monitorName}
                    </h3>
                    <span className={`status-badge ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    {alert.acknowledged && (
                      <span className="status-badge bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1 inline" />
                        Acknowledged
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 mb-2">{alert.message}</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(alert.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                  </p>
                </div>
              </div>
              {!alert.acknowledged && (
                <button
                  onClick={() => handleAcknowledge(alert.id)}
                  className="btn-primary text-sm"
                >
                  Acknowledge
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredAlerts.length === 0 && (
        <div className="card text-center py-12">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
          <p className="text-gray-600">No alerts found matching your filters</p>
        </div>
      )}
    </div>
  );
};

