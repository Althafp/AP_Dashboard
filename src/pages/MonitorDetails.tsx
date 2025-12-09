import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Server } from 'lucide-react';
import { apiService } from '../services/api';
import type { Monitor, MonitorInstance, PollInfo } from '../types';
import { format } from 'date-fns';

export const MonitorDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [instances, setInstances] = useState<MonitorInstance[]>([]);
  const [pollInfo, setPollInfo] = useState<PollInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Always fetch fresh data to get accurate status
    // Use passed data only for initial display, then update with real status
    const passedMonitorData = location.state?.monitorData;
    if (id) {
      if (passedMonitorData) {
        // Set initial data from MonitorList for fast display
        console.log('Monitor Details - Initial data from MonitorList:', passedMonitorData);
        setMonitor(passedMonitorData);
        setLoading(false);
        // But always fetch fresh status to ensure accuracy
        loadMonitorData(id, passedMonitorData);
      } else {
        // No passed data, fetch everything
        loadMonitorData(id);
      }
    }
  }, [id, location.state]);

  const loadAdditionalData = async (monitorId: string) => {
    // Load instances and poll info only
    try {
      const [instancesData, pollData] = await Promise.all([
        apiService.getMonitorInstances(monitorId).catch(() => []),
        apiService.getMonitorPollInfo(monitorId).catch(() => null),
      ]);
      setInstances(Array.isArray(instancesData) ? instancesData : []);
      setPollInfo(pollData);
    } catch (err) {
      console.log('Instances or poll info not available:', err);
      setInstances([]);
      setPollInfo(null);
    }
  };

  const loadMonitorData = async (monitorId: string, initialData?: Monitor | null) => {
    try {
      if (!initialData) {
        setLoading(true);
      }
      
      // Always fetch the actual status from the status API to ensure accuracy
      const [monitorData, statusData] = await Promise.all([
        initialData ? Promise.resolve(initialData) : apiService.getMonitorById(monitorId),
        apiService.getMonitorStatus(monitorId).catch((err) => {
          console.log('Status API error, using fallback:', err);
          return null;
        }),
      ]);
      
      // Get actual status from status API (most accurate)
      const statusResult = statusData?.result || statusData;
      let actualStatus = statusResult?.status;
      
      // If status API doesn't provide status, use monitor data
      if (!actualStatus) {
        if (monitorData.status && (monitorData.status === 'Up' || monitorData.status === 'Down')) {
          actualStatus = monitorData.status;
        } else if (monitorData['object.state']) {
          actualStatus = monitorData['object.state'] === 'ENABLE' ? 'Up' : 
                        monitorData['object.state'] === 'DISABLE' ? 'Down' : 
                        monitorData['object.state'];
        } else {
          actualStatus = 'Unknown';
        }
      }
      
      console.log('Monitor Details - Status API returned:', statusResult);
      console.log('Monitor Details - Actual Status:', actualStatus);
      
      // Merge data with accurate status
      const finalMonitorData: Monitor = {
        ...monitorData,
        status: actualStatus, // Always use the actual status from API
        name: monitorData.name || monitorData['object.name'] || 'Monitor',
        type: monitorData.type || monitorData['object.type'] || 'N/A',
        id: monitorData.id || monitorData['object.id'] || monitorId,
        severity: monitorData.severity || 'Clear',
        lastPollTime: monitorData.lastPollTime || monitorData['object.modification.time'] || monitorData['object.creation.time'] || '',
        group: String(monitorData.group || monitorData['object.groups']?.[0] || 'Default'),
      };
      
      console.log('Monitor Details - Final Monitor Data:', finalMonitorData);
      setMonitor(finalMonitorData);
      
      // Load additional data
      await loadAdditionalData(monitorId);
    } catch (error) {
      console.error('Error loading monitor details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Up': return 'bg-green-500 text-white';
      case 'Down': return 'bg-red-500 text-white';
      case 'Warning': return 'bg-yellow-500 text-white';
      default: return 'bg-gray-500 text-white';
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

  if (!monitor) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Monitor not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/monitors')}
        className="flex items-center text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Monitors
      </button>

      {/* Monitor Header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className="bg-primary-100 p-3 rounded-lg">
              <Server className="h-8 w-8 text-primary-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{monitor.name || monitor['object.name'] || 'Monitor'}</h1>
              <div className="flex items-center space-x-3 mt-2">
                <span className={`status-badge ${getStatusColor(monitor.status || 'Unknown')} px-4 py-1`}>
                  {monitor.status || 'Unknown'}
                </span>
                <span className={`status-badge ${getSeverityBadge(monitor.severity || 'Clear')}`}>
                  {monitor.severity || 'Clear'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/performance')}
            className="btn-primary flex items-center ml-4"
          >
            <TrendingUp className="h-5 w-5 mr-2" />
            View Performance
          </button>
        </div>
      </div>

      {/* Monitor Details Section */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Monitor Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Status</div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(monitor.status || 'Unknown')}`} />
              <span className="ml-2 text-sm font-medium text-gray-900">{monitor.status || 'N/A'}</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Monitor Name</div>
            <div className="text-sm font-medium text-gray-900 truncate" title={monitor.name || monitor['object.name'] || 'N/A'}>
              {monitor.name || monitor['object.name'] || 'N/A'}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Type</div>
            <div className="text-sm font-medium text-gray-900">{monitor.type || monitor['object.type'] || 'N/A'}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Monitor ID</div>
            <div className="text-sm font-medium text-gray-900">{monitor.id || monitor['object.id'] || 'N/A'}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Group</div>
            <div className="text-sm font-medium text-gray-900">{monitor.group || monitor['object.groups']?.[0] || 'Default'}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Severity</div>
            <div>
              <span className={`status-badge ${getSeverityBadge(monitor.severity || 'Clear')}`}>
                {monitor.severity || 'Clear'}
              </span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Last Poll</div>
            <div className="text-sm font-medium text-gray-900">
              {(() => {
                const pollTime = monitor.lastPollTime || monitor['object.modification.time'] || monitor['object.creation.time'];
                if (!pollTime) return 'N/A';
                try {
                  return format(new Date(pollTime), 'MMM dd, HH:mm');
                } catch {
                  return pollTime || 'N/A';
                }
              })()}
            </div>
          </div>
          {monitor['object.ip'] && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">IP Address</div>
              <div className="text-sm font-medium text-gray-900">{monitor['object.ip']}</div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Monitor Details */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {monitor['object.host'] && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Host</div>
              <div className="text-sm font-medium text-gray-900">{monitor['object.host']}</div>
            </div>
          )}
          {monitor['object.target'] && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Target</div>
              <div className="text-sm font-medium text-gray-900">{monitor['object.target']}</div>
            </div>
          )}
          {monitor['object.vendor'] && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Vendor</div>
              <div className="text-sm font-medium text-gray-900">{monitor['object.vendor']}</div>
            </div>
          )}
          {monitor['object.category'] && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Category</div>
              <div className="text-sm font-medium text-gray-900">{monitor['object.category']}</div>
            </div>
          )}
          {monitor['object.make.model'] && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Model</div>
              <div className="text-sm font-medium text-gray-900">{monitor['object.make.model']}</div>
            </div>
          )}
          {monitor['object.discovery.method'] && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Discovery Method</div>
              <div className="text-sm font-medium text-gray-900">{monitor['object.discovery.method']}</div>
            </div>
          )}
          {monitor['object.creation.time'] && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Created</div>
              <div className="text-sm font-medium text-gray-900">
                {(() => {
                  try {
                    return format(new Date(monitor['object.creation.time']), 'MMM dd, yyyy HH:mm:ss');
                  } catch {
                    return monitor['object.creation.time'];
                  }
                })()}
              </div>
            </div>
          )}
          {monitor['object.modification.time'] && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Last Modified</div>
              <div className="text-sm font-medium text-gray-900">
                {(() => {
                  try {
                    return format(new Date(monitor['object.modification.time']), 'MMM dd, yyyy HH:mm:ss');
                  } catch {
                    return monitor['object.modification.time'];
                  }
                })()}
              </div>
            </div>
          )}
          {monitor['object.state'] && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">State</div>
              <div className="text-sm font-medium text-gray-900">{monitor['object.state']}</div>
            </div>
          )}
          {monitor['object.groups'] && Array.isArray(monitor['object.groups']) && monitor['object.groups'].length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Groups</div>
              <div className="text-sm font-medium text-gray-900">{monitor['object.groups'].join(', ')}</div>
            </div>
          )}
        </div>
      </div>

      {/* Instances Table */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Instances</h2>
        {instances.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interface Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interface Index
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Speed (bytes/sec)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {instances.map((instance, index) => (
                  <tr key={instance['interface.index'] || instance.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full ${
                          instance.status === 'Up' || instance.status === 'up' ? 'bg-green-500' :
                          instance.status === 'Down' || instance.status === 'down' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`} />
                        <span className="ml-2 text-sm text-gray-900">{instance.status || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {instance['interface.name'] || instance.name || instance.interface || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {instance['interface.index'] || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {instance['interface.address'] || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {instance['interface.description'] || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {instance['interface.type'] || instance['interface.bit.type'] || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {instance['interface.speed.bytes.per.sec'] 
                        ? `${(instance['interface.speed.bytes.per.sec'] / 1024 / 1024).toFixed(2)} MB/s`
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">No instances found</p>
        )}
      </div>

      {/* Last Poll Information */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Last Poll Information</h2>
        {pollInfo && Object.keys(pollInfo).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pollInfo.Availability !== undefined && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Availability</div>
                <div className="text-2xl font-semibold text-gray-900">{pollInfo.Availability}</div>
              </div>
            )}
            {pollInfo['Network Interface'] !== undefined && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Network Interface</div>
                <div className="text-2xl font-semibold text-gray-900">{pollInfo['Network Interface']}</div>
              </div>
            )}
            {pollInfo['Routing Protocol'] !== undefined && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Routing Protocol</div>
                <div className="text-2xl font-semibold text-gray-900">{pollInfo['Routing Protocol']}</div>
              </div>
            )}
            {/* Display any other fields that might be present */}
            {Object.entries(pollInfo).map(([key, value]) => {
              // Skip already displayed fields
              if (key === 'Availability' || key === 'Network Interface' || key === 'Routing Protocol') {
                return null;
              }
              // Skip legacy fields
              if (key === 'metricGroup' || key === 'lastPollTime' || key === 'values') {
                return null;
              }
              return (
                <div key={key} className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-500 mb-1">{key}</div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {typeof value === 'number' ? value : String(value)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">No poll information available</p>
        )}
      </div>
    </div>
  );
};

