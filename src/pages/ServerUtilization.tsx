import React, { useEffect, useState } from 'react';

interface GPUStats {
  district: string;
  records: Array<{
    timestamp: string;
    nodes: Array<{
      node: string;
      status: string;
      gpu_count: number;
      gpus: Array<{
        index: string;
        uuid: string;
        name: string;
        'utilization.gpu': string;
        'utilization.memory': string;
        'memory.used': string;
        'memory.total': string;
        'temperature.gpu': string;
        'power.draw': string;
        'fan.speed': string;
      }>;
    }>;
  }>;
}

interface GPUAverages {
  node: string;
  index: string;
  uuid: string;
  name: string;
  avgGpuUtil: number;
  avgMemUtil: number;
  avgMemoryUsed: number;
  avgMemoryTotal: number;
  avgTemperature: number;
  avgPowerDraw: number;
  dataPoints: number;
}

interface NodeSummary {
  node: string;
  status: string;
  gpuCount: number;
  avgGpuUtil: number;
  avgMemUtil: number;
  avgTemperature: number;
  avgPowerDraw: number;
  totalGpus: number;
}

export const ServerUtilization: React.FC = () => {
  const [gpuStats, setGpuStats] = useState<GPUStats | null>(null);
  const [gpuAverages, setGpuAverages] = useState<GPUAverages[]>([]);
  const [nodeSummaries, setNodeSummaries] = useState<NodeSummary[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadGPUStats(false);
    
    // Set up auto-refresh every 5 minutes (300000ms)
    const interval = setInterval(() => {
      loadGPUStats(true);
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  const loadGPUStats = async (isAutoRefresh = false) => {
    try {
      if (isAutoRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/gpu-stats');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Failed to load GPU stats: ${response.statusText}`);
      }

      const data: GPUStats = await response.json();
      setGpuStats(data);
      const { gpuAverages: averages, nodeSummaries: summaries } = calculateAverages(data);
      setGpuAverages(averages);
      setNodeSummaries(summaries);
      setLastUpdate(new Date());
    } catch (error: any) {
      console.error('Error loading GPU stats:', error);
      setError(error.message || 'Failed to load GPU stats');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const calculateAverages = (data: GPUStats) => {
    // Map to store GPU data by node+index+uuid (unique GPU identifier)
    const gpuMap = new Map<string, {
      node: string;
      index: string;
      uuid: string;
      name: string;
      gpuUtils: number[];
      memUtils: number[];
      memoryUsed: number[];
      memoryTotal: number[];
      temperatures: number[];
      powerDraws: number[];
    }>();

    // Map to store node summaries
    const nodeMap = new Map<string, {
      node: string;
      status: string;
      gpuCount: number;
      gpuUtils: number[];
      memUtils: number[];
      temperatures: number[];
      powerDraws: number[];
    }>();

    // Iterate through all records (timestamps)
    data.records.forEach(record => {
      // Iterate through all nodes
      record.nodes.forEach(nodeData => {
        // Initialize node summary if not exists
        if (!nodeMap.has(nodeData.node)) {
          nodeMap.set(nodeData.node, {
            node: nodeData.node,
            status: nodeData.status,
            gpuCount: nodeData.gpu_count,
            gpuUtils: [],
            memUtils: [],
            temperatures: [],
            powerDraws: []
          });
        }

        const nodeSummary = nodeMap.get(nodeData.node)!;

        // Iterate through all GPUs in this node
        nodeData.gpus.forEach(gpu => {
          const key = `${nodeData.node}-${gpu.index}-${gpu.uuid}`;
          
          if (!gpuMap.has(key)) {
            gpuMap.set(key, {
              node: nodeData.node,
              index: gpu.index,
              uuid: gpu.uuid,
              name: gpu.name,
              gpuUtils: [],
              memUtils: [],
              memoryUsed: [],
              memoryTotal: [],
              temperatures: [],
              powerDraws: []
            });
          }

          const gpuData = gpuMap.get(key)!;
          
          // Parse and add values
          const gpuUtil = parseFloat(gpu['utilization.gpu']) || 0;
          const memUtil = parseFloat(gpu['utilization.memory']) || 0;
          const memUsed = parseFloat(gpu['memory.used']) || 0;
          const memTotal = parseFloat(gpu['memory.total']) || 0;
          const temp = parseFloat(gpu['temperature.gpu']) || 0;
          const power = parseFloat(gpu['power.draw']) || 0;

          gpuData.gpuUtils.push(gpuUtil);
          gpuData.memUtils.push(memUtil);
          gpuData.memoryUsed.push(memUsed);
          gpuData.memoryTotal.push(memTotal);
          gpuData.temperatures.push(temp);
          gpuData.powerDraws.push(power);

          // Add to node summary
          nodeSummary.gpuUtils.push(gpuUtil);
          nodeSummary.memUtils.push(memUtil);
          nodeSummary.temperatures.push(temp);
          nodeSummary.powerDraws.push(power);
        });
      });
    });

    // Calculate averages for each GPU
    const averages: GPUAverages[] = Array.from(gpuMap.values()).map(gpuData => {
      const dataPoints = gpuData.gpuUtils.length;
      
      return {
        node: gpuData.node,
        index: gpuData.index,
        uuid: gpuData.uuid,
        name: gpuData.name,
        avgGpuUtil: dataPoints > 0 
          ? gpuData.gpuUtils.reduce((sum, val) => sum + val, 0) / dataPoints 
          : 0,
        avgMemUtil: dataPoints > 0 
          ? gpuData.memUtils.reduce((sum, val) => sum + val, 0) / dataPoints 
          : 0,
        avgMemoryUsed: dataPoints > 0 
          ? gpuData.memoryUsed.reduce((sum, val) => sum + val, 0) / dataPoints 
          : 0,
        avgMemoryTotal: dataPoints > 0 
          ? gpuData.memoryTotal.reduce((sum, val) => sum + val, 0) / dataPoints 
          : 0,
        avgTemperature: dataPoints > 0 
          ? gpuData.temperatures.reduce((sum, val) => sum + val, 0) / dataPoints 
          : 0,
        avgPowerDraw: dataPoints > 0 
          ? gpuData.powerDraws.reduce((sum, val) => sum + val, 0) / dataPoints 
          : 0,
        dataPoints
      };
    });

    // Sort by node IP, then by GPU index
    averages.sort((a, b) => {
      if (a.node !== b.node) {
        return a.node.localeCompare(b.node);
      }
      return parseInt(a.index) - parseInt(b.index);
    });

    // Calculate node summaries
    const summaries: NodeSummary[] = Array.from(nodeMap.values()).map(nodeData => {
      const totalDataPoints = nodeData.gpuUtils.length;
      const gpuCount = nodeData.gpuCount;
      
      return {
        node: nodeData.node,
        status: nodeData.status,
        gpuCount: gpuCount,
        avgGpuUtil: totalDataPoints > 0
          ? nodeData.gpuUtils.reduce((sum, val) => sum + val, 0) / totalDataPoints
          : 0,
        avgMemUtil: totalDataPoints > 0
          ? nodeData.memUtils.reduce((sum, val) => sum + val, 0) / totalDataPoints
          : 0,
        avgTemperature: totalDataPoints > 0
          ? nodeData.temperatures.reduce((sum, val) => sum + val, 0) / totalDataPoints
          : 0,
        avgPowerDraw: totalDataPoints > 0
          ? nodeData.powerDraws.reduce((sum, val) => sum + val, 0) / totalDataPoints
          : 0,
        totalGpus: gpuCount
      };
    });

    // Sort node summaries by IP
    summaries.sort((a, b) => a.node.localeCompare(b.node));

    return { gpuAverages: averages, nodeSummaries: summaries };
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Server Utilization</h1>
        <p className="text-gray-600">GPU statistics from remote server (172.30.51.72)</p>
      </div>

      {/* Status Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm text-gray-600">District</p>
            <p className="text-lg font-semibold text-gray-900">
              {gpuStats?.district?.toUpperCase() || 'Loading...'}
            </p>
          </div>
          {lastUpdate && (
            <div>
              <p className="text-sm text-gray-600">Last Update</p>
              <p className="text-lg font-semibold text-gray-900">
                {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
          )}
          {gpuStats && (
            <div>
              <p className="text-sm text-gray-600">Total Nodes</p>
              <p className="text-lg font-semibold text-gray-900">
                {nodeSummaries.length}
              </p>
            </div>
          )}
          {selectedNode && (
            <div>
              <p className="text-sm text-gray-600">Selected Node</p>
              <p className="text-lg font-semibold text-blue-600">
                {selectedNode}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {selectedNode && (
            <button
              onClick={() => setSelectedNode(null)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Show All Nodes
            </button>
          )}
          <button
            onClick={() => loadGPUStats(false)}
            disabled={loading || isRefreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isRefreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Refreshing...
              </>
            ) : (
              'Refresh'
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 font-semibold">Error: {error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && !gpuStats && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading GPU statistics...</p>
          </div>
        </div>
      )}

      {/* Node Cards - Show when no node is selected */}
      {!loading && !selectedNode && nodeSummaries.length > 0 && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Nodes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {nodeSummaries.map((node) => (
              <div
                key={node.node}
                onClick={() => setSelectedNode(node.node)}
                className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200 hover:border-blue-500 hover:shadow-xl transition-all cursor-pointer"
              >
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{node.node}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      node.status === 'ok' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {node.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{node.totalGpus} GPU{node.totalGpus !== 1 ? 's' : ''}</p>
                </div>

                <div className="space-y-3">
                  {/* Average GPU Utilization */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">Avg GPU Util</span>
                      <span className="text-sm font-bold text-gray-900">
                        {node.avgGpuUtil.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(node.avgGpuUtil, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Average Memory Utilization */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">Avg Memory Util</span>
                      <span className="text-sm font-bold text-gray-900">
                        {node.avgMemUtil.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(node.avgMemUtil, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Temperature & Power */}
                  <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Avg Temp</p>
                      <p className="text-lg font-bold text-gray-900">
                        {node.avgTemperature.toFixed(1)}°C
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Avg Power</p>
                      <p className="text-lg font-bold text-gray-900">
                        {node.avgPowerDraw.toFixed(2)} W
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-blue-600 font-semibold text-center">
                    Click to view GPU details →
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GPU Cards - Show when a node is selected */}
      {!loading && selectedNode && gpuAverages.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900">
              GPUs on Node: {selectedNode}
            </h2>
            <button
              onClick={() => setSelectedNode(null)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
            >
              ← Back to Nodes
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {gpuAverages
              .filter(gpu => gpu.node === selectedNode)
              .map((gpu) => (
                <div
                  key={`${gpu.node}-${gpu.index}-${gpu.uuid}`}
                  className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow"
                >
              {/* Header */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900">GPU {gpu.index}</h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {gpu.name}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Node: {gpu.node}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {gpu.dataPoints} data point{gpu.dataPoints !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Metrics */}
              <div className="space-y-3">
                {/* GPU Utilization */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">GPU Utilization</span>
                    <span className="text-sm font-bold text-gray-900">
                      {gpu.avgGpuUtil.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(gpu.avgGpuUtil, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Memory Utilization */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">Memory Utilization</span>
                    <span className="text-sm font-bold text-gray-900">
                      {gpu.avgMemUtil.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(gpu.avgMemUtil, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Memory Details */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Memory Used</span>
                    <span className="font-semibold text-gray-900">
                      {gpu.avgMemoryUsed.toFixed(0)} MB
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Memory Total</span>
                    <span className="font-semibold text-gray-900">
                      {gpu.avgMemoryTotal.toFixed(0)} MB
                    </span>
                  </div>
                </div>

                {/* Temperature & Power */}
                <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Temperature</p>
                    <p className="text-lg font-bold text-gray-900">
                      {gpu.avgTemperature.toFixed(1)}°C
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Power Draw</p>
                    <p className="text-lg font-bold text-gray-900">
                      {gpu.avgPowerDraw.toFixed(2)} W
                    </p>
                  </div>
                </div>
              </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && gpuAverages.length === 0 && !error && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 text-lg">No GPU data available</p>
        </div>
      )}
    </div>
  );
};
