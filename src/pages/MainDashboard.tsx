import React, { useEffect, useRef, useState } from 'react';
import { Camera, Server, Cpu, MonitorDot } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { apiService } from '../services/api';
import { parseGPUIPs, parseOLTMapping } from '../utils/excelParser';

interface CategoryStats {
  name: string;
  total: number;
  up: number;
  down: number;
  icon: React.ReactNode;
  color: string;
}

type OLTStatus = {
  ip: string;
  status: 'Up' | 'Down' | 'Unknown';
  lastUpTime?: string;
  lastDownTime?: string;
};

// Static total camera count
const STATIC_TOTAL_CAMERAS = 14700;

export const MainDashboard: React.FC = () => {
  const [stats, setStats] = useState<CategoryStats[]>([
    { name: 'Cameras', total: 0, up: 0, down: 0, icon: <Camera className="h-6 w-6" />, color: '#0EA5E9' }, // Sky Blue
    { name: 'Servers', total: 0, up: 0, down: 0, icon: <Server className="h-6 w-6" />, color: '#10B981' }, // Emerald
    { name: 'APIs', total: 0, up: 0, down: 0, icon: <MonitorDot className="h-6 w-6" />, color: '#F59E0B' }, // Amber
    { name: 'GPUs', total: 0, up: 0, down: 0, icon: <Cpu className="h-6 w-6" />, color: '#8B5CF6' }, // Purple
    { name: 'OLTs', total: 0, up: 0, down: 0, icon: <MonitorDot className="h-6 w-6" />, color: '#EC4899' }, // Pink
  ]);
  const [loading, setLoading] = useState(true);
  const [gpuIPs, setGpuIPs] = useState<string[]>([]);
  const [oltIPs, setOltIPs] = useState<string[]>([]);
  const [gpuDataLoaded, setGpuDataLoaded] = useState(false);
  const [oltDataLoaded, setOltDataLoaded] = useState(false);
  const hasLoadedSnapshotRef = useRef(false);
  const [oltStatuses, setOltStatuses] = useState<OLTStatus[]>([]);
  const [showOltDetails, setShowOltDetails] = useState(false);

  useEffect(() => {
    loadGPUExcelData();
    loadOLTExcelData();
  }, []);

  useEffect(() => {
    // Only take one snapshot per mount, after both Excel files are loaded
    if (!gpuDataLoaded || !oltDataLoaded) return;
    if (hasLoadedSnapshotRef.current) return;
    hasLoadedSnapshotRef.current = true;
    loadDashboardData();
  }, [gpuDataLoaded, oltDataLoaded]);

  const loadGPUExcelData = async () => {
    try {
      const gpuData = await parseGPUIPs('/GPU IPs.xlsx');
      setGpuIPs(gpuData.allIPs);
      setGpuDataLoaded(true);
      console.log(`Loaded ${gpuData.allIPs.length} GPU IPs from Excel`);
    } catch (error) {
      console.error('Error loading GPU IPs from Excel:', error);
      setGpuDataLoaded(true); // mark as loaded even if failed, so dashboard can still load
    }
  };

  const loadOLTExcelData = async () => {
    try {
      const oltData = await parseOLTMapping("/OLT IP's.xlsx");
      setOltIPs(oltData.allOLTIPs || []);
      console.log(`[MainDashboard] Loaded ${oltData.allOLTIPs?.length || 0} OLT IPs from Excel`);
    } catch (error) {
      console.error('Error loading OLT IPs from Excel:', error);
    } finally {
      // Mark as loaded even if there was an error so dashboard request can proceed
      setOltDataLoaded(true);
    }
  };

  const loadDashboardData = async () => {
    try {
      // Fetch only Up and Down monitors (more efficient than fetching all 19,069!)
      const [upResponse, downResponse] = await Promise.all([
        apiService.getApi().get('/query/objects/status?status=Up'),
        apiService.getApi().get('/query/objects/status?status=Down'),
      ]);

      const upMonitors = upResponse.data.result || upResponse.data || [];
      const downMonitors = downResponse.data.result || downResponse.data || [];

      console.log(`Up monitors: ${upMonitors.length}, Down monitors: ${downMonitors.length}`);

      // Initialize counters
      const cameras = { up: 0, down: 0, total: 0 };
      const servers = { up: 0, down: 0, total: 0 };
      const apis = { up: 0, down: 0, total: 0 };
      const gpus = { up: 0, down: 0, total: 0 };
      const olts = { up: 0, down: 0, total: 0 };

      // Count UP monitors by category
      // Allow duplicates - monitors can be counted in multiple categories
      upMonitors.forEach((monitor: any) => {
        const name = (monitor['object.name'] || '').toLowerCase();
        const host = (monitor['object.host'] || '').toLowerCase();

        // Cameras: name contains "cam"
        if (name.includes('cam')) {
          cameras.up++;
          cameras.total++;
        }

        // Servers: name contains "server" BUT exclude if name contains "cam" or "cameras"
        if (name.includes('server') && !name.includes('cam')) {
          servers.up++;
          servers.total++;
        }

        // APIs: name contains "_api/"
        if (name.includes('_api/')) {
          apis.up++;
          apis.total++;
        }

        // GPUs: Use Excel IP list - check if monitorIP is in gpuIPs
        const monitorIPUp = monitor['object.ip'] || '';
        if ((name.includes('gpu') || host.includes('gpu')) && !name.includes('non_gpu') && !host.includes('non_gpu')) {
          if (gpuIPs.length > 0 && gpuIPs.includes(monitorIPUp)) {
            gpus.up++;
          }
        }
      });

      // Count DOWN monitors by category
      // Allow duplicates - monitors can be counted in multiple categories
      downMonitors.forEach((monitor: any) => {
        const name = (monitor['object.name'] || '').toLowerCase();
        const host = (monitor['object.host'] || '').toLowerCase();

        // Cameras: name contains "cam"
        if (name.includes('cam')) {
          cameras.down++;
          cameras.total++;
        }

        // Servers: name contains "server" BUT exclude if name contains "cam" or "cameras"
        if (name.includes('server') && !name.includes('cam')) {
          servers.down++;
          servers.total++;
        }

        // APIs: name contains "_api/"
        if (name.includes('_api/')) {
          apis.down++;
          apis.total++;
        }

        // GPUs: Use Excel IP list - check if monitorIP is in gpuIPs
        const monitorIPDown = monitor['object.ip'] || '';
        if ((name.includes('gpu') || host.includes('gpu')) && !name.includes('non_gpu') && !host.includes('non_gpu')) {
          if (gpuIPs.length > 0 && gpuIPs.includes(monitorIPDown)) {
            gpus.down++;
          }
        }
      });

      // For GPUs: Total comes from Excel, up = total - down
      if (gpuIPs.length > 0) {
        gpus.total = gpuIPs.length;
        gpus.up = gpus.total - gpus.down;
      }

      // Compute OLT Up/Down using olt-status API (same logic as AndhraPradeshMap)
      if (oltIPs.length > 0) {
        try {
          const oltResults: OLTStatus[] = await Promise.all(
            oltIPs.map(async (ip): Promise<OLTStatus> => {
              try {
                const response = await fetch(`/api/olt-status?olt_no=${encodeURIComponent(ip)}`);
                if (!response.ok) {
                  return { ip, status: 'Unknown' };
                }
                const data = await response.json();
                if (data.message === 'success' && data.data && data.data.length > 0) {
                  const oltData = data.data[0];
                  const statusCode = oltData.olt_status?.toString();
                  const status: OLTStatus['status'] =
                    statusCode === '1' ? 'Up' :
                    statusCode === '4' ? 'Down' :
                    'Unknown';
                  return {
                    ip,
                    status,
                    lastUpTime: oltData.last_up_time,
                    lastDownTime: oltData.last_down_time,
                  };
                }
                return { ip, status: 'Unknown' };
              } catch (e) {
                console.error('[MainDashboard] Error checking OLT status for', ip, e);
                return { ip, status: 'Unknown' };
              }
            })
          );

          // Remove duplicates based on OLT IP
          const uniqueMap = new Map<string, OLTStatus>();
          oltResults.forEach((result) => {
            if (!uniqueMap.has(result.ip)) {
              uniqueMap.set(result.ip, result);
            }
          });
          const uniqueResults = Array.from(uniqueMap.values());

          uniqueResults.forEach((result) => {
            if (result.status === 'Up') {
              olts.up++;
            } else if (result.status === 'Down') {
              olts.down++;
            }
          });

          olts.total = uniqueResults.length;
          setOltStatuses(uniqueResults);
        } catch (e) {
          console.error('[MainDashboard] Error computing OLT statistics', e);
        }
      }

      console.log('Category Stats:', { cameras, servers, apis, gpus, olts });

      // Update state
      setStats([
        { 
          name: 'Cameras', 
          total: cameras.total, 
          up: cameras.up, 
          down: cameras.down, 
          icon: <Camera className="h-6 w-6" />, 
          color: '#0EA5E9' 
        },
        { 
          name: 'Servers', 
          total: servers.total, 
          up: servers.up, 
          down: servers.down, 
          icon: <Server className="h-6 w-6" />, 
          color: '#10B981' 
        },
        { 
          name: 'APIs', 
          total: apis.total, 
          up: apis.up, 
          down: apis.down, 
          icon: <MonitorDot className="h-6 w-6" />, 
          color: '#F59E0B' 
        },
        { 
          name: 'GPUs', 
          total: gpus.total, 
          up: gpus.up, 
          down: gpus.down, 
          icon: <Cpu className="h-6 w-6" />, 
          color: '#8B5CF6' 
        },
        { 
          name: 'OLTs', 
          total: olts.total, 
          up: olts.up, 
          down: olts.down, 
          icon: <MonitorDot className="h-6 w-6" />, 
          color: '#EC4899' 
        },
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPieChartData = (category: CategoryStats) => [
    { name: 'Up', value: category.up, color: '#10B981' }, // Emerald
    { name: 'Down', value: category.down, color: '#F43F5E' }, // Rose
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {/* Header - Compact */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Main Dashboard</h1>
          <p className="text-sm text-gray-600">Real-time monitoring status by category</p>
        </div>
      </div>

      {/* Category Cards - Compact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stats.map((category, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md border-2 border-gray-300 p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div 
                  className="p-2 rounded-lg" 
                  style={{ backgroundColor: `${category.color}20`, color: category.color }}
                >
                  {category.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                  <p className="text-xs text-gray-500">
                    Total: {category.total}
                    {category.name === 'Cameras' && (
                      <span className="text-gray-400"> (total cameras: {STATIC_TOTAL_CAMERAS})</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Content - Side by Side */}
            <div className="grid grid-cols-2 gap-3">
              {/* Left: Stats */}
              <div className="space-y-2">
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <div className="text-xs text-emerald-600 font-medium">Up</div>
                  <div className="text-2xl font-bold text-emerald-700">{category.up}</div>
                  <div className="text-xs text-emerald-600">
                    {category.total > 0 ? Math.round((category.up / category.total) * 100) : 0}%
                  </div>
                </div>
                
                <div
                  className={`bg-rose-50 p-3 rounded-lg border border-rose-200 ${
                    category.name === 'OLTs' && category.down > 0 ? 'cursor-pointer hover:bg-rose-100' : ''
                  }`}
                  onClick={() => {
                    if (category.name === 'OLTs' && category.down > 0) {
                      setShowOltDetails((prev) => !prev);
                    }
                  }}
                >
                  <div className="text-xs text-rose-600 font-medium">Down</div>
                  <div className="text-2xl font-bold text-rose-700">{category.down}</div>
                  <div className="text-xs text-rose-600">
                    {category.total > 0 ? Math.round((category.down / category.total) * 100) : 0}%
                  </div>
                </div>
              </div>

              {/* Right: Pie Chart */}
              <div className="flex items-center justify-center">
                {category.total > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie
                        data={getPieChartData(category)}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={55}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {getPieChartData(category).map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-gray-400">
                    <p className="text-xs">No data</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* OLT Down Details */}
      {showOltDetails && (
        <div className="mt-4 bg-white rounded-lg shadow-md border-2 border-rose-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-rose-700">Down OLTs</h2>
              <p className="text-xs text-gray-500">
                List of all OLTs that are currently Down with last up/down timestamps.
              </p>
            </div>
            <button
              onClick={() => setShowOltDetails(false)}
              className="text-xs px-3 py-1 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100"
            >
              Close
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto border border-gray-100 rounded-md">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">OLT IP</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Last Up Time</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Last Down Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {oltStatuses.filter((o) => o.status === 'Down').length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-400">
                      No OLTs are currently Down.
                    </td>
                  </tr>
                ) : (
                  oltStatuses
                    .filter((o) => o.status === 'Down')
                    .map((olt) => (
                      <tr key={olt.ip} className="hover:bg-rose-50/60">
                        <td className="px-3 py-2 font-mono text-xs text-gray-800">{olt.ip}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700">
                            Down
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-700">{olt.lastUpTime || '-'}</td>
                        <td className="px-3 py-2 text-gray-700">{olt.lastDownTime || '-'}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

