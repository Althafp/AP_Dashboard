import React, { useEffect, useState } from 'react';
import {  Cpu, HardDrive, Activity, RefreshCw } from 'lucide-react';

interface HostData {
  host: string;
  timestamp: string;
  gpu: Array<{
    index: number;
    name: string;
    gpuUtilization: number;
    memoryUtilization: number;
    memoryUsed: number;
    memoryTotal: number;
    temperature: number;
  }>;
  cpu: {
    utilization: number;
  };
  memory: {
    utilization: number;
    total: number;
    used: number;
    free: number;
    available: number;
  };
  error?: string;
}

interface HostUtilizationData {
  timestamp: string;
  totalHosts: number;
  hosts: HostData[];
}

type District = 'all' | 'guntur' | 'krishna';

export const LiveUtilization: React.FC = () => {
  const [data, setData] = useState<HostUtilizationData | null>(null);
  const [selectedHost, setSelectedHost] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<District>('all');
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (fetchNew = false, district: District = selectedDistrict) => {
    try {
      if (fetchNew) {
        setIsFetching(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Only add refresh=true when fetching new data
      const url = fetchNew 
        ? `/api/host-utilization?refresh=true&district=${district}` 
        : `/api/host-utilization?district=${district}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load host utilization: ${response.statusText}`);
      }
      const jsonData: HostUtilizationData = await response.json();
      setData(jsonData);
      
      // Auto-select first host if none selected
      if (!selectedHost && jsonData.hosts.length > 0) {
        setSelectedHost(jsonData.hosts[0].host);
      }
    } catch (err) {
      console.error('Error loading host utilization:', err);
      setError(err instanceof Error ? err.message : 'Failed to load host utilization data');
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const handleFetch = () => {
    loadData(true, selectedDistrict);
  };

  const handleDistrictChange = (district: District) => {
    setSelectedDistrict(district);
    setSelectedHost(null); // Reset selected host when district changes
    loadData(false, district);
  };

  useEffect(() => {
    // Load data once on mount (from file if exists)
    loadData(false, selectedDistrict);
  }, []);

  const selectedHostData = data?.hosts.find((h) => h.host === selectedHost);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800 font-semibold">Error loading data</p>
        <p className="text-red-600 mt-2">{error}</p>
        <button
          onClick={() => loadData(false, selectedDistrict)}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Utilization</h1>
          <p className="text-sm text-gray-600 mt-1">
            Real-time CPU and GPU utilization across hosts
            {data && (
              <span className="ml-2 text-gray-500">
                • Last updated: {new Date(data.timestamp).toLocaleTimeString()}
                {isFetching && (
                  <span className="ml-2 inline-block animate-spin">🔄</span>
                )}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* District Selector */}
          <select
            value={selectedDistrict}
            onChange={(e) => handleDistrictChange(e.target.value as District)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Districts</option>
            <option value="guntur">Guntur (49.181-49.185)</option>
            <option value="krishna">Krishna (114.238-114.252)</option>
          </select>
          
          {/* Fetch Button - Collects new data */}
          <button
            onClick={handleFetch}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isFetching}
          >
            <Activity className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Fetching...' : 'Fetch'}
          </button>
          
          {/* Refresh Button - Reloads from file */}
          <button
            onClick={() => loadData(false, selectedDistrict)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Host Selection */}
      {data && data.hosts.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border-2 border-gray-300 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Host</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {data.hosts.map((host) => {
              const avgGpuUtil = host.gpu.length > 0
                ? (host.gpu.reduce((sum, g) => sum + g.gpuUtilization, 0) / host.gpu.length).toFixed(1)
                : '0.0';
              
              return (
                <button
                  key={host.host}
                  onClick={() => setSelectedHost(host.host)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedHost === host.host
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  {/* IP Address at top */}
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-gray-900 text-sm">{host.host}</p>
                    {host.error ? (
                      <span className="text-red-500 text-xs">Error</span>
                    ) : (
                      <span className="text-green-500 text-xs">●</span>
                    )}
                  </div>
                  
                  {!host.error && (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {/* GPU Info - Left */}
                      <div className="border-r border-gray-200 pr-2">
                        <div className="flex items-center mb-1">
                          <Activity className="h-4 w-4 text-blue-600 mr-1" />
                          <p className="text-xs font-medium text-gray-700">GPU</p>
                        </div>
                        <p className="text-xs text-gray-600">Count: {host.gpu.length}</p>
                        <p className="text-xs font-semibold text-blue-600">Avg: {avgGpuUtil}%</p>
                      </div>
                      
                      {/* CPU Info - Right */}
                      <div className="pl-2">
                        <div className="flex items-center mb-1">
                          <Cpu className="h-4 w-4 text-orange-600 mr-1" />
                          <p className="text-xs font-medium text-gray-700">CPU</p>
                        </div>
                        <p className="text-xs text-gray-600">Utilization</p>
                        <p className="text-xs font-semibold text-orange-600">{host.cpu.utilization.toFixed(1)}%</p>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Host Details */}
      {selectedHostData && !selectedHostData.error && (
        <div className="space-y-6">
          {/* CPU and Memory Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CPU Card */}
            <div className="bg-white rounded-lg shadow-md border-2 border-orange-300 p-6">
              <div className="flex items-center mb-4">
                <Cpu className="h-6 w-6 text-orange-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">CPU Utilization</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm text-gray-600">Utilization</p>
                    <p className="text-lg font-bold text-orange-600">
                      {selectedHostData.cpu.utilization.toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-orange-600 h-4 rounded-full transition-all"
                      style={{ width: `${Math.min(selectedHostData.cpu.utilization, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Memory Card */}
            <div className="bg-white rounded-lg shadow-md border-2 border-purple-300 p-6">
              <div className="flex items-center mb-4">
                <HardDrive className="h-6 w-6 text-purple-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Memory</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm text-gray-600">Utilization</p>
                    <p className="text-lg font-bold text-purple-600">
                      {selectedHostData.memory.utilization.toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-purple-600 h-4 rounded-full transition-all"
                      style={{ width: `${Math.min(selectedHostData.memory.utilization, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Used</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {(selectedHostData.memory.used / 1024).toFixed(2)} GB
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {(selectedHostData.memory.total / 1024).toFixed(2)} GB
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Free</p>
                    <p className="text-lg font-semibold text-green-600">
                      {(selectedHostData.memory.free / 1024).toFixed(2)} GB
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Available</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {(selectedHostData.memory.available / 1024).toFixed(2)} GB
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GPU Cards */}
          {selectedHostData.gpu.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">GPU Utilization</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {selectedHostData.gpu.map((gpu) => (
                  <div
                    key={gpu.index}
                    className="bg-white rounded-lg shadow-md border-2 border-blue-300 p-6"
                  >
                    <div className="flex items-center mb-4">
                      <Activity className="h-6 w-6 text-blue-600 mr-2" />
                      <h3 className="text-lg font-semibold text-gray-800">
                        {gpu.name} (Index {gpu.index})
                      </h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <p className="text-xs text-gray-600">GPU Utilization</p>
                          <p className="text-sm font-bold text-blue-600">
                            {gpu.gpuUtilization.toFixed(1)}%
                          </p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-blue-600 h-3 rounded-full transition-all"
                            style={{ width: `${Math.min(gpu.gpuUtilization, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <p className="text-xs text-gray-600">Memory Utilization</p>
                          <p className="text-sm font-bold text-green-600">
                            {gpu.memoryUtilization.toFixed(1)}%
                          </p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-green-600 h-3 rounded-full transition-all"
                            style={{ width: `${Math.min(gpu.memoryUtilization, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-200">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Memory Used</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {(gpu.memoryUsed / 1024).toFixed(2)} GB
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Memory Total</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {(gpu.memoryTotal / 1024).toFixed(2)} GB
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-600 mb-1">Temperature</p>
                          <p
                            className={`text-sm font-semibold ${
                              gpu.temperature > 80
                                ? 'text-red-600'
                                : gpu.temperature > 70
                                ? 'text-orange-600'
                                : 'text-green-600'
                            }`}
                          >
                            {gpu.temperature}°C
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedHostData.gpu.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-yellow-800">No GPU data available for this host</p>
            </div>
          )}
        </div>
      )}

      {/* Error State for Selected Host */}
      {selectedHostData?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800 font-semibold">Error loading host data</p>
          <p className="text-red-600 mt-2">{selectedHostData.error}</p>
        </div>
      )}

      {/* No Host Selected */}
      {!selectedHost && data && data.hosts.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600">Please select a host to view utilization details</p>
        </div>
      )}
    </div>
  );
};

