import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, Eye } from 'lucide-react';
import { apiService } from '../services/api';
import type { Monitor } from '../types';
import { format } from 'date-fns';

export const MonitorList: React.FC = () => {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [filteredMonitors, setFilteredMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    loadMonitors();
  }, []);

  useEffect(() => {
    // Apply URL filters
    const status = searchParams.get('status');
    if (status && status !== 'all') {
      setStatusFilter(status);
    }
  }, [searchParams]);

  // Reload monitors when status filter changes
  useEffect(() => {
    if (statusFilter !== 'all') {
      loadMonitors(statusFilter);
    } else {
      loadMonitors();
    }
  }, [statusFilter]);

  // Apply search and severity filters to loaded monitors
  useEffect(() => {
    filterMonitors();
  }, [monitors, searchTerm, severityFilter]);

  const loadMonitors = async (statusOverride?: string) => {
    setLoading(true);
    try {
      // Check status from URL param or dropdown filter
      const urlStatus = searchParams.get('status');
      const currentStatus = statusOverride || statusFilter;
      let data;
      
      if (currentStatus && currentStatus !== 'all') {
        console.log(`Loading monitors with status: ${currentStatus}`);
        data = await apiService.getMonitorsByStatus(currentStatus);
      } else if (urlStatus && urlStatus !== 'all') {
        console.log(`Loading monitors with URL status: ${urlStatus}`);
        data = await apiService.getMonitorsByStatus(urlStatus);
      } else {
        console.log('Loading all monitors');
        data = await apiService.getAllMonitors();
      }
      
      setMonitors(data);
      setFilteredMonitors(data);
    } catch (error) {
      console.error('Error loading monitors:', error);
      setMonitors([]);
      setFilteredMonitors([]);
    } finally {
      setLoading(false);
    }
  };

  const filterMonitors = () => {
    let filtered = [...monitors];

    // Search filter (only apply search on already loaded monitors)
    if (searchTerm) {
      filtered = filtered.filter(m => {
        const name = String(m.name || m['object.name'] || '').toLowerCase();
        const type = String(m.type || m['object.type'] || '').toLowerCase();
        // Handle group - it might be string, number, or array
        let groupStr = '';
        if (m.group) {
          groupStr = String(m.group).toLowerCase();
        } else if (m['object.groups'] && Array.isArray(m['object.groups'])) {
          groupStr = m['object.groups'].join(' ').toLowerCase();
        } else if (m['object.groups']) {
          groupStr = String(m['object.groups']).toLowerCase();
        }
        const searchLower = searchTerm.toLowerCase();
        return name.includes(searchLower) ||
               type.includes(searchLower) ||
               groupStr.includes(searchLower);
      });
    }

    // Severity filter (only apply if not 'all')
    if (severityFilter !== 'all') {
      filtered = filtered.filter(m => m.severity === severityFilter);
    }

    setFilteredMonitors(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Up': return 'bg-green-500';
      case 'Down': return 'bg-red-500';
      case 'Warning': return 'bg-yellow-500';
      case 'Unreachable': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getSeverityBadge = (severity: string) => {
    const classes = {
      'Critical': 'bg-red-100 text-red-800',
      'Major': 'bg-orange-100 text-orange-800',
      'Warning': 'bg-yellow-100 text-yellow-800',
      'Clear': 'bg-green-100 text-green-800',
    };
    return classes[severity as keyof typeof classes] || 'bg-gray-100 text-gray-800';
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
        <h1 className="text-3xl font-bold text-gray-900">Monitors</h1>
        <p className="text-gray-600 mt-1">View and manage all your monitors</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search monitors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="Up">Up</option>
              <option value="Down">Down</option>
              <option value="Warning">Warning</option>
              <option value="Unreachable">Unreachable</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Severity</option>
              <option value="Critical">Critical</option>
              <option value="Major">Major</option>
              <option value="Warning">Warning</option>
              <option value="Clear">Clear</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredMonitors.length} of {monitors.length} monitors
      </div>

      {/* Monitors Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 table-auto">
            <thead className="bg-gray-50">
              <tr>
                {statusFilter !== 'all' && (
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Status
                  </th>
                )}
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px] max-w-[300px]">
                  Monitor Name
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Type
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28 hidden md:table-cell">
                  Group
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Severity
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 hidden lg:table-cell">
                  Last Poll
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMonitors.map((monitor) => (
                <tr key={monitor.id} className="hover:bg-gray-50">
                  {statusFilter !== 'all' && (
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(monitor.status || 'Unknown')}`} />
                        <span className="ml-2 text-sm text-gray-900 hidden sm:inline">{monitor.status || 'N/A'}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-3 py-4">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-[300px]" title={monitor.name || monitor['object.name']}>
                      {monitor.name || monitor['object.name']}
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600 truncate max-w-[100px]">{monitor.type || monitor['object.type']}</div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap hidden md:table-cell">
                    <div className="text-sm text-gray-600 truncate max-w-[120px]" title={String(monitor.group || monitor['object.groups']?.[0] || 'Default')}>
                      {monitor.group || monitor['object.groups']?.[0] || 'Default'}
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span className={`status-badge ${getSeverityBadge(monitor.severity || 'Clear')} text-xs`}>
                      {monitor.severity || 'Clear'}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                    {monitor.lastPollTime 
                      ? (() => {
                          try {
                            return format(new Date(monitor.lastPollTime), 'MMM dd, HH:mm');
                          } catch {
                            return monitor.lastPollTime;
                          }
                        })()
                      : 'N/A'
                    }
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => navigate(`/monitors/${monitor.id}`, { state: { monitorData: monitor } })}
                      className="text-primary-600 hover:text-primary-900 inline-flex items-center text-xs"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">View</span>
                    </button>
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

