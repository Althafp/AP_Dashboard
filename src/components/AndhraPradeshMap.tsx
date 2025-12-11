/// <reference types="vite/client" />
import React, { useEffect, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiService } from '../services/api';
import { parseExcelFile, DistrictCameraMap, normalizeDistrictName, getDistrictDisplayName } from '../utils/excelParser';

interface DistrictInfo {
  name: string;
  feature: any;
}

type DeviceType = 'Cameras' | 'Servers' | 'APIs' | 'GPUs' | 'UPS';

// UPS District Code Mapping
const UPS_DISTRICT_CODES: Record<string, string> = {
  'KNL': 'KURNOOL',
  'CTR': 'CHITTOOR',
  'EGD': 'EAST GODAVARI',
  'EAST': 'EAST GODAVARI',
  'VSKP': 'VISAKHAPATNAM',
  'WDG': 'WEST GODAVARI',
  'PRK': 'PRAKASAM',
  'VZM': 'VIZIANAGARAM',
  'KRI': 'KRISHNA',
  'ATP': 'ANANTAPUR',
  'SRK': 'SRIKAKULAM',
  'NLR': 'NELLORE',
  'KDP': 'KADAPA'
};

// Helper function to get district name from UPS code
const getDistrictFromUPSCode = (code: string): string | null => {
  const upperCode = code.toUpperCase();
  return UPS_DISTRICT_CODES[upperCode] || null;
};

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export const AndhraPradeshMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType>('Cameras');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [districtCameraMap, setDistrictCameraMap] = useState<DistrictCameraMap>({});
  const [deviceStats, setDeviceStats] = useState<{ up: number; down: number } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showDownList, setShowDownList] = useState(false);
  const [downDevicesList, setDownDevicesList] = useState<any[]>([]);
  const [loadingDownList, setLoadingDownList] = useState(false);
  const [deviceTypeCounts, setDeviceTypeCounts] = useState<Record<DeviceType, number>>({
    Cameras: 0,
    Servers: 0,
    APIs: 0,
    GPUs: 0,
    UPS: 0
  });
  const mapInstanceRef = useRef<any>(null);
  const dataLayerRef = useRef<any>(null);
  const districtsRef = useRef<Map<string, DistrictInfo>>(new Map());
  const isInitializedRef = useRef(false);

  // Load Excel file on mount
  useEffect(() => {
    loadExcelData();
    loadDeviceTypeCounts();
  }, []);

  // Load device type counts for dropdown
  const loadDeviceTypeCounts = async () => {
    try {
      // Fetch all monitors to count by type
      const [upResponse, downResponse] = await Promise.all([
        apiService.getApi().get('/query/objects/status?status=Up'),
        apiService.getApi().get('/query/objects/status?status=Down'),
      ]);

      const upMonitors = upResponse.data.result || upResponse.data || [];
      const downMonitors = downResponse.data.result || downResponse.data || [];
      const allMonitors = [...upMonitors, ...downMonitors];

      // Count each device type
      const counts: Record<DeviceType, number> = {
        Cameras: 0,
        Servers: 0,
        APIs: 0,
        GPUs: 0,
        UPS: 0
      };

      allMonitors.forEach((monitor: any) => {
        const name = (monitor['object.name'] || '').toLowerCase();
        const host = (monitor['object.host'] || '').toLowerCase();

        // Cameras
        if (name.includes('cam')) {
          counts.Cameras++;
        }
        // Servers
        if (name.includes('server') && !name.includes('cam')) {
          counts.Servers++;
        }
        // APIs
        if (name.includes('_api/')) {
          counts.APIs++;
        }
        // GPUs
        if (name.includes('gpu') || host.includes('gpu')) {
          counts.GPUs++;
        }
        // UPS
        if (name.includes('_ups')) {
          counts.UPS++;
        }
      });

      setDeviceTypeCounts(counts);
    } catch (error) {
      console.error('Error loading device type counts:', error);
    }
  };

  // Load device stats when district or device type changes, or on mount
  useEffect(() => {
    // Wait for Excel data to load before processing district-specific stats
    if (selectedDistrict && Object.keys(districtCameraMap).length === 0) {
      return; // Wait for Excel data
    }
    
    if (selectedDistrict) {
      // Load district-specific stats
      loadDeviceStats(selectedDistrict, selectedDeviceType);
    } else {
      // Load whole state stats (when no district selected or on mount)
      loadWholeStateStats();
    }
  }, [selectedDistrict, selectedDeviceType, districtCameraMap]);

  const loadExcelData = async () => {
    try {
      const map = await parseExcelFile('/Book1.xlsx');
      setDistrictCameraMap(map);
    } catch (error) {
      console.error('Error loading Excel data:', error);
    }
  };

  const loadWholeStateStats = async () => {
    setLoadingStats(true);
    try {
      // Fetch Up and Down monitors for whole state
      const [upResponse, downResponse] = await Promise.all([
        apiService.getApi().get('/query/objects/status?status=Up'),
        apiService.getApi().get('/query/objects/status?status=Down'),
      ]);

      const upMonitors = upResponse.data.result || upResponse.data || [];
      const downMonitors = downResponse.data.result || downResponse.data || [];

      // Count devices by type for whole state (same logic as MainDashboard)
      const stats = countDevicesByType(upMonitors, downMonitors, selectedDeviceType, null, null);
      
      console.log(`Whole State ${selectedDeviceType} Stats:`, stats);
      setDeviceStats(stats);
    } catch (error) {
      console.error('Error loading whole state stats:', error);
      setDeviceStats({ up: 0, down: 0 });
    } finally {
      setLoadingStats(false);
    }
  };

  const loadDeviceStats = async (district: string, deviceType: DeviceType) => {
    setLoadingStats(true);
    try {
      // Use normalizeDistrictName to map GeoJSON name to Excel OLD DISTRICT name
      const excelDistrictName = normalizeDistrictName(district);
      const cameraIPs = districtCameraMap[excelDistrictName] || [];
      
      console.log(`Loading ${deviceType} stats for district: ${district} -> Excel: ${excelDistrictName}`);

      // Fetch Up and Down monitors
      const [upResponse, downResponse] = await Promise.all([
        apiService.getApi().get('/query/objects/status?status=Up'),
        apiService.getApi().get('/query/objects/status?status=Down'),
      ]);

      const upMonitors = upResponse.data.result || upResponse.data || [];
      const downMonitors = downResponse.data.result || downResponse.data || [];

      // Count devices by type for this district
      // Pass district name for server filtering, cameraIPs for camera filtering
      const stats = countDevicesByType(upMonitors, downMonitors, deviceType, cameraIPs, excelDistrictName);
      
      console.log(`District ${district} ${deviceType} Stats:`, stats);
      setDeviceStats(stats);
    } catch (error) {
      console.error(`Error loading ${deviceType} stats:`, error);
      setDeviceStats({ up: 0, down: 0 });
    } finally {
      setLoadingStats(false);
    }
  };

  // Format duration in human-readable format
  const formatDuration = (eventTimestamp: number): string => {
    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
    const durationSeconds = currentTime - eventTimestamp;
    
    if (durationSeconds < 60) {
      return `${durationSeconds} second${durationSeconds !== 1 ? 's' : ''}`;
    }
    
    const days = Math.floor(durationSeconds / 86400);
    const hours = Math.floor((durationSeconds % 86400) / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    
    const parts: string[] = [];
    if (days > 0) {
      parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    }
    if (hours > 0) {
      parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    }
    if (minutes > 0 && days === 0) {
      parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    }
    
    return parts.length > 0 ? parts.join(' ') : 'Just now';
  };

  // Format duration between two timestamps (timestamp - lastTriggered)
  const formatDurationBetween = (timestamp: number, lastTriggered: number): string => {
    // Normalize timestamps to seconds
    // If values are > 1e12, they're in milliseconds, convert to seconds
    let tsSeconds = timestamp;
    let ltSeconds = lastTriggered;
    
    if (Math.abs(timestamp) > 1e12) {
      tsSeconds = timestamp / 1000;
    }
    if (Math.abs(lastTriggered) > 1e12) {
      ltSeconds = lastTriggered / 1000;
    }
    
    // timestamp is older (long ago), lastTriggered is recent
    // Calculate difference: lastTriggered - timestamp (recent - old = positive duration)
    let durationSeconds = ltSeconds - tsSeconds;
    
    // If result is negative, try swapping (maybe timestamp is actually recent)
    if (durationSeconds < 0) {
      durationSeconds = Math.abs(durationSeconds);
      // If still huge, might be wrong values - use absolute difference
      if (durationSeconds > 86400 * 365 * 10) { // More than 10 years seems wrong
        console.warn('Suspicious duration calculation:', { timestamp, lastTriggered, durationSeconds });
        // Fall back to showing time since timestamp
        return formatDuration(tsSeconds);
      }
    }
    
    durationSeconds = Math.abs(durationSeconds);
    
    // Cap at reasonable maximum (e.g., 1 year)
    if (durationSeconds > 86400 * 365) {
      return 'More than 1 year';
    }
    
    if (durationSeconds < 60) {
      return `${Math.floor(durationSeconds)} second${Math.floor(durationSeconds) !== 1 ? 's' : ''}`;
    }
    
    const days = Math.floor(durationSeconds / 86400);
    const hours = Math.floor((durationSeconds % 86400) / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    const seconds = Math.floor(durationSeconds % 60);
    
    const parts: string[] = [];
    if (days > 0) {
      parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    }
    if (hours > 0) {
      parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    }
    if (minutes > 0) {
      parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    }
    if (seconds > 0 && days === 0 && hours === 0) {
      parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
    }
    
    return parts.length > 0 ? parts.join(' ') : 'Just now';
  };

  const loadDownDevicesList = async () => {
    setLoadingDownList(true);
    setShowDownList(true);
    try {
      let filteredDevices: any[] = [];

      // Use visualization API for cameras (ID: 92323865253)
      if (selectedDeviceType === 'Cameras') {
        try {
          const vizResponse = await apiService.getApi().get('/query/visualization/92323865253');
          const vizData = vizResponse.data.result || vizResponse.data || [];
          
          // Filter by district if selected
          if (selectedDistrict) {
            const excelDistrictName = normalizeDistrictName(selectedDistrict);
            const cameraIPs = districtCameraMap[excelDistrictName] || [];
            
            filteredDevices = vizData.filter((item: any) => {
              const monitorIP = item['object.ip'] || '';
              // Only include if IP matches district cameras
              if (cameraIPs.length > 0) {
                return cameraIPs.includes(monitorIP);
              }
              return true;
            });
          } else {
            // Whole state - include all cameras
            filteredDevices = vizData;
          }
        } catch (vizError) {
          console.error('Error loading visualization data, falling back to status API:', vizError);
          // Fallback to status API if visualization fails
          const downResponse = await apiService.getApi().get('/query/objects/status?status=Down');
          const downMonitors = downResponse.data.result || downResponse.data || [];
          filteredDevices = downMonitors.filter((monitor: any) => {
            const name = (monitor['object.name'] || '').toLowerCase();
            
            if (selectedDistrict) {
              const excelDistrictName = normalizeDistrictName(selectedDistrict);
              const cameraIPs = districtCameraMap[excelDistrictName] || [];
              const monitorIP = monitor['object.ip'] || '';
              if (name.includes('cam')) {
                return cameraIPs.length > 0 ? cameraIPs.includes(monitorIP) : true;
              }
            } else {
              return name.includes('cam');
            }
            return false;
          });
        }
      } else {
        // For other device types, use status API
        const downResponse = await apiService.getApi().get('/query/objects/status?status=Down');
        const downMonitors = downResponse.data.result || downResponse.data || [];

        if (selectedDistrict) {
          const excelDistrictName = normalizeDistrictName(selectedDistrict);

          filteredDevices = downMonitors.filter((monitor: any) => {
            const name = (monitor['object.name'] || '').toLowerCase();
            const host = (monitor['object.host'] || '').toLowerCase();

            if (selectedDeviceType === 'Servers') {
              if (name.includes('server') && !name.includes('cam')) {
                const upperName = (monitor['object.name'] || '').toUpperCase();
                const upperDistrictName = excelDistrictName.toUpperCase();
                const serverPrefix = upperName.split('_')[0];
                return upperName.startsWith(upperDistrictName) || 
                       upperDistrictName.startsWith(serverPrefix);
              }
            } else if (selectedDeviceType === 'APIs') {
              if (name.includes('_api/')) {
                const upperName = (monitor['object.name'] || '').toUpperCase();
                const apiParts = upperName.split('_API/');
                if (apiParts.length > 0) {
                  const apiDistrictName = apiParts[0].trim();
                  const upperDistrictName = excelDistrictName.toUpperCase();
                  return apiDistrictName === upperDistrictName || 
                         upperDistrictName.startsWith(apiDistrictName) ||
                         apiDistrictName.startsWith(upperDistrictName.split(' ')[0]);
                }
              }
            } else if (selectedDeviceType === 'GPUs') {
              if (name.includes('gpu') || host.includes('gpu')) {
                const upperName = (monitor['object.name'] || '').toUpperCase();
                const gpuDistrictName = upperName.split(/[_-]/)[0].trim();
                const upperDistrictName = excelDistrictName.toUpperCase();
                return gpuDistrictName === upperDistrictName || 
                       upperDistrictName.startsWith(gpuDistrictName) ||
                       gpuDistrictName.startsWith(upperDistrictName.split(' ')[0]);
              }
            } else if (selectedDeviceType === 'UPS') {
              if (name.includes('_ups')) {
                // Extract district code from object.name (part before "_UPS")
                const upperName = (monitor['object.name'] || '').toUpperCase();
                const upsParts = upperName.split('_UPS');
                if (upsParts.length > 0) {
                  const upsCode = upsParts[0].trim();
                  // Get full district name from code
                  const upsDistrictName = getDistrictFromUPSCode(upsCode);
                  const upperDistrictName = excelDistrictName.toUpperCase();
                  
                  // Check if UPS district matches selected district
                  if (upsDistrictName) {
                    // Match using full district name from code
                    return upsDistrictName === upperDistrictName || 
                           upperDistrictName.startsWith(upsDistrictName) ||
                           upsDistrictName.startsWith(upperDistrictName.split(' ')[0]);
                  } else {
                    // If code not found in mapping, try direct code match
                    const normalizedDistrict = upperDistrictName.replace(/\s+/g, '');
                    return upsCode === normalizedDistrict || normalizedDistrict.startsWith(upsCode);
                  }
                }
              }
            }
            return false;
          });
        } else {
          // Whole state - filter by device type only
          filteredDevices = downMonitors.filter((monitor: any) => {
            const name = (monitor['object.name'] || '').toLowerCase();
            const host = (monitor['object.host'] || '').toLowerCase();

            if (selectedDeviceType === 'Servers') {
              return name.includes('server') && !name.includes('cam');
            } else if (selectedDeviceType === 'APIs') {
              return name.includes('_api/');
            } else if (selectedDeviceType === 'GPUs') {
              return name.includes('gpu') || host.includes('gpu');
            } else if (selectedDeviceType === 'UPS') {
              return name.includes('_ups');
            }
            return false;
          });
        }
      }

      setDownDevicesList(filteredDevices);
    } catch (error) {
      console.error('Error loading down devices list:', error);
      setDownDevicesList([]);
    } finally {
      setLoadingDownList(false);
    }
  };

  const countDevicesByType = (
    upMonitors: any[], 
    downMonitors: any[], 
    deviceType: DeviceType,
    districtIPs: string[] | null, // null means whole state (for cameras)
    districtName: string | null = null // District name for server filtering (e.g., "EAST GODAVARI")
  ): { up: number; down: number } => {
    let upCount = 0;
    let downCount = 0;

    // Count UP devices
    upMonitors.forEach((monitor: any) => {
      const name = (monitor['object.name'] || '').toLowerCase();
      const host = (monitor['object.host'] || '').toLowerCase();
      const monitorIP = monitor['object.ip'] || '';
      
      let matches = false;

      if (deviceType === 'Cameras') {
        // Cameras: name contains "cam" AND (if district selected, IP must match)
        if (name.includes('cam')) {
          if (districtIPs) {
            // District selected: must match IP from Excel
            if (districtIPs.includes(monitorIP)) {
              matches = true;
            }
          } else {
            // Whole state: just match by name
            matches = true;
          }
        }
      } else if (deviceType === 'Servers') {
        // Servers: name contains "server" BUT exclude if name contains "cam" or "cameras"
        if (name.includes('server') && !name.includes('cam')) {
          // If district is selected, check if server name starts with district name
          if (districtName) {
            const upperName = (monitor['object.name'] || '').toUpperCase();
            const upperDistrictName = districtName.toUpperCase();
            // Get the first part of server name (before first underscore)
            const serverPrefix = upperName.split('_')[0];
            // Check if server name starts with district name (e.g., "EAST GODAVARI_Master Server_...")
            // Or if district name starts with server prefix (handles "KRISHNA" server matching "KRISHNA URBAN" district)
            if (upperName.startsWith(upperDistrictName) || 
                upperDistrictName.startsWith(serverPrefix)) {
              matches = true;
            }
          } else {
            // Whole state: just check for server keyword
            matches = true;
          }
        }
      } else if (deviceType === 'APIs') {
        // APIs: name contains "_api/" and district name comes before "_API/"
        if (name.includes('_api/')) {
          if (districtName) {
            // Extract district name from API name (part before "_API/")
            const upperName = (monitor['object.name'] || '').toUpperCase();
            const apiParts = upperName.split('_API/');
            if (apiParts.length > 0) {
              const apiDistrictName = apiParts[0].trim();
              const upperDistrictName = districtName.toUpperCase();
              // Check if API district matches selected district
              // Handle variations: "KRISHNA" API might match "KRISHNA URBAN" district
              if (apiDistrictName === upperDistrictName || 
                  upperDistrictName.startsWith(apiDistrictName) ||
                  apiDistrictName.startsWith(upperDistrictName.split(' ')[0])) {
                matches = true;
              }
            }
          } else {
            // Whole state: just check for "_api/" keyword
            matches = true;
          }
        }
      } else if (deviceType === 'GPUs') {
        // GPUs: name contains "gpu" OR host contains "gpu"
        if (name.includes('gpu') || host.includes('gpu')) {
          if (districtName) {
            // Extract district name from object.name (part before first '_' or '-')
            const upperName = (monitor['object.name'] || '').toUpperCase();
            // Split by '_' or '-' and take the first part
            const gpuDistrictName = upperName.split(/[_-]/)[0].trim();
            const upperDistrictName = districtName.toUpperCase();
            // Check if GPU district matches selected district
            // Handle variations: "KRISHNA" GPU might match "KRISHNA URBAN" district
            if (gpuDistrictName === upperDistrictName || 
                upperDistrictName.startsWith(gpuDistrictName) ||
                gpuDistrictName.startsWith(upperDistrictName.split(' ')[0])) {
              matches = true;
            }
          } else {
            // Whole state: just check for "gpu" keyword
            matches = true;
          }
        }
      } else if (deviceType === 'UPS') {
        // UPS: name contains "_UPS", format is {CODE}_UPS_{...}
        // Example: KNL_UPS_VARTHA_NANDYAL_CHECKPOST
        if (name.includes('_ups')) {
          if (districtName) {
            // Extract district code from object.name (part before "_UPS")
            const upperName = (monitor['object.name'] || '').toUpperCase();
            const upsParts = upperName.split('_UPS');
            if (upsParts.length > 0) {
              const upsCode = upsParts[0].trim();
              // Get full district name from code
              const upsDistrictName = getDistrictFromUPSCode(upsCode);
              const upperDistrictName = districtName.toUpperCase();
              
              // Check if UPS district matches selected district
              if (upsDistrictName) {
                // Match using full district name from code
                if (upsDistrictName === upperDistrictName || 
                    upperDistrictName.startsWith(upsDistrictName) ||
                    upsDistrictName.startsWith(upperDistrictName.split(' ')[0])) {
                  matches = true;
                }
              } else {
                // If code not found in mapping, try direct code match
                const normalizedDistrict = upperDistrictName.replace(/\s+/g, '');
                if (upsCode === normalizedDistrict || normalizedDistrict.startsWith(upsCode)) {
                  matches = true;
                }
              }
            }
          } else {
            // Whole state: just check for "_ups" keyword
            matches = true;
          }
        }
      }

      if (matches) {
        upCount++;
      }
    });

    // Count DOWN devices
    downMonitors.forEach((monitor: any) => {
      const name = (monitor['object.name'] || '').toLowerCase();
      const host = (monitor['object.host'] || '').toLowerCase();
      const monitorIP = monitor['object.ip'] || '';
      
      let matches = false;

      if (deviceType === 'Cameras') {
        // Cameras: name contains "cam" AND (if district selected, IP must match)
        if (name.includes('cam')) {
          if (districtIPs) {
            // District selected: must match IP from Excel
            if (districtIPs.includes(monitorIP)) {
              matches = true;
            }
          } else {
            // Whole state: just match by name
            matches = true;
          }
        }
      } else if (deviceType === 'Servers') {
        // Servers: name contains "server" BUT exclude if name contains "cam" or "cameras"
        if (name.includes('server') && !name.includes('cam')) {
          // If district is selected, check if server name starts with district name
          if (districtName) {
            const upperName = (monitor['object.name'] || '').toUpperCase();
            const upperDistrictName = districtName.toUpperCase();
            // Get the first part of server name (before first underscore)
            const serverPrefix = upperName.split('_')[0];
            // Check if server name starts with district name (e.g., "EAST GODAVARI_Master Server_...")
            // Or if district name starts with server prefix (handles "KRISHNA" server matching "KRISHNA URBAN" district)
            if (upperName.startsWith(upperDistrictName) || 
                upperDistrictName.startsWith(serverPrefix)) {
              matches = true;
            }
          } else {
            // Whole state: just check for server keyword
            matches = true;
          }
        }
      } else if (deviceType === 'APIs') {
        // APIs: name contains "_api/" and district name comes before "_API/"
        if (name.includes('_api/')) {
          if (districtName) {
            // Extract district name from API name (part before "_API/")
            const upperName = (monitor['object.name'] || '').toUpperCase();
            const apiParts = upperName.split('_API/');
            if (apiParts.length > 0) {
              const apiDistrictName = apiParts[0].trim();
              const upperDistrictName = districtName.toUpperCase();
              // Check if API district matches selected district
              // Handle variations: "KRISHNA" API might match "KRISHNA URBAN" district
              if (apiDistrictName === upperDistrictName || 
                  upperDistrictName.startsWith(apiDistrictName) ||
                  apiDistrictName.startsWith(upperDistrictName.split(' ')[0])) {
                matches = true;
              }
            }
          } else {
            // Whole state: just check for "_api/" keyword
            matches = true;
          }
        }
      } else if (deviceType === 'GPUs') {
        // GPUs: name contains "gpu" OR host contains "gpu"
        if (name.includes('gpu') || host.includes('gpu')) {
          if (districtName) {
            // Extract district name from object.name (part before first '_' or '-')
            const upperName = (monitor['object.name'] || '').toUpperCase();
            // Split by '_' or '-' and take the first part
            const gpuDistrictName = upperName.split(/[_-]/)[0].trim();
            const upperDistrictName = districtName.toUpperCase();
            // Check if GPU district matches selected district
            // Handle variations: "KRISHNA" GPU might match "KRISHNA URBAN" district
            if (gpuDistrictName === upperDistrictName || 
                upperDistrictName.startsWith(gpuDistrictName) ||
                gpuDistrictName.startsWith(upperDistrictName.split(' ')[0])) {
              matches = true;
            }
          } else {
            // Whole state: just check for "gpu" keyword
            matches = true;
          }
        }
      } else if (deviceType === 'UPS') {
        // UPS: name contains "_UPS", format is {CODE}_UPS_{...}
        // Example: KNL_UPS_VARTHA_NANDYAL_CHECKPOST
        if (name.includes('_ups')) {
          if (districtName) {
            // Extract district code from object.name (part before "_UPS")
            const upperName = (monitor['object.name'] || '').toUpperCase();
            const upsParts = upperName.split('_UPS');
            if (upsParts.length > 0) {
              const upsCode = upsParts[0].trim();
              // Get full district name from code
              const upsDistrictName = getDistrictFromUPSCode(upsCode);
              const upperDistrictName = districtName.toUpperCase();
              
              // Check if UPS district matches selected district
              if (upsDistrictName) {
                // Match using full district name from code
                if (upsDistrictName === upperDistrictName || 
                    upperDistrictName.startsWith(upsDistrictName) ||
                    upsDistrictName.startsWith(upperDistrictName.split(' ')[0])) {
                  matches = true;
                }
              } else {
                // If code not found in mapping, try direct code match
                const normalizedDistrict = upperDistrictName.replace(/\s+/g, '');
                if (upsCode === normalizedDistrict || normalizedDistrict.startsWith(upsCode)) {
                  matches = true;
                }
              }
            }
          } else {
            // Whole state: just check for "_ups" keyword
            matches = true;
          }
        }
      }

      if (matches) {
        downCount++;
      }
    });

    return { up: upCount, down: downCount };
  };

  useEffect(() => {
    if (isInitializedRef.current) {
      return;
    }

    console.log('AndhraPradeshMap: Component mounted');
    
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      console.warn('Google Maps API key not configured');
      setError('Please add VITE_GOOGLE_MAPS_API_KEY to .env file');
      setLoading(false);
      return;
    }

    console.log('AndhraPradeshMap: API key found, loading script...');

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps && window.google.maps.Map) {
      console.log('AndhraPradeshMap: Google Maps already loaded, waiting for container...');
      setTimeout(() => {
        if (mapRef.current && !mapInstanceRef.current) {
          console.log('AndhraPradeshMap: Container ready, initializing...');
          initializeMap();
        } else {
          setTimeout(() => {
            if (mapRef.current && !mapInstanceRef.current) {
              initializeMap();
            }
          }, 300);
        }
      }, 100);
      return;
    }

    // Check if script is already in DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('AndhraPradeshMap: Script already in DOM, waiting for load...');
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.Map) {
          clearInterval(checkInterval);
          console.log('AndhraPradeshMap: Google Maps ready, waiting for container...');
          setTimeout(() => {
            if (mapRef.current && !mapInstanceRef.current) {
              console.log('AndhraPradeshMap: Container ready, initializing...');
              initializeMap();
            } else {
              setTimeout(() => {
                if (mapRef.current && !mapInstanceRef.current) {
                  initializeMap();
                }
              }, 300);
            }
          }, 200);
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.google || !window.google.maps) {
          setError('Google Maps failed to load. Please check your API key.');
          setLoading(false);
        }
      }, 5000);
      
      return () => clearInterval(checkInterval);
    }

    // Load Google Maps script
    console.log('AndhraPradeshMap: Creating script tag...');
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,drawing&loading=async&callback=initMap`;
    script.async = true;
    script.defer = true;
    
    window.initMap = () => {
      console.log('AndhraPradeshMap: initMap callback called');
      setTimeout(() => {
        if (mapRef.current && !mapInstanceRef.current) {
          console.log('AndhraPradeshMap: mapRef available, initializing...');
          initializeMap();
        } else if (!mapRef.current) {
          console.warn('AndhraPradeshMap: mapRef still null, retrying...');
          setTimeout(() => {
            if (mapRef.current && !mapInstanceRef.current) {
              initializeMap();
            }
          }, 500);
        }
      }, 200);
    };
    
    script.onerror = () => {
      console.error('AndhraPradeshMap: Script load error');
      setError('Failed to load Google Maps. Please check your API key and network connection.');
      setLoading(false);
    };
    
    document.head.appendChild(script);
    console.log('AndhraPradeshMap: Script tag added to head');

    return () => {
      console.log('AndhraPradeshMap: Cleanup');
      isInitializedRef.current = false;
      if (dataLayerRef.current) {
        try {
          dataLayerRef.current.setMap(null);
        } catch (e) {
          // Ignore
        }
      }
      dataLayerRef.current = null;
      mapInstanceRef.current = null;
      districtsRef.current.clear();
    };
  }, []);

  const initializeMap = async () => {
    console.log('AndhraPradeshMap: initializeMap called');
    
    if (!mapRef.current) {
      console.error('AndhraPradeshMap: mapRef.current is null');
      setError('Map container not found');
      setLoading(false);
      return;
    }

    if (!window.google || !window.google.maps) {
      console.error('AndhraPradeshMap: window.google not available');
      setError('Google Maps API not loaded');
      setLoading(false);
      return;
    }

    if (!window.google.maps.Map) {
      console.error('AndhraPradeshMap: Map constructor not available');
      setError('Google Maps Map constructor not available');
      setLoading(false);
      return;
    }

    if (mapInstanceRef.current || isInitializedRef.current) {
      console.log('AndhraPradeshMap: Map already initialized');
      return;
    }

    try {
      console.log('AndhraPradeshMap: Creating map instance...');
      const andhraPradeshCenter = { lat: 15.9129, lng: 79.7400 };

      // Custom map styles to hide ALL Google Maps background - only show districts
      const customMapStyle = [
        {
          featureType: 'all',
          elementType: 'all',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'landscape',
          elementType: 'geometry',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'road',
          elementType: 'all',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'administrative',
          elementType: 'all',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'poi',
          elementType: 'all',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'poi.business',
          elementType: 'all',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'poi.attraction',
          elementType: 'all',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'poi.place_of_worship',
          elementType: 'all',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'poi.school',
          elementType: 'all',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'poi.sports_complex',
          elementType: 'all',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'poi.park',
          elementType: 'all',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'poi.medical',
          elementType: 'all',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'poi.government',
          elementType: 'all',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'poi',
          elementType: 'labels.icon',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'poi',
          elementType: 'labels.text',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'transit',
          elementType: 'all',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'transit.station',
          elementType: 'all',
          stylers: [{ visibility: 'off' }],
        },
      ];

      const map = new window.google.maps.Map(mapRef.current, {
        zoom:9,
        center: andhraPradeshCenter,
        mapTypeId: 'roadmap',
        styles: customMapStyle,
        disableDefaultUI: false, // Enable UI controls for zoom
        zoomControl: true, // Show zoom controls
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_CENTER,
        },
        mapTypeControl: false,
        scaleControl: false,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: false,
        gestureHandling: 'cooperative', // Allow zoom but require Ctrl/Cmd
        keyboardShortcuts: false,
        draggable: true, // Allow dragging/panning
        scrollwheel: true, // Allow mouse wheel zoom (with Ctrl/Cmd)
        disableDoubleClickZoom: false, // Allow double-click zoom
      });

      mapInstanceRef.current = map;
      isInitializedRef.current = true;
      console.log('AndhraPradeshMap: Map instance created');

      // Load and add GeoJSON data
      console.log('AndhraPradeshMap: Loading GeoJSON...');
      try {
        const response = await fetch('/andhra_districts.geojson');
        if (!response.ok) {
          throw new Error(`Failed to load GeoJSON: ${response.statusText}`);
        }
        const geoJsonData = await response.json();
        console.log('AndhraPradeshMap: GeoJSON loaded', geoJsonData.features?.length || 0, 'features');

         // Create data layer
         const dataLayer = new window.google.maps.Data();
         
         // Filter out Point geometries (which create markers) - only keep Polygon and MultiPolygon
         const filteredGeoJson = {
           ...geoJsonData,
           features: geoJsonData.features.filter((feature: any) => {
             const geometryType = feature.geometry?.type;
             // Only include Polygon and MultiPolygon, exclude Point, LineString, etc.
             return geometryType === 'Polygon' || geometryType === 'MultiPolygon';
           })
         };
         
         console.log('AndhraPradeshMap: Filtered GeoJSON -', filteredGeoJson.features.length, 'features (removed Point geometries)');
         
         dataLayer.addGeoJson(filteredGeoJson);
         dataLayer.setMap(map);
         dataLayerRef.current = dataLayer;

         // Calculate bounds to fit all districts - process coordinates directly
         const bounds = new window.google.maps.LatLngBounds();
         geoJsonData.features.forEach((feature: any) => {
           if (feature.geometry && feature.geometry.coordinates) {
             const processCoordinates = (coords: any) => {
               if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
                 // MultiPolygon or Polygon
                 coords.forEach((ring: any) => {
                   ring.forEach((coord: any) => {
                     if (Array.isArray(coord) && coord.length >= 2 && typeof coord[0] === 'number' && typeof coord[1] === 'number') {
                       bounds.extend({ lat: coord[1], lng: coord[0] });
                     }
                   });
                 });
               } else if (Array.isArray(coords[0])) {
                 // Polygon ring
                 coords.forEach((coord: any) => {
                   if (Array.isArray(coord) && coord.length >= 2 && typeof coord[0] === 'number' && typeof coord[1] === 'number') {
                     bounds.extend({ lat: coord[1], lng: coord[0] });
                   }
                 });
               }
             };
             
             if (feature.geometry.type === 'Polygon') {
               processCoordinates(feature.geometry.coordinates);
             } else if (feature.geometry.type === 'MultiPolygon') {
               feature.geometry.coordinates.forEach((polygon: any) => {
                 processCoordinates(polygon);
               });
             }
           }
         });

         // Fit map to show all districts with padding
         if (!bounds.isEmpty()) {
           map.fitBounds(bounds, {
             padding: { top: 30, right: 30, bottom: 30, left: 30 },
           });
         }

        // Store district info - use dtname field from new GeoJSON format
        geoJsonData.features.forEach((feature: any) => {
          const districtName = feature.properties.dtname || feature.properties.name || feature.properties['name:en'] || 'Unknown';
          districtsRef.current.set(districtName.toLowerCase(), {
            name: districtName,
            feature: feature,
          });
        });

         // Default style for all districts - professional government look
         dataLayer.setStyle({
           fillColor: '#2563EB',
           fillOpacity: 0.4,
           strokeColor: '#1E40AF',
           strokeWeight: 1.5, // Reduced from 2.5 to make borders less bold
           strokeOpacity: 0.9,
         });

         // Hover effect - highlight district (NO tooltip/InfoWindow)
         dataLayer.addListener('mouseover', (event: any) => {
           const feature = event.feature;
           const districtName = feature.getProperty('dtname') || feature.getProperty('name') || feature.getProperty('name:en') || 'Unknown';
           
           // Only highlight if not already selected
           if (selectedDistrict !== districtName) {
             dataLayer.overrideStyle(feature, {
               fillColor: '#10B981',
               fillOpacity: 0.65,
               strokeColor: '#059669',
               strokeWeight: 2, // Reduced from 3.5
             });
           }
           // NO InfoWindow - removed to eliminate location points
        });

        // Mouse out - reset style
        dataLayer.addListener('mouseout', (event: any) => {
          const feature = event.feature;
          const districtName = feature.getProperty('dtname') || feature.getProperty('name') || feature.getProperty('name:en') || 'Unknown';
          
          // Reset style (unless selected)
          if (selectedDistrict !== districtName) {
            dataLayer.revertStyle(feature);
          }
        });

         // Click - select and zoom to district with smooth transition
         dataLayer.addListener('click', (event: any) => {
           const feature = event.feature;
           const districtName = feature.getProperty('dtname') || feature.getProperty('name') || feature.getProperty('name:en') || 'Unknown';
           
           // Store original name for lookup, but display friendly name
           setSelectedDistrict(districtName);

           // Highlight selected district
           dataLayer.forEach((f: any) => {
             if (f !== feature) {
               dataLayer.revertStyle(f);
             }
           });

           dataLayer.overrideStyle(feature, {
             fillColor: '#8B5CF6',
             fillOpacity: 0.7,
             strokeColor: '#7C3AED',
             strokeWeight: 2.5, // Reduced from 4
           });

           // Calculate bounds for the selected district
           const bounds = new window.google.maps.LatLngBounds();
           const geometry = feature.getGeometry();
           
           geometry.forEachLatLng((latlng: any) => {
             bounds.extend(latlng);
           });

           // Smooth zoom transition with easing
           const currentZoom = map.getZoom() || 7;
           const targetZoom = Math.min(11, Math.max(9, currentZoom + 2));
           
           // Animate zoom with smooth transition
           const animateZoom = (startZoom: number, endZoom: number, steps: number = 30) => {
             let currentStep = 0;
             
             const zoomInterval = setInterval(() => {
               currentStep++;
               const progress = currentStep / steps;
               // Easing function for smooth animation (ease-in-out)
               const easedProgress = progress < 0.5
                 ? 2 * progress * progress
                 : 1 - Math.pow(-2 * progress + 2, 2) / 2;
               
               const currentZoom = startZoom + (endZoom - startZoom) * easedProgress;
               
               if (currentStep >= steps) {
                 clearInterval(zoomInterval);
                 // Final fit to bounds with padding
                 map.fitBounds(bounds, {
                   padding: { top: 50, right: 50, bottom: 50, left: 50 },
                 });
                 map.setZoom(Math.min(11, map.getZoom() || 10));
               } else {
                 map.setZoom(currentZoom);
               }
             }, 16); // ~60fps
           };

           // Center on district first, then zoom
           const center = bounds.getCenter();
           
           // Smooth pan to center
           const panStart = map.getCenter();
           const panSteps = 20;
           let panStep = 0;
           
           const panInterval = setInterval(() => {
             panStep++;
             const progress = panStep / panSteps;
             const easedProgress = progress < 0.5
               ? 2 * progress * progress
               : 1 - Math.pow(-2 * progress + 2, 2) / 2;
             
             const currentLat = panStart.lat() + (center.lat() - panStart.lat()) * easedProgress;
             const currentLng = panStart.lng() + (center.lng() - panStart.lng()) * easedProgress;
             
             map.setCenter({ lat: currentLat, lng: currentLng });
             
             if (panStep >= panSteps) {
               clearInterval(panInterval);
               // Start zoom animation after pan completes
               setTimeout(() => {
                 animateZoom(currentZoom, targetZoom);
               }, 100);
             }
           }, 16);
         });

        console.log('AndhraPradeshMap: GeoJSON added to map');
        setLoading(false);
        setError(null);
      } catch (geoError: any) {
        console.error('AndhraPradeshMap: Error loading GeoJSON:', geoError);
        setError(`Error loading district boundaries: ${geoError.message}`);
        setLoading(false);
      }
    } catch (err: any) {
      console.error('AndhraPradeshMap: Error initializing map:', err);
      setError(`Error initializing map: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        {selectedDistrict && (
          <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
            Selected: {getDistrictDisplayName(selectedDistrict)}
            <button
              onClick={() => {
                setSelectedDistrict(null);
                if (mapInstanceRef.current && dataLayerRef.current) {
                  // Reset all styles
                  dataLayerRef.current.forEach((feature: any) => {
                    dataLayerRef.current.revertStyle(feature);
                  });
                  
                  // Smooth transition back to full view
                  const currentZoom = mapInstanceRef.current.getZoom() || 7;
                  const targetZoom = 7;
                  const center = { lat: 15.9129, lng: 79.7400 };
                  const currentCenter = mapInstanceRef.current.getCenter();
                  
                  const steps = 25;
                  let step = 0;
                  
                  const resetInterval = setInterval(() => {
                    step++;
                    const progress = step / steps;
                    const easedProgress = progress < 0.5
                      ? 2 * progress * progress
                      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                    
                    // Animate zoom
                    const currentZoomValue = currentZoom + (targetZoom - currentZoom) * easedProgress;
                    mapInstanceRef.current.setZoom(currentZoomValue);
                    
                    // Animate pan
                    const currentLat = currentCenter.lat() + (center.lat - currentCenter.lat()) * easedProgress;
                    const currentLng = currentCenter.lng() + (center.lng - currentCenter.lng()) * easedProgress;
                    mapInstanceRef.current.setCenter({ lat: currentLat, lng: currentLng });
                    
                    if (step >= steps) {
                      clearInterval(resetInterval);
                      mapInstanceRef.current.setCenter(center);
                      mapInstanceRef.current.setZoom(7);
                    }
                  }, 16);
                }
              }}
              className="ml-2 px-2 py-1 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 transition-colors shadow-sm"
            >
              State View
            </button>
          </div>
        )}
      </div>
      
      <div className="text-xs text-gray-500 mb-2">
        Hover over districts to highlight • Click to select and zoom • {districtsRef.current.size} districts loaded
      </div>

      {/* Two column layout: Map on left, space for content on right */}
      <div className="flex gap-4">
        {/* Map container - left side */}
        <div className="relative w-1/2 rounded-lg overflow-hidden bg-white" style={{ height: '600px' }}>
          <div 
            ref={mapRef} 
            className="w-full h-full bg-white"
          />
          {/* Hide Google Maps attribution and all markers - AGGRESSIVE HIDING */}
          <style>{`
            .gm-style-cc,
            .gm-style a[href^="https://maps.google.com/maps"],
            .gm-style a[href^="https://www.google.com/maps"],
            .gm-style-cc div,
            .gm-style-mtc,
            .gm-bundled-control,
            .gmnoprint,
            img[src*="marker"],
            img[src*="pin"],
            img[src*="red"],
            .gm-style img[alt*="marker"],
            .gm-style img[alt*="pin"],
            .gm-style img[alt*="location"],
            /* Hide all marker icons */
            div[style*="marker"],
            div[style*="pin"],
            /* Hide Data layer markers */
            .gm-style div[data-marker],
            /* Hide any red markers */
            img[style*="red"],
            /* Hide all images in map that might be markers */
            .gm-style img:not([src*="tile"]):not([src*="roadmap"]):not([src*="satellite"]) {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
              width: 0 !important;
              height: 0 !important;
              pointer-events: none !important;
            }
            /* Hide marker containers */
            div[role="button"][aria-label*="marker"],
            div[role="button"][aria-label*="pin"] {
              display: none !important;
            }
          `}</style>
          
          {/* Loading overlay */}
          {loading && !mapInstanceRef.current && (
            <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading map and district boundaries...</p>
              </div>
            </div>
          )}
          
          {/* Error overlay */}
          {error && !mapInstanceRef.current && (
            <div className="absolute inset-0 bg-red-50 flex items-center justify-center z-10">
              <div className="text-center p-4">
                <p className="text-sm font-medium text-red-900 mb-2">{error}</p>
                <p className="text-xs text-red-600">
                  Please check your Google Maps API key in .env file
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right side - district/state information */}
        <div className="w-1/2 bg-white rounded-lg border border-gray-200 p-4" style={{ height: '600px' }}>
          <div className="h-full flex flex-col">
            <div className="mb-4 pb-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedDistrict ? getDistrictDisplayName(selectedDistrict) : 'Andhra Pradesh'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {selectedDistrict ? 'District Information' : 'State Information'}
              </p>
            </div>
              
              {/* Device Type Dropdown */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Device Type
                </label>
                <select
                  value={selectedDeviceType}
                  onChange={(e) => setSelectedDeviceType(e.target.value as DeviceType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Cameras">Cameras ({deviceTypeCounts.Cameras})</option>
                  <option value="Servers">Servers ({deviceTypeCounts.Servers})</option>
                  <option value="APIs">APIs ({deviceTypeCounts.APIs})</option>
                  <option value="GPUs">GPUs ({deviceTypeCounts.GPUs})</option>
                  <option value="UPS">UPS ({deviceTypeCounts.UPS})</option>
                </select>
              </div>

              {/* Device Stats for all types */}
              <div className="flex-1 overflow-y-auto">
                {loadingStats ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Loading {selectedDeviceType.toLowerCase()} statistics...</p>
                    </div>
                  </div>
                ) : deviceStats ? (
                  <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <p className="text-sm text-green-600 font-medium">Up</p>
                        <p className="text-2xl font-bold text-green-700">{deviceStats.up}</p>
                      </div>
                      <div 
                        className="bg-red-50 rounded-lg p-4 border border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
                        onClick={loadDownDevicesList}
                        title="Click to view list of down devices"
                      >
                        <p className="text-sm text-red-600 font-medium">Down</p>
                        <p className="text-2xl font-bold text-red-700">{deviceStats.down}</p>
                      </div>
                    </div>

                    {/* Bar Chart */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">{selectedDeviceType} Status</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={[{ name: 'Up', value: deviceStats.up }, { name: 'Down', value: deviceStats.down }]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#3B82F6">
                            {[{ name: 'Up', value: deviceStats.up }, { name: 'Down', value: deviceStats.down }].map((_, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#EF4444'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Pie Chart */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Status Distribution</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Up', value: deviceStats.up },
                              { name: 'Down', value: deviceStats.down }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            <Cell fill="#10B981" />
                            <Cell fill="#EF4444" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-sm text-gray-500">No {selectedDeviceType.toLowerCase()} data available</p>
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>

      {/* Down Devices List Modal */}
      {showDownList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-4xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Down {selectedDeviceType}
                  {selectedDistrict && ` - ${getDistrictDisplayName(selectedDistrict)}`}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Total: {downDevicesList.length} device{downDevicesList.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDownList(false);
                  setDownDevicesList([]);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingDownList ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading down devices...</p>
                  </div>
                </div>
              ) : downDevicesList.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-sm text-gray-500">No down {selectedDeviceType.toLowerCase()} found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {downDevicesList.map((device, index) => {
                    // Get monitor name from visualization API format or regular format
                    const monitorName = device.monitor || device['object.name'] || device.name || 'Unknown Device';
                    const monitorIP = device['object.ip'] || '';
                    
                    // Get timestamp - API returns in milliseconds (1765460363000)
                    const timestamp = device.timestamp || device['object.timestamp'] || device['event.timestamp'] || device.eventTimestamp;
                    
                    // Get last triggered - check all possible field names from API response
                    // Look for fields that might contain "trigger", "poll", "update", "modify", "change"
                    const lastTriggered = device.lastTriggered || 
                                         device['last.triggered'] || 
                                         device['object.last.triggered'] || 
                                         device['event.last.triggered'] || 
                                         device['object.last.poll.time'] || 
                                         device['last.poll.time'] || 
                                         device['lastTriggered'] || 
                                         device['lastTriggeredTime'] ||
                                         device['lastPollTime'] ||
                                         device['object.lastPollTime'] ||
                                         device['lastUpdateTime'] ||
                                         device['object.lastUpdateTime'] ||
                                         device['modification.time'] ||
                                         device['object.modification.time'];
                    
                    // Debug: log the values to understand the data structure (only first device)
                    if (index === 0) {
                      console.log('Device sample:', {
                        timestamp,
                        lastTriggered,
                        allKeys: Object.keys(device),
                        device: device
                      });
                    }
                    
                    // Calculate duration
                    let downDuration = null;
                    if (timestamp) {
                      // Convert timestamp from milliseconds to seconds
                      // timestamp is in milliseconds (e.g., 1765460363000)
                      const timestampSeconds = Math.floor(timestamp / 1000);
                      
                      if (lastTriggered && typeof lastTriggered === 'number') {
                        // Both values exist - calculate difference: timestamp (old) - lastTriggered (recent)
                        // Convert lastTriggered from milliseconds to seconds if needed
                        const lastTriggeredSeconds = lastTriggered > 1e12 
                          ? Math.floor(lastTriggered / 1000) 
                          : lastTriggered;
                        
                        // timestamp is older, lastTriggered is recent
                        // Difference: lastTriggered - timestamp (recent - old = positive)
                        downDuration = formatDurationBetween(timestampSeconds, lastTriggeredSeconds);
                      } else {
                        // Only timestamp exists - show time since timestamp
                        // But if timestamp is in the future, don't show negative duration
                        const currentTime = Math.floor(Date.now() / 1000);
                        const diff = currentTime - timestampSeconds;
                        
                        if (diff < 0) {
                          // Timestamp is in the future - this might be a creation timestamp, not down time
                          // Don't show duration or show "N/A"
                          downDuration = null;
                        } else {
                          // Normal case - show time since timestamp
                          downDuration = formatDuration(timestampSeconds);
                        }
                      }
                    }
                    
                    return (
                      <div
                        key={device['object.id'] || device.id || index}
                        className="bg-red-50 border border-red-200 rounded-lg p-3 hover:bg-red-100 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {monitorName}
                            </p>
                            {monitorIP && (
                              <p className="text-sm text-gray-600 mt-1">IP: {monitorIP}</p>
                            )}
                            {device['object.host'] && (
                              <p className="text-sm text-gray-600 mt-1">Host: {device['object.host']}</p>
                            )}
                            {device['object.type'] && (
                              <p className="text-sm text-gray-500 mt-1">Type: {device['object.type']}</p>
                            )}
                            {downDuration && (
                              <p className="text-sm font-medium text-red-700 mt-2">
                                ⏱️ Down for: {downDuration}
                              </p>
                            )}
                          </div>
                          <div className="ml-4 flex flex-col items-end">
                            <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded mb-2">
                              Down
                            </span>
                            {timestamp && (
                              <span className="text-xs text-gray-500">
                                {new Date(timestamp * 1000).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
