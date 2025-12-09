// Monitor Types - Updated to match Motadata API format
export interface Monitor {
  id: number | string;
  'object.id'?: number;
  'object.name': string;
  'object.ip'?: string;
  'object.type': string;
  'object.state': string;  // ENABLE/DISABLE
  'object.groups'?: number[];
  'object.vendor'?: string;
  'object.category'?: string;
  'object.creation.time'?: string;
  'object.modification.time'?: string;
  'object.host'?: string;
  'object.target'?: string;
  'object.make.model'?: string;
  'object.discovery.method'?: string;
  // Mapped fields for backward compatibility
  name?: string;
  type?: string;
  status?: MonitorStatus;
  severity?: Severity;
  lastPollTime?: string;
  group?: string | number;
  [key: string]: any; // Allow any additional properties from API
}

export type MonitorStatus = 'Up' | 'Down' | 'Warning' | 'Unreachable' | 'Unknown' | 'ENABLE' | 'DISABLE';
export type Severity = 'Critical' | 'Major' | 'Warning' | 'Clear';

// Instance Types - Updated to match API response
export interface MonitorInstance {
  status?: string;
  interface?: string;
  'interface.name'?: string;
  'interface.index'?: string;
  'interface.address'?: string;
  'interface.description'?: string;
  'interface.type'?: string;
  'interface.bit.type'?: string;
  'interface.speed.bytes.per.sec'?: number;
  // Legacy fields for backward compatibility
  id?: string;
  name?: string;
  metricCount?: number;
  lastUpdated?: string;
}

// Poll Info Types - Updated to match API response
export interface PollInfo {
  Availability?: number;
  'Network Interface'?: number;
  'Routing Protocol'?: number;
  // Legacy fields for backward compatibility
  metricGroup?: string;
  lastPollTime?: string;
  values?: Record<string, any>;
}

// Dashboard & Widget Types
export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

export interface Widget {
  id: string;
  title: string;
  type: WidgetType;
  dashboardId: string;
}

export type WidgetType = 'line' | 'area' | 'bar' | 'pie' | 'gauge' | 'heatmap' | 'donut';

export interface WidgetData {
  widgetId: string;
  data: any;
  timestamp: string;
}

// Metric Types
export interface Metric {
  timestamp: string;
  value: number;
  status: MonitorStatus;
  instance: string;
}

export interface HistogramRequest {
  monitorIds: string[];
  metricNames: string[];
  aggregator: 'avg' | 'min' | 'max' | 'sum';
  timeRange: {
    start: string;
    end: string;
  };
}

// Status Summary
export interface StatusSummary {
  total: number;
  up: number;
  down: number;
  warning: number;
  unreachable: number;
  unknown: number;
}

export interface SeveritySummary {
  critical: number;
  major: number;
  warning: number;
  clear: number;
}

// Alert Types
export interface Alert {
  id: string;
  monitorId: string;
  monitorName: string;
  severity: Severity;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

