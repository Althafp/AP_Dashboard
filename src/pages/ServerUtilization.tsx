import React, { useEffect, useState } from 'react';

interface GPUSnapshot {
  timestamp: string;
  gpus: GPUData[];
}

interface GPUData {
  index: number;
  name: string;
  utilization: number; // percentage
  memoryUsed: number; // MiB
  memoryTotal: number; // MiB
}

interface GPUAverages {
  index: number;
  name: string;
  avgUtilization: number;
  avgMemoryUsed: number;
  avgMemoryTotal: number;
  dataPoints: number;
}

interface TimeRange {
  startTime: string;
  endTime: string;
  duration: string;
  totalSnapshots: number;
}

interface CPUSnapshot {
  timestamp: string;
  cpuUtil: number; // percentage
  ramUsed: number; // MiB
  ramTotal: number; // MiB
}

interface CPUAverages {
  avgCpuUtil: number;
  avgRamUsed: number;
  avgRamTotal: number;
  dataPoints: number;
}

export const ServerUtilization: React.FC = () => {
  const [snapshots, setSnapshots] = useState<GPUSnapshot[]>([]);
  const [gpuAverages, setGpuAverages] = useState<GPUAverages[]>([]);
  const [cpuSnapshots, setCpuSnapshots] = useState<CPUSnapshot[]>([]);
  const [cpuAverages, setCpuAverages] = useState<CPUAverages | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange | null>(null);
  const [cpuTimeRange, setCpuTimeRange] = useState<TimeRange | null>(null);

  useEffect(() => {
    loadGPUData(false);
    loadCPUData(false);
    
    // Set up auto-refresh every 10 seconds
    const interval = setInterval(() => {
      loadGPUData(true);
      loadCPUData(true);
    }, 10000); // 10 seconds

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  const loadGPUData = async (isAutoRefresh = false) => {
    try {
      if (isAutoRefresh) {
        setIsRefreshing(true);
      }
      
      // Fetch from API endpoint instead of static file
      const response = await fetch('/api/gpu-usage');
      if (!response.ok) {
        throw new Error(`Failed to load GPU data: ${response.statusText}`);
      }
      const csvText = await response.text();
      const lines = csvText.split('\n');
      const timestampCount = (csvText.match(/^Timestamp:/gm) || []).length;
      console.log('CSV loaded:', {
        length: csvText.length,
        lines: lines.length,
        timestamps: timestampCount,
        firstLine: lines[0]?.substring(0, 50),
        lastLine: lines[lines.length - 1]?.substring(0, 50) || lines[lines.length - 2]?.substring(0, 50),
      });
      parseGPUData(csvText);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading GPU data:', error);
      if (!isAutoRefresh) {
        setLoading(false);
      }
    } finally {
      if (isAutoRefresh) {
        setIsRefreshing(false);
      }
    }
  };

  const parseGPUData = (gpuUsageData: string) => {
    try {
      const lines = gpuUsageData.split('\n');
      const snapshots: GPUSnapshot[] = [];
      let currentTimestamp = '';
      let currentGPUs: GPUData[] = [];
      let expectHeader = false;

      console.log('Total lines in CSV:', lines.length);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines
        if (!line) continue;

        // Check for timestamp
        if (line.startsWith('Timestamp:')) {
          // Save previous snapshot if exists
          if (currentTimestamp && currentGPUs.length > 0) {
            snapshots.push({
              timestamp: currentTimestamp,
              gpus: [...currentGPUs],
            });
          }
          // Extract timestamp
          currentTimestamp = line.replace('Timestamp:', '').trim();
          currentGPUs = [];
          expectHeader = true; // Next line should be header
          continue;
        }

        // Check for separator
        if (line.startsWith('---')) {
          // If we hit a separator and have data, it means we finished a snapshot
          // But we already saved it when we saw the next timestamp, so just continue
          continue;
        }

        // Check for header line - skip it and set flag to expect data
        if (line.includes('index') && line.includes('name') && (line.includes('utilization.gpu') || line.includes('utilization'))) {
          expectHeader = false; // After header, expect data lines
          continue;
        }

        // Parse GPU data line (only if we have a timestamp and not expecting header)
        if (currentTimestamp && !expectHeader) {
          const parts = line.split(',').map((p) => p.trim());
          if (parts.length >= 5) {
            const index = parseInt(parts[0]);
            const name = parts[1];
            // Extract percentage from "9 %" or "9%"
            const utilizationStr = parts[2].replace('%', '').trim();
            const utilization = parseFloat(utilizationStr);
            // Extract number from "3637 MiB"
            const memoryUsed = parseFloat(parts[3].replace('MiB', '').trim());
            const memoryTotal = parseFloat(parts[4].replace('MiB', '').trim());

            if (!isNaN(index) && !isNaN(utilization) && !isNaN(memoryUsed) && !isNaN(memoryTotal)) {
              // Only include NVIDIA L4 GPUs with indices 0, 1, 2, or 3
              if (name === 'NVIDIA L4' && index >= 0 && index <= 3) {
                currentGPUs.push({
                  index,
                  name,
                  utilization,
                  memoryUsed,
                  memoryTotal,
                });
              } else {
                // Silently skip other GPUs (not NVIDIA L4 or index out of range)
                console.debug(`Skipping GPU: index=${index}, name=${name}`);
              }
            } else {
              console.warn('Failed to parse line:', line, { index, utilization, memoryUsed, memoryTotal });
            }
          } else {
            // Try alternative parsing if comma count is different
            console.warn('Unexpected line format:', line, 'Parts:', parts.length);
          }
        }
      }

      // Save last snapshot (important - don't miss the last one!)
      if (currentTimestamp && currentGPUs.length > 0) {
        snapshots.push({
          timestamp: currentTimestamp,
          gpus: [...currentGPUs],
        });
      }

      console.log('Parsed snapshots:', snapshots.length);
      if (snapshots.length > 0) {
        console.log('First snapshot:', snapshots[0].timestamp);
        console.log('Last snapshot:', snapshots[snapshots.length - 1].timestamp);
        console.log('Last snapshot GPUs:', snapshots[snapshots.length - 1].gpus.length);
      }
      setSnapshots(snapshots);

      // Calculate time range (start time, end time, duration)
      if (snapshots.length > 0) {
        const startTime = snapshots[0].timestamp;
        const endTime = snapshots[snapshots.length - 1].timestamp;
        
        // Parse timestamps (format: "2025-12-14 11:52:31")
        // Convert to ISO format for Date parsing
        const parseTimestamp = (ts: string) => {
          // Format: "2025-12-14 11:52:31" -> "2025-12-14T11:52:31"
          return new Date(ts.replace(' ', 'T'));
        };
        
        const startDate = parseTimestamp(startTime);
        const endDate = parseTimestamp(endTime);
        const durationMs = endDate.getTime() - startDate.getTime();
        
        // Format duration
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
        
        let durationStr = '';
        if (hours > 0) {
          durationStr = `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
          durationStr = `${minutes}m ${seconds}s`;
        } else {
          durationStr = `${seconds}s`;
        }

        setTimeRange({
          startTime,
          endTime,
          duration: durationStr,
          totalSnapshots: snapshots.length,
        });
      } else {
        setTimeRange(null);
      }

      // Calculate average for each GPU index across all timestamps
      if (snapshots.length > 0) {
        // Group GPUs by index
        const gpuDataByIndex = new Map<number, GPUData[]>();

        snapshots.forEach((snapshot) => {
          snapshot.gpus.forEach((gpu) => {
            if (!gpuDataByIndex.has(gpu.index)) {
              gpuDataByIndex.set(gpu.index, []);
            }
            gpuDataByIndex.get(gpu.index)!.push(gpu);
          });
        });

        // Calculate averages for each GPU index (only indices 0-3, NVIDIA L4)
        const averages: GPUAverages[] = [];
        gpuDataByIndex.forEach((gpuDataArray, index) => {
          // Only process NVIDIA L4 GPUs with indices 0-3
          if (gpuDataArray.length > 0 && index >= 0 && index <= 3 && gpuDataArray[0].name === 'NVIDIA L4') {
            const avgUtilization =
              gpuDataArray.reduce((sum, gpu) => sum + gpu.utilization, 0) / gpuDataArray.length;
            const avgMemoryUsed =
              gpuDataArray.reduce((sum, gpu) => sum + gpu.memoryUsed, 0) / gpuDataArray.length;
            const avgMemoryTotal =
              gpuDataArray.reduce((sum, gpu) => sum + gpu.memoryTotal, 0) / gpuDataArray.length;

            averages.push({
              index,
              name: gpuDataArray[0].name, // All should have same name
              avgUtilization: Math.round(avgUtilization * 10) / 10,
              avgMemoryUsed: Math.round(avgMemoryUsed * 10) / 10,
              avgMemoryTotal: Math.round(avgMemoryTotal * 10) / 10,
              dataPoints: gpuDataArray.length,
            });
          }
        });

        // Sort by index
        averages.sort((a, b) => a.index - b.index);
        setGpuAverages(averages);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error parsing GPU data:', error);
      setLoading(false);
    }
  };

  const loadCPUData = async (isAutoRefresh = false) => {
    try {
      if (isAutoRefresh) {
        setIsRefreshing(true);
      }
      
      const response = await fetch('/api/cpu-usage');
      if (!response.ok) {
        throw new Error(`Failed to load CPU data: ${response.statusText}`);
      }
      const csvText = await response.text();
      const lines = csvText.split('\n');
      console.log('CPU CSV loaded:', {
        length: csvText.length,
        lines: lines.length,
        firstLine: lines[0]?.substring(0, 50),
        lastLine: lines[lines.length - 1]?.substring(0, 50) || lines[lines.length - 2]?.substring(0, 50),
      });
      parseCPUData(csvText);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading CPU data:', error);
      if (!isAutoRefresh) {
        setLoading(false);
      }
    } finally {
      if (isAutoRefresh) {
        setIsRefreshing(false);
      }
    }
  };

  const parseCPUData = (cpuUsageData: string) => {
    try {
      const lines = cpuUsageData.split('\n');
      const snapshots: CPUSnapshot[] = [];

      // Skip header line (first line)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',').map((p) => p.trim());
        if (parts.length >= 4) {
          const timestamp = parts[0];
          const cpuUtil = parseFloat(parts[1]);
          const ramUsed = parseFloat(parts[2]);
          const ramTotal = parseFloat(parts[3]);

          if (!isNaN(cpuUtil) && !isNaN(ramUsed) && !isNaN(ramTotal)) {
            snapshots.push({
              timestamp,
              cpuUtil,
              ramUsed,
              ramTotal,
            });
          }
        }
      }

      console.log('Parsed CPU snapshots:', snapshots.length);
      if (snapshots.length > 0) {
        console.log('First CPU snapshot:', snapshots[0].timestamp);
        console.log('Last CPU snapshot:', snapshots[snapshots.length - 1].timestamp);
      }
      setCpuSnapshots(snapshots);

      // Calculate time range (start time, end time, duration) for CPU
      if (snapshots.length > 0) {
        const startTime = snapshots[0].timestamp;
        const endTime = snapshots[snapshots.length - 1].timestamp;
        
        // Parse timestamps (format: "2025-12-14 13:29:43")
        const parseTimestamp = (ts: string) => {
          // Format: "2025-12-14 13:29:43" -> "2025-12-14T13:29:43"
          return new Date(ts.replace(' ', 'T'));
        };
        
        const startDate = parseTimestamp(startTime);
        const endDate = parseTimestamp(endTime);
        const durationMs = endDate.getTime() - startDate.getTime();
        
        // Format duration
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
        
        let durationStr = '';
        if (hours > 0) {
          durationStr = `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
          durationStr = `${minutes}m ${seconds}s`;
        } else {
          durationStr = `${seconds}s`;
        }

        setCpuTimeRange({
          startTime,
          endTime,
          duration: durationStr,
          totalSnapshots: snapshots.length,
        });
      } else {
        setCpuTimeRange(null);
      }

      // Calculate averages
      if (snapshots.length > 0) {
        const avgCpuUtil = snapshots.reduce((sum, s) => sum + s.cpuUtil, 0) / snapshots.length;
        const avgRamUsed = snapshots.reduce((sum, s) => sum + s.ramUsed, 0) / snapshots.length;
        const avgRamTotal = snapshots.reduce((sum, s) => sum + s.ramTotal, 0) / snapshots.length;

        setCpuAverages({
          avgCpuUtil: Math.round(avgCpuUtil * 10) / 10,
          avgRamUsed: Math.round(avgRamUsed * 10) / 10,
          avgRamTotal: Math.round(avgRamTotal * 10) / 10,
          dataPoints: snapshots.length,
        });
      } else {
        setCpuAverages(null);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error parsing CPU data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Server Utilization</h1>
          <p className="text-sm text-gray-600 mt-1">
            GPU and CPU usage statistics
            {lastUpdate && (
              <span className="ml-2 text-gray-500">
                • Last updated: {lastUpdate.toLocaleTimeString()}
                {isRefreshing && (
                  <span className="ml-2 inline-block animate-spin">🔄</span>
                )}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Time Range Information - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GPU Time Range Information */}
        {timeRange && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md border-2 border-blue-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">GPU Data Time Range</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Start Time</p>
                <p className="text-lg font-semibold text-gray-900">{timeRange.startTime}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">End Time</p>
                <p className="text-lg font-semibold text-gray-900">{timeRange.endTime}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Duration</p>
                <p className="text-lg font-semibold text-blue-600">{timeRange.duration}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Total Snapshots</p>
                <p className="text-lg font-semibold text-purple-600">{timeRange.totalSnapshots}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-gray-500">
                Data refreshes every 10 seconds • CSV file is continuously updating
              </p>
            </div>
          </div>
        )}

        {/* CPU Time Range Information */}
        {cpuTimeRange && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg shadow-md border-2 border-orange-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">CPU Data Time Range</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Start Time</p>
                <p className="text-lg font-semibold text-gray-900">{cpuTimeRange.startTime}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">End Time</p>
                <p className="text-lg font-semibold text-gray-900">{cpuTimeRange.endTime}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Duration</p>
                <p className="text-lg font-semibold text-orange-600">{cpuTimeRange.duration}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Total Snapshots</p>
                <p className="text-lg font-semibold text-purple-600">{cpuTimeRange.totalSnapshots}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-orange-200">
              <p className="text-xs text-gray-500">
                Data refreshes every 10 seconds • CSV file is continuously updating
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Average Metrics - 5 Cards in One Row (4 GPUs + 1 CPU) */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Average Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* GPU Cards */}
          {gpuAverages.map((gpu) => (
            <div key={gpu.index} className="bg-white rounded-lg shadow-md border-2 border-gray-300 p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {gpu.name} (Index {gpu.index})
                </h3>
                <p className="text-xs text-gray-500 mt-1">{gpu.dataPoints} data points</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-600 font-medium mb-1">Average Utilization</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {gpu.avgUtilization}%
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-600 font-medium mb-1">Average Memory Used</p>
                  <p className="text-xl font-bold text-green-600">
                    {gpu.avgMemoryUsed.toFixed(0)} MiB
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-600 font-medium mb-1">Average Memory Total</p>
                  <p className="text-xl font-bold text-purple-600">
                    {gpu.avgMemoryTotal.toFixed(0)} MiB
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* CPU Card - Rightmost */}
          {cpuAverages && (
            <div className="bg-white rounded-lg shadow-md border-2 border-orange-300 p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800">CPU</h3>
                <p className="text-xs text-gray-500 mt-1">{cpuAverages.dataPoints} data points</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-600 font-medium mb-1">Average CPU Utilization</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {cpuAverages.avgCpuUtil}%
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-600 font-medium mb-1">Average RAM Used</p>
                  <p className="text-xl font-bold text-green-600">
                    {cpuAverages.avgRamUsed.toFixed(0)} MiB
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-600 font-medium mb-1">Average RAM Total</p>
                  <p className="text-xl font-bold text-purple-600">
                    {cpuAverages.avgRamTotal.toFixed(0)} MiB
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CPU Data Tables by Timestamp */}
      {cpuSnapshots.length > 0 && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md border-2 border-orange-300 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">CPU Utilization by Timestamp</h2>
            <p className="text-sm text-gray-600 mb-6">
              Showing CPU and RAM data for each timestamp
            </p>
            
            <div className="space-y-8">
              {cpuSnapshots.slice(-20).reverse().map((snapshot, snapshotIndex) => (
                <div key={snapshotIndex} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                  {/* Timestamp Header */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Timestamp: {snapshot.timestamp}
                    </h3>
                  </div>

                  {/* CPU Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                            CPU_Util_%
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                            RAM_Used_MiB
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                            RAM_Total_MiB
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="border border-gray-300 px-4 py-2 text-sm">
                            <span
                              className={`font-medium ${
                                snapshot.cpuUtil > 80
                                  ? 'text-red-600'
                                  : snapshot.cpuUtil > 50
                                  ? 'text-yellow-600'
                                  : 'text-green-600'
                              }`}
                            >
                              {snapshot.cpuUtil}%
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">
                            {snapshot.ramUsed.toFixed(0)} MiB
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">
                            {snapshot.ramTotal.toFixed(0)} MiB
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Separator (except for last item) */}
                  {snapshotIndex < cpuSnapshots.slice(-20).length - 1 && (
                    <div className="mt-6 text-center text-gray-400">----------------------------------</div>
                  )}
                </div>
              ))}
            </div>

            {cpuSnapshots.length === 0 && (
              <div className="p-6 text-center text-gray-500">No CPU data available</div>
            )}
          </div>
        </div>
      )}

      {/* GPU Data Tables by Timestamp */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md border-2 border-gray-300 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">GPU Utilization by Timestamp</h2>
          <p className="text-sm text-gray-600 mb-6">
            Showing individual GPU data for each timestamp
          </p>
          
          <div className="space-y-8">
            {snapshots.slice(-20).reverse().map((snapshot, snapshotIndex) => (
              <div key={snapshotIndex} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                {/* Timestamp Header */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Timestamp: {snapshot.timestamp}
                  </h3>
                </div>

                {/* GPU Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                          index
                        </th>
                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                          name
                        </th>
                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                          utilization
                        </th>
                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                          memory.u
                        </th>
                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                          memory.to
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.gpus.map((gpu, gpuIndex) => (
                        <tr 
                          key={gpuIndex} 
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                            {gpu.index}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                            {gpu.name}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-sm">
                            <span
                              className={`font-medium ${
                                gpu.utilization > 80
                                  ? 'text-red-600'
                                  : gpu.utilization > 50
                                  ? 'text-yellow-600'
                                  : 'text-green-600'
                              }`}
                            >
                              {gpu.utilization}%
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">
                            {gpu.memoryUsed.toFixed(0)} MiB
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">
                            {gpu.memoryTotal.toFixed(0)} MiB
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Separator (except for last item) */}
                {snapshotIndex < snapshots.slice(-20).length - 1 && (
                  <div className="mt-6 text-center text-gray-400">----------------------------------</div>
                )}
              </div>
            ))}
          </div>

          {snapshots.length === 0 && (
            <div className="p-6 text-center text-gray-500">No data available</div>
          )}
        </div>
      </div>
    </div>
  );
};

