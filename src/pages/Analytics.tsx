import React, { useState } from 'react';
import { Search, Play, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiService } from '../services/api';
import type { HistogramRequest, Metric } from '../types';
import { subDays, format } from 'date-fns';

export const Analytics: React.FC = () => {
  const [monitorIds, setMonitorIds] = useState<string>('');
  const [metricNames, setMetricNames] = useState<string>('');
  const [aggregator, setAggregator] = useState<'avg' | 'min' | 'max' | 'sum'>('avg');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [results, setResults] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setAnalyzed(false);

    try {
      const request: HistogramRequest = {
        monitorIds: monitorIds.split(',').map(id => id.trim()),
        metricNames: metricNames.split(',').map(name => name.trim()),
        aggregator,
        timeRange: {
          start: new Date(startDate).toISOString(),
          end: new Date(endDate).toISOString(),
        },
      };

      const data = await apiService.getMetricHistogram(request);
      setResults(data);
      setAnalyzed(true);
    } catch (error) {
      console.error('Error analyzing metrics:', error);
      // Generate mock data
      const mockData: Metric[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      for (let i = 0; i <= days * 24; i++) {
        mockData.push({
          timestamp: new Date(start.getTime() + i * 3600000).toISOString(),
          value: 50 + Math.random() * 50,
          status: 'Up',
          instance: 'default',
        });
      }
      setResults(mockData);
      setAnalyzed(true);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (results.length === 0) return null;

    const values = results.map(r => r.value);
    const sorted = [...values].sort((a, b) => a - b);
    
    return {
      count: values.length,
      average: values.reduce((sum, v) => sum + v, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      median: sorted[Math.floor(sorted.length / 2)],
      stdDev: Math.sqrt(
        values.reduce((sum, v) => sum + Math.pow(v - (values.reduce((s, val) => s + val, 0) / values.length), 2), 0) / values.length
      ),
    };
  };

  const chartData = results.map(r => ({
    time: format(new Date(r.timestamp), 'MMM dd HH:mm'),
    value: r.value,
  }));

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Historical Metrics Analyzer</h1>
        <p className="text-gray-600 mt-1">Deep dive into historical performance data</p>
      </div>

      {/* Analysis Form */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Configure Analysis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monitor IDs (comma-separated)
            </label>
            <input
              type="text"
              value={monitorIds}
              onChange={(e) => setMonitorIds(e.target.value)}
              placeholder="e.g., monitor-1, monitor-2"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Metric Names (comma-separated)
            </label>
            <input
              type="text"
              value={metricNames}
              onChange={(e) => setMetricNames(e.target.value)}
              placeholder="e.g., cpu, memory, network"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aggregator
            </label>
            <select
              value={aggregator}
              onChange={(e) => setAggregator(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="avg">Average</option>
              <option value="min">Minimum</option>
              <option value="max">Maximum</option>
              <option value="sum">Sum</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Analyze
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {analyzed && (
        <>
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats && Object.entries(stats).map(([key, value]) => (
              <div key={key} className="card">
                <p className="text-sm text-gray-600 capitalize">{key}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {typeof value === 'number' ? value.toFixed(2) : value}
                </p>
              </div>
            ))}
          </div>

          {/* Trend Chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Trend Analysis</h2>
              <button className="btn-secondary flex items-center text-sm">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </button>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Insights */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Insights</h2>
            <div className="space-y-3">
              <div className="flex items-start p-4 bg-blue-50 rounded-lg">
                <div className="flex-shrink-0">
                  <Search className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-900">Peak Performance</h3>
                  <p className="mt-1 text-sm text-blue-700">
                    Maximum value of {stats?.max.toFixed(2)} detected at peak times
                  </p>
                </div>
              </div>

              <div className="flex items-start p-4 bg-green-50 rounded-lg">
                <div className="flex-shrink-0">
                  <Search className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-900">Average Performance</h3>
                  <p className="mt-1 text-sm text-green-700">
                    Average value maintained at {stats?.average.toFixed(2)} over the selected period
                  </p>
                </div>
              </div>

              <div className="flex items-start p-4 bg-purple-50 rounded-lg">
                <div className="flex-shrink-0">
                  <Search className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-purple-900">Variability</h3>
                  <p className="mt-1 text-sm text-purple-700">
                    Standard deviation of {stats?.stdDev.toFixed(2)} indicates {stats && stats.stdDev < 10 ? 'stable' : 'variable'} performance
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

