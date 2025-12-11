import React, { useEffect, useState } from 'react';
import { Camera, Server, Cpu, MonitorDot } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { apiService } from '../services/api';

interface CategoryStats {
  name: string;
  total: number;
  up: number;
  down: number;
  icon: React.ReactNode;
  color: string;
}

// Static total camera count
const STATIC_TOTAL_CAMERAS = 14700;

export const MainDashboard: React.FC = () => {
  const [stats, setStats] = useState<CategoryStats[]>([
    { name: 'Cameras', total: 0, up: 0, down: 0, icon: <Camera className="h-6 w-6" />, color: '#0EA5E9' }, // Sky Blue
    { name: 'Servers', total: 0, up: 0, down: 0, icon: <Server className="h-6 w-6" />, color: '#10B981' }, // Emerald
    { name: 'APIs', total: 0, up: 0, down: 0, icon: <MonitorDot className="h-6 w-6" />, color: '#F59E0B' }, // Amber
    { name: 'GPUs', total: 0, up: 0, down: 0, icon: <Cpu className="h-6 w-6" />, color: '#8B5CF6' }, // Purple
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

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

        // GPUs: name contains "gpu" OR host contains "gpu"
        if (name.includes('gpu') || host.includes('gpu')) {
          gpus.up++;
          gpus.total++;
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

        // GPUs: name contains "gpu" OR host contains "gpu"
        if (name.includes('gpu') || host.includes('gpu')) {
          gpus.down++;
          gpus.total++;
        }
      });

      console.log('Category Stats:', { cameras, servers, apis, gpus });

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
                
                <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
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
    </div>
  );
};

