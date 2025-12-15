import React, { useEffect, useState } from 'react';
import { Cpu, Activity, HardDrive } from 'lucide-react';

type District = 'all' | 'guntur' | 'krishna-urban' | 'krishna-rural';

interface CpuHostData {
  host: string;
  cpuUtilization: number;
  memoryUtilization: number;
  memoryTotal: number;
  memoryUsed: number;
  memoryFree: number;
  memoryAvailable: number;
  district: District | 'unknown';
  error?: string;
}

interface CpuUtilizationResponse {
  timestamp: string;
  totalHosts: number;
  hosts: CpuHostData[];
  districts?: {
    guntur: CpuHostData[];
    'krishna-urban': CpuHostData[];
    'krishna-rural': CpuHostData[];
  };
  note?: string;
}

export const CpuUtilization: React.FC = () => {
  const [data, setData] = useState<CpuUtilizationResponse | null>(null);
  const [selectedHost, setSelectedHost] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<District>('all');
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from existing JSON snapshot (no SSH)
  const loadFromFile = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/cpu_utilization.json', { cache: 'no-cache' });
      if (!response.ok) {
        // If file doesn't exist yet, just show empty state
        setData({
          timestamp: new Date().toISOString(),
          totalHosts: 0,
          hosts: [],
        });
        return;
      }
      const jsonData: CpuUtilizationResponse = await response.json();
      setData(jsonData);

      if (!selectedHost && jsonData.hosts.length > 0) {
        setSelectedHost(jsonData.hosts[0].host);
      }
    } catch (err) {
      console.error('Error loading CPU utilization from file:', err);
      setError(err instanceof Error ? err.message : 'Failed to load CPU utilization data');
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  // Fetch live snapshot (SSH -> top) and overwrite JSON
  const fetchLiveSnapshot = async () => {
    try {
      setIsFetching(true);
      setError(null);

      const response = await fetch('/api/cpu-utilization-hosts', { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`Failed to fetch CPU utilization: ${response.statusText}`);
      }
      const jsonData: CpuUtilizationResponse = await response.json();
      setData(jsonData);

      if (!selectedHost && jsonData.hosts.length > 0) {
        setSelectedHost(jsonData.hosts[0].host);
      }
    } catch (err) {
      console.error('Error fetching live CPU utilization:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch CPU utilization data');
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const handleFetch = () => {
    fetchLiveSnapshot();
  };

  const handleDistrictChange = (district: District) => {
    setSelectedDistrict(district);
    setSelectedHost(null);
  };

  useEffect(() => {
    // Initial load only reads from existing JSON file (no SSH)
    loadFromFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleHosts =
    data?.hosts.filter((h) =>
      selectedDistrict === 'all' ? true : h.district === selectedDistrict
    ) || [];

  const selectedHostData = visibleHosts.find((h) => h.host === selectedHost);

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
          onClick={loadFromFile}
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
          <h1 className="text-3xl font-bold text-gray-900">CPU Utilization</h1>
          <p className="text-sm text-gray-600 mt-1">
            Live CPU utilization from LPU hosts (top command)
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
            <option value="all">All (Guntur + Krishna Urban + Krishna Rural)</option>
            <option value="guntur">Guntur</option>
            <option value="krishna-urban">Krishna Urban</option>
            <option value="krishna-rural">Krishna Rural</option>
          </select>

          {/* Fetch Button */}
          <button
            onClick={handleFetch}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isFetching}
          >
            <Activity className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Fetching...' : 'Fetch'}
          </button>
        </div>
      </div>

      {/* Note if no hosts */}
            {data && visibleHosts.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          No LPU hosts found for this district in the TMS Excel file.
        </div>
      )}

      {/* Host Selection Dropdown */}
      {visibleHosts.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border-2 border-gray-300 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Host</h2>
          <select
            value={selectedHost || ''}
            onChange={(e) => setSelectedHost(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select a host --</option>
            {visibleHosts.map((host) => (
              <option key={host.host} value={host.host}>
                {host.host} ({host.district}) - CPU: {host.cpuUtilization.toFixed(1)}%
                {host.memoryUtilization !== undefined ? `, Memory: ${host.memoryUtilization.toFixed(1)}%` : ''}
                {host.error ? ' - Error' : ''}
              </option>
            ))}
          </select>
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
                    <p className="text-sm text-gray-600">Host: {selectedHostData.host}</p>
                    <p className="text-xs text-gray-500">District: {selectedHostData.district}</p>
                  </div>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm text-gray-600">Utilization</p>
                    <p className="text-lg font-bold text-orange-600">
                      {selectedHostData.cpuUtilization.toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-orange-600 h-4 rounded-full transition-all"
                      style={{ width: `${Math.min(selectedHostData.cpuUtilization, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Memory Card */}
            {selectedHostData.memoryUtilization !== undefined && (
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
                        {selectedHostData.memoryUtilization.toFixed(1)}%
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-purple-600 h-4 rounded-full transition-all"
                        style={{ width: `${Math.min(selectedHostData.memoryUtilization, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Used</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {((selectedHostData.memoryUsed || 0) / 1024).toFixed(2)} GB
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Total</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {((selectedHostData.memoryTotal || 0) / 1024).toFixed(2)} GB
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Free</p>
                      <p className="text-lg font-semibold text-green-600">
                        {((selectedHostData.memoryFree || 0) / 1024).toFixed(2)} GB
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Available</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {((selectedHostData.memoryAvailable || 0) / 1024).toFixed(2)} GB
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
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
      {!selectedHost && visibleHosts.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600">Please select a host to view CPU details</p>
        </div>
      )}
    </div>
  );
};


