/// <reference types="vite/client" />
import React, { useEffect, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiService } from '../services/api';
import { parseExcelFile, DistrictCameraMap, normalizeDistrictName, getDistrictDisplayName, parseUPSCameraMapping, UPSCameraMapping, parseGPUIPs, DistrictGPUMap } from '../utils/excelParser';

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
  'KDP': 'KADAPA',
  'GNT': 'GUNTUR'
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
  const [gpuIPs, setGpuIPs] = useState<string[]>([]);
  const [districtGPUMap, setDistrictGPUMap] = useState<DistrictGPUMap>({});
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
  const [districtDeviceTypeCounts, setDistrictDeviceTypeCounts] = useState<Record<DeviceType, number>>({
    Cameras: 0,
    Servers: 0,
    APIs: 0,
    GPUs: 0,
    UPS: 0
  });
  const [upsCameraMapping, setUpsCameraMapping] = useState<UPSCameraMapping>({ upsToCameras: {}, cameraToUPS: {} });
  const [deviceMappingData, setDeviceMappingData] = useState<any>(null);
  const [loadingMapping, setLoadingMapping] = useState(false);
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
        // GPUs: Use Excel list for total count (will be updated when Excel is loaded)
        // This is just a placeholder - actual count comes from Excel
        // counts.GPUs is set from gpuIPs.length after Excel loads
        // UPS
        if (name.includes('_ups')) {
          counts.UPS++;
        }
      });

      // Update GPU count from Excel list
      counts.GPUs = gpuIPs.length;
      
      setDeviceTypeCounts(counts);
    } catch (error) {
      console.error('Error loading device type counts:', error);
    }
  };

  // Update GPU count when gpuIPs changes
  useEffect(() => {
    if (gpuIPs.length > 0) {
      setDeviceTypeCounts(prev => ({
        ...prev,
        GPUs: gpuIPs.length
      }));
    }
  }, [gpuIPs]);

  // Calculate district-specific device type counts
  const calculateDistrictDeviceTypeCounts = async (district: string) => {
    try {
      const [upResponse, downResponse] = await Promise.all([
        apiService.getApi().get('/query/objects/status?status=Up'),
        apiService.getApi().get('/query/objects/status?status=Down'),
      ]);

      const upMonitors = upResponse.data.result || upResponse.data || [];
      const downMonitors = downResponse.data.result || downResponse.data || [];
      const allMonitors = [...upMonitors, ...downMonitors];

      const excelDistrictName = normalizeDistrictName(district);
      const cameraIPs = districtCameraMap[excelDistrictName] || [];

      // Count each device type for this district
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
        const monitorIP = monitor['object.ip'] || '';

        // Cameras
        if (name.includes('cam')) {
          if (cameraIPs.length > 0 && cameraIPs.includes(monitorIP)) {
            counts.Cameras++;
          }
        }
        // Servers
        if (name.includes('server') && !name.includes('cam')) {
          const upperName = (monitor['object.name'] || '').toUpperCase();
          const upperDistrictName = excelDistrictName.toUpperCase();
          const serverPrefix = upperName.split('_')[0];
          if (upperName.startsWith(upperDistrictName) || upperDistrictName.startsWith(serverPrefix)) {
            counts.Servers++;
          }
        }
        // APIs
        if (name.includes('_api/')) {
          const upperName = (monitor['object.name'] || '').toUpperCase();
          const apiParts = upperName.split('_API/');
          if (apiParts.length > 0) {
            const apiDistrictName = apiParts[0].trim();
            const upperDistrictName = excelDistrictName.toUpperCase();
            if (apiDistrictName === upperDistrictName || 
                upperDistrictName.startsWith(apiDistrictName) ||
                apiDistrictName.startsWith(upperDistrictName.split(' ')[0])) {
              counts.APIs++;
            }
          }
        }
        // GPUs: exclude "Non_GPU"
        if ((name.includes('gpu') || host.includes('gpu')) && !name.includes('non_gpu') && !host.includes('non_gpu')) {
          const upperName = (monitor['object.name'] || '').toUpperCase();
          const gpuDistrictName = upperName.split(/[_-]/)[0].trim();
          const upperDistrictName = excelDistrictName.toUpperCase();
          if (gpuDistrictName === upperDistrictName || 
              upperDistrictName.startsWith(gpuDistrictName) ||
              gpuDistrictName.startsWith(upperDistrictName.split(' ')[0])) {
            counts.GPUs++;
          }
        }
        // UPS
        if (name.includes('_ups')) {
          const upperName = (monitor['object.name'] || '').toUpperCase();
          const upsParts = upperName.split('_UPS');
          if (upsParts.length > 0) {
            const upsCode = upsParts[0].trim();
            const upsDistrictName = getDistrictFromUPSCode(upsCode);
            const upperDistrictName = excelDistrictName.toUpperCase();
            if (upsDistrictName) {
              if (upsDistrictName === upperDistrictName || 
                  upperDistrictName.startsWith(upsDistrictName) ||
                  upsDistrictName.startsWith(upperDistrictName.split(' ')[0])) {
                counts.UPS++;
              }
            } else {
              const normalizedDistrict = upperDistrictName.replace(/\s+/g, '');
              if (upsCode === normalizedDistrict || normalizedDistrict.startsWith(upsCode)) {
                counts.UPS++;
              }
            }
          }
        }
      });

      setDistrictDeviceTypeCounts(counts);
    } catch (error) {
      console.error('Error calculating district device type counts:', error);
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
      // Calculate district-specific device type counts
      calculateDistrictDeviceTypeCounts(selectedDistrict);
    } else {
      // Load whole state stats (when no district selected or on mount)
      loadWholeStateStats();
      // Reset district counts when no district selected
      setDistrictDeviceTypeCounts({
        Cameras: 0,
        Servers: 0,
        APIs: 0,
        GPUs: 0,
        UPS: 0
      });
    }
  }, [selectedDistrict, selectedDeviceType, districtCameraMap]);

  const loadExcelData = async () => {
    try {
      const map = await parseExcelFile('/Book1.xlsx');
      setDistrictCameraMap(map);
      
      // Load UPS-Camera mappings from multiple district Excel files and merge them
      try {
        const mappingFiles = [
          '/GUNTUR UPS & CAMERA IPS MAPING DATA.xlsx',
          '/Srikakulam Camera with UPS-IP Details.xlsx',
          '/PRAKASAM Camera & ups maping data.xlsx',
          '/Nellore Camera with UPS-IP Details.xlsx',
          '/Vizianagaram Camera with UPS-IP Details.xlsx',
          '/Visakhapatnam Camera with UPS-IP Details.xlsx',
        ];

        const mappingResults = await Promise.all(
          mappingFiles.map(async (file) => {
            try {
              return await parseUPSCameraMapping(file);
            } catch (err) {
              console.warn(`Error loading UPS-Camera mapping from ${file} (may not exist):`, err);
              return { upsToCameras: {}, cameraToUPS: {} } as UPSCameraMapping;
            }
          })
        );

        // Merge all mappings into a single UPSCameraMapping
        const mergedUpsToCameras: { [upsIP: string]: string[] } = {};
        const mergedCameraToUPS: { [cameraIP: string]: string } = {};

        mappingResults.forEach((mapping) => {
          Object.entries(mapping.upsToCameras).forEach(([upsIP, cameras]) => {
            if (!mergedUpsToCameras[upsIP]) {
              mergedUpsToCameras[upsIP] = [];
            }
            cameras.forEach((camIP) => {
              if (!mergedUpsToCameras[upsIP].includes(camIP)) {
                mergedUpsToCameras[upsIP].push(camIP);
              }
            });
          });

          Object.entries(mapping.cameraToUPS).forEach(([camIP, upsIP]) => {
            // Last one wins if duplicates, which is fine because a camera should have only one UPS
            mergedCameraToUPS[camIP] = upsIP;
          });
        });

        setUpsCameraMapping({
          upsToCameras: mergedUpsToCameras,
          cameraToUPS: mergedCameraToUPS,
        });
      } catch (upsError) {
        console.warn('Error loading UPS-Camera mappings:', upsError);
      }
      
      // Load GPU IPs from Excel file
      try {
        const gpuData = await parseGPUIPs('/GPU IPs.xlsx');
        setGpuIPs(gpuData.allIPs);
        setDistrictGPUMap(gpuData.districtMap);
      } catch (gpuError) {
        console.warn('Error loading GPU IPs (may not exist):', gpuError);
      }
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
      const stats = countDevicesByType(upMonitors, downMonitors, selectedDeviceType, null, null, null);
      
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
      // For GPUs, get district GPU IPs from Excel
      const districtGPUIPs = deviceType === 'GPUs' ? (districtGPUMap[excelDistrictName.toUpperCase()] || []) : null;
      const stats = countDevicesByType(upMonitors, downMonitors, deviceType, cameraIPs, excelDistrictName, districtGPUIPs);
      
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

  // Load mapping data when a device is clicked
  const handleDeviceClick = async (device: any, deviceIP: string) => {
    setLoadingMapping(true);
    
    try {
      // Fetch all monitors to check status
      const [upResponse, downResponse] = await Promise.all([
        apiService.getApi().get('/query/objects/status?status=Up'),
        apiService.getApi().get('/query/objects/status?status=Down'),
      ]);

      const upMonitors = upResponse.data.result || upResponse.data || [];
      const downMonitors = downResponse.data.result || downResponse.data || [];
      const allMonitors = [...upMonitors, ...downMonitors];

      // Create IP to monitor mapping for quick lookup
      const monitorByIP: { [ip: string]: any } = {};
      allMonitors.forEach((monitor: any) => {
        const ip = monitor['object.ip'] || '';
        if (ip) {
          monitorByIP[ip] = monitor;
        }
      });

      let mappingData: any = null;

      // Check district-wide status if district is selected
      let districtDownCount = 0;
      let districtTotalCount = 0;
      if (selectedDistrict) {
        const excelDistrictName = normalizeDistrictName(selectedDistrict);
        const districtIPs = districtCameraMap[excelDistrictName] || [];
        districtTotalCount = districtIPs.length;
        districtDownCount = districtIPs.filter((ip: string) => 
          downMonitors.some((m: any) => (m['object.ip'] || '') === ip)
        ).length;
      }

      if (selectedDeviceType === 'UPS') {
        // UPS clicked - show connected cameras
        const connectedCameras = upsCameraMapping.upsToCameras[deviceIP] || [];
        const cameraStatuses = connectedCameras.map((cameraIP: string) => {
          const cameraMonitor = monitorByIP[cameraIP];
          const isUp = upMonitors.some((m: any) => (m['object.ip'] || '') === cameraIP);
          const isDown = downMonitors.some((m: any) => (m['object.ip'] || '') === cameraIP);
          
          return {
            ip: cameraIP,
            name: cameraMonitor?.['object.name'] || cameraIP,
            status: isUp ? 'Up' : isDown ? 'Down' : 'Unknown',
            monitor: cameraMonitor
          };
        });

        // Determine reason for down
        const camerasDown = cameraStatuses.filter((c: any) => c.status === 'Down').length;
        const camerasUp = cameraStatuses.filter((c: any) => c.status === 'Up').length;
        const allCamerasDown = camerasDown === cameraStatuses.length && cameraStatuses.length > 0;
        const allCamerasUp = camerasUp === cameraStatuses.length && cameraStatuses.length > 0;
        const isWholeDistrictDown = selectedDistrict && districtDownCount === districtTotalCount && districtTotalCount > 0;

        let reason = '';
        if (isWholeDistrictDown) {
          reason = 'Network Issue - Whole district is down';
        } else if (allCamerasDown) {
          reason = 'Power Issue - UPS and all connected cameras are down';
        } else if (camerasDown > 0 && camerasUp > 0) {
          reason = 'CAT6 Issue or Camera End Issue - Some cameras down while UPS is down';
        } else if (allCamerasUp) {
          reason = 'Connected to Raw Current - Cameras are up but UPS is down';
        } else {
          reason = 'Power Issue - UPS and connected cameras are down';
        }

        mappingData = {
          type: 'UPS',
          upsIP: deviceIP,
          upsName: device.monitor || device['object.name'] || deviceIP,
          upsStatus: 'Down',
          connectedCameras: cameraStatuses,
          reason: reason,
          districtDownCount: districtDownCount,
          districtTotalCount: districtTotalCount
        };
      } else if (selectedDeviceType === 'Cameras') {
        // Camera clicked - show connected UPS and other cameras on same UPS
        const connectedUPS = upsCameraMapping.cameraToUPS[deviceIP] || null;
        let upsStatus = 'Unknown';
        let upsMonitor = null;
        let allCamerasOnUPS: any[] = [];
        
        if (connectedUPS) {
          upsMonitor = monitorByIP[connectedUPS];
          const isUp = upMonitors.some((m: any) => (m['object.ip'] || '') === connectedUPS);
          const isDown = downMonitors.some((m: any) => (m['object.ip'] || '') === connectedUPS);
          upsStatus = isUp ? 'Up' : isDown ? 'Down' : 'Unknown';

          // Get all cameras connected to this UPS
          const camerasOnUPS = upsCameraMapping.upsToCameras[connectedUPS] || [];
          allCamerasOnUPS = camerasOnUPS.map((cameraIP: string) => {
            const cameraMonitor = monitorByIP[cameraIP];
            const isUp = upMonitors.some((m: any) => (m['object.ip'] || '') === cameraIP);
            const isDown = downMonitors.some((m: any) => (m['object.ip'] || '') === cameraIP);
            
            return {
              ip: cameraIP,
              name: cameraMonitor?.['object.name'] || cameraIP,
              status: isUp ? 'Up' : isDown ? 'Down' : 'Unknown',
              monitor: cameraMonitor,
              isSelected: cameraIP === deviceIP
            };
          });
        }

        // Determine reason for down - based on SELECTED camera status
        const selectedCamera = allCamerasOnUPS.find((c: any) => c.isSelected);
        const selectedCameraStatus = selectedCamera ? selectedCamera.status : 'Down'; // Default to Down since we're in down list
        const isWholeDistrictDown = selectedDistrict && districtDownCount === districtTotalCount && districtTotalCount > 0;

        let reason = '';
        if (isWholeDistrictDown) {
          reason = 'Network Issue - Whole district is down';
        } else if (selectedCameraStatus === 'Down' && upsStatus === 'Down') {
          reason = 'Power Issue - UPS and cameras are down';
        } else if (selectedCameraStatus === 'Down' && upsStatus === 'Up') {
          reason = 'CAT6 Issue or Camera End Issue - Cameras down while UPS is up';
        } else if (selectedCameraStatus === 'Up' && upsStatus === 'Down') {
          reason = 'Connected to Raw Current - Cameras are up but UPS is down';
        } else {
          reason = 'Power Issue - UPS and cameras are down';
        }

        mappingData = {
          type: 'Camera',
          cameraIP: deviceIP,
          cameraName: device.monitor || device['object.name'] || deviceIP,
          cameraStatus: 'Down',
          connectedUPS: connectedUPS,
          upsStatus: upsStatus,
          upsMonitor: upsMonitor,
          upsName: upsMonitor?.['object.name'] || connectedUPS || 'Not Found',
          allCamerasOnUPS: allCamerasOnUPS,
          reason: reason,
          districtDownCount: districtDownCount,
          districtTotalCount: districtTotalCount
        };
      }

      setDeviceMappingData(mappingData);
    } catch (error) {
      console.error('Error loading device mapping:', error);
      setDeviceMappingData(null);
    } finally {
      setLoadingMapping(false);
    }
  };

  const loadDownDevicesList = async () => {
    setLoadingDownList(true);
    setShowDownList(true);
    try {
      let filteredDevices: any[] = [];

      // Use visualization API for cameras (ID: 92323865253) and UPS (ID: 92323865741)
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
      } else if (selectedDeviceType === 'UPS') {
        // Use visualization API for UPS (ID: 92323865741)
        try {
          const vizResponse = await apiService.getApi().get('/query/visualization/92323865741');
          const vizData = vizResponse.data.result || vizResponse.data || [];
          
          // Filter by district if selected
          if (selectedDistrict) {
            const excelDistrictName = normalizeDistrictName(selectedDistrict);
            
            filteredDevices = vizData.filter((item: any) => {
              const monitorName = (item.monitor || item['object.name'] || '').toUpperCase();
              if (monitorName.includes('_UPS')) {
                const upsParts = monitorName.split('_UPS');
                if (upsParts.length > 0) {
                  const upsCode = upsParts[0].trim();
                  const upsDistrictName = getDistrictFromUPSCode(upsCode);
                  const upperDistrictName = excelDistrictName.toUpperCase();
                  
                  if (upsDistrictName) {
                    return upsDistrictName === upperDistrictName || 
                           upperDistrictName.startsWith(upsDistrictName) ||
                           upsDistrictName.startsWith(upperDistrictName.split(' ')[0]);
                  } else {
                    const normalizedDistrict = upperDistrictName.replace(/\s+/g, '');
                    return upsCode === normalizedDistrict || normalizedDistrict.startsWith(upsCode);
                  }
                }
              }
              return false;
            });
          } else {
            // Whole state - include all UPS devices
            filteredDevices = vizData;
          }
        } catch (vizError) {
          console.error('Error loading UPS visualization data, falling back to status API:', vizError);
          // Fallback to status API if visualization fails
          const downResponse = await apiService.getApi().get('/query/objects/status?status=Down');
          const downMonitors = downResponse.data.result || downResponse.data || [];
          filteredDevices = downMonitors.filter((monitor: any) => {
            const name = (monitor['object.name'] || '').toLowerCase();
            
            if (selectedDistrict) {
              const excelDistrictName = normalizeDistrictName(selectedDistrict);
              const upperName = (monitor['object.name'] || '').toUpperCase();
              if (name.includes('_ups')) {
                const upsParts = upperName.split('_UPS');
                if (upsParts.length > 0) {
                  const upsCode = upsParts[0].trim();
                  const upsDistrictName = getDistrictFromUPSCode(upsCode);
                  const upperDistrictName = excelDistrictName.toUpperCase();
                  
                  if (upsDistrictName) {
                    return upsDistrictName === upperDistrictName || 
                           upperDistrictName.startsWith(upsDistrictName) ||
                           upsDistrictName.startsWith(upperDistrictName.split(' ')[0]);
                  } else {
                    const normalizedDistrict = upperDistrictName.replace(/\s+/g, '');
                    return upsCode === normalizedDistrict || normalizedDistrict.startsWith(upsCode);
                  }
                }
              }
            } else {
              return name.includes('_ups');
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
              // GPUs: Use Excel district GPU IPs list
              if ((name.includes('gpu') || host.includes('gpu')) && !name.includes('non_gpu') && !host.includes('non_gpu')) {
                const monitorIP = monitor['object.ip'] || '';
                const districtGPUIPs = districtGPUMap[excelDistrictName.toUpperCase()] || [];
                if (districtGPUIPs.length > 0) {
                  return districtGPUIPs.includes(monitorIP);
                }
                // Fallback to name-based matching if district not found in Excel
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
              // GPUs: Use Excel GPU IPs list for whole state
              if ((name.includes('gpu') || host.includes('gpu')) && !name.includes('non_gpu') && !host.includes('non_gpu')) {
                const monitorIP = monitor['object.ip'] || '';
                return gpuIPs.length > 0 && gpuIPs.includes(monitorIP);
              }
              return false;
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
    districtName: string | null = null, // District name for server filtering (e.g., "EAST GODAVARI")
    districtGPUIPs: string[] | null = null // District GPU IPs from Excel (for GPUs)
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
        // GPUs: Use Excel IP list - check if monitorIP is in gpuIPs list
        // Exclude "Non_GPU" from name/host
        if ((name.includes('gpu') || host.includes('gpu')) && !name.includes('non_gpu') && !host.includes('non_gpu')) {
          // If district is selected, check if IP is in district GPU IPs
          if (districtGPUIPs && districtGPUIPs.length > 0) {
            if (districtGPUIPs.includes(monitorIP)) {
              matches = true;
            }
          } else if (gpuIPs.length > 0 && gpuIPs.includes(monitorIP)) {
            // Whole state: check if IP is in all GPU IPs
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
        // GPUs: Use Excel IP list - check if monitorIP is in gpuIPs list
        // Exclude "Non_GPU" from name/host
        if ((name.includes('gpu') || host.includes('gpu')) && !name.includes('non_gpu') && !host.includes('non_gpu')) {
          // If district is selected, check if IP is in district GPU IPs
          if (districtGPUIPs && districtGPUIPs.length > 0) {
            if (districtGPUIPs.includes(monitorIP)) {
              matches = true;
            }
          } else if (gpuIPs.length > 0 && gpuIPs.includes(monitorIP)) {
            // Whole state: check if IP is in all GPU IPs
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

    // For GPUs: Use Excel total, calculate up from total - down
    if (deviceType === 'GPUs') {
      // If district is selected, use district total; otherwise use all GPUs
      const totalFromExcel = districtGPUIPs && districtGPUIPs.length > 0 
        ? districtGPUIPs.length 
        : gpuIPs.length;
      // Down count is already calculated from API
      // Up count = Total - Down
      const calculatedUp = totalFromExcel - downCount;
      return { up: Math.max(0, calculatedUp), down: downCount };
    }

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
                  <option value="Cameras">
                    Cameras ({selectedDistrict ? districtDeviceTypeCounts.Cameras : deviceTypeCounts.Cameras})
                  </option>
                  <option value="Servers">
                    Servers ({selectedDistrict ? districtDeviceTypeCounts.Servers : deviceTypeCounts.Servers})
                  </option>
                  <option value="APIs">
                    APIs ({selectedDistrict ? districtDeviceTypeCounts.APIs : deviceTypeCounts.APIs})
                  </option>
                  <option value="GPUs">
                    GPUs ({selectedDistrict ? districtDeviceTypeCounts.GPUs : deviceTypeCounts.GPUs})
                  </option>
                  <option value="UPS">
                    UPS ({selectedDistrict ? districtDeviceTypeCounts.UPS : deviceTypeCounts.UPS})
                  </option>
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

      {/* Down Devices List Right Panel */}
      {showDownList && (
        <div className="fixed right-0 top-0 bottom-0 w-[calc(100%-16rem)] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-300">
          {/* Panel Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Down {selectedDeviceType}
                {selectedDistrict && ` - ${getDistrictDisplayName(selectedDistrict)}`}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Total: {downDevicesList.length} device{downDevicesList.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => {
                setShowDownList(false);
                setDownDevicesList([]);
              }}
              className="text-gray-400 hover:text-gray-600 text-3xl font-bold hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
            >
              ×
            </button>
          </div>

          {/* Panel Body */}
          <div className="flex-1 overflow-y-auto p-6">
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
                    
                    // For UPS: timestamp is down start time (milliseconds), event.timestamp is last check time (seconds)
                    // For Cameras: timestamp is in milliseconds, lastTriggered might be in various formats
                    let timestamp: number | undefined;
                    let lastCheckTime: number | undefined;
                    
                    if (selectedDeviceType === 'UPS') {
                      // UPS API format: timestamp (ms) = down start, event.timestamp (s) = last check
                      timestamp = device.timestamp; // Already in milliseconds
                      lastCheckTime = device['event.timestamp']; // Already in seconds
                    } else {
                      // Camera/other format
                      timestamp = device.timestamp || device['object.timestamp'] || device['event.timestamp'] || device.eventTimestamp;
                      lastCheckTime = device.lastTriggered || 
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
                    }
                    
                    // Debug: log the values to understand the data structure (only first device)
                    if (index === 0) {
                      console.log('Device sample:', {
                        deviceType: selectedDeviceType,
                        timestamp,
                        lastCheckTime,
                        eventTimestamp: device['event.timestamp'],
                        allKeys: Object.keys(device),
                        device: device
                      });
                    }
                    
                    // Calculate duration
                    let downDuration = null;
                    let downStartTime: string | null = null;
                    let lastCheckTimeStr: string | null = null;
                    
                    if (selectedDeviceType === 'UPS' && timestamp && lastCheckTime) {
                      // UPS: timestamp (ms) = down start, event.timestamp (s) = last check
                      const timestampSeconds = Math.floor(timestamp / 1000); // Convert ms to seconds
                      const lastCheckSeconds = lastCheckTime; // Already in seconds
                      
                      // Calculate duration: last check - down start
                      downDuration = formatDurationBetween(timestampSeconds, lastCheckSeconds);
                      downStartTime = new Date(timestamp).toLocaleString();
                      lastCheckTimeStr = new Date(lastCheckSeconds * 1000).toLocaleString();
                    } else if (timestamp) {
                      // Other device types (Cameras, etc.)
                      // Convert timestamp from milliseconds to seconds
                      const timestampSeconds = Math.floor(timestamp / 1000);
                      
                      if (lastCheckTime && typeof lastCheckTime === 'number') {
                        // Both values exist - calculate difference
                        const lastCheckSeconds = lastCheckTime > 1e12 
                          ? Math.floor(lastCheckTime / 1000) 
                          : lastCheckTime;
                        
                        downDuration = formatDurationBetween(timestampSeconds, lastCheckSeconds);
                        downStartTime = new Date(timestamp).toLocaleString();
                        lastCheckTimeStr = lastCheckSeconds ? new Date(lastCheckSeconds * 1000).toLocaleString() : null;
                      } else {
                        // Only timestamp exists - show time since timestamp
                        const currentTime = Math.floor(Date.now() / 1000);
                        const diff = currentTime - timestampSeconds;
                        
                        if (diff < 0) {
                          downDuration = null;
                        } else {
                          downDuration = formatDuration(timestampSeconds);
                        }
                        downStartTime = new Date(timestamp).toLocaleString();
                      }
                    }
                    
                    return (
                      <div
                        key={device['object.id'] || device.id || index}
                        className="bg-red-50 border border-red-200 rounded-lg p-3 hover:bg-red-100 transition-colors cursor-pointer"
                        onClick={() => handleDeviceClick(device, monitorIP)}
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
                            {downStartTime && (
                              <p className="text-xs text-gray-600 mt-1">
                                📅 Down Start: {downStartTime}
                              </p>
                            )}
                            {lastCheckTimeStr && (
                              <p className="text-xs text-gray-600 mt-1">
                                🔍 Last Check: {lastCheckTimeStr}
                              </p>
                            )}
                          </div>
                          <div className="ml-4 flex flex-col items-end">
                            <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded mb-2">
                              Down
                            </span>
                            {device.duration && (
                              <span className="text-xs text-gray-500">
                                Duration: {device.duration}s
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
      )}

      {/* Device Mapping Right Panel */}
      {deviceMappingData && (
        <div className="fixed right-0 top-0 bottom-0 w-[calc(100%-16rem)] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-300">
          {/* Panel Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setDeviceMappingData(null);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium">Back</span>
              </button>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {deviceMappingData.type === 'UPS' ? 'UPS to Cameras Mapping' : 'Camera to UPS Mapping'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {deviceMappingData.type === 'UPS' 
                    ? `UPS: ${deviceMappingData.upsName} (${deviceMappingData.upsIP})`
                    : `Camera: ${deviceMappingData.cameraName} (${deviceMappingData.cameraIP})`}
                </p>
              </div>
            </div>
          </div>

          {/* Panel Body */}
          <div className="flex-1 overflow-y-auto p-8">
            {loadingMapping ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-lg text-gray-600">Loading mapping data...</p>
                </div>
              </div>
            ) : deviceMappingData.type === 'UPS' ? (
              <div className="space-y-6">
                {/* Tree Structure */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 shadow-xl border border-gray-200">
                  <h4 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                    <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Connection Tree
                  </h4>
                  
                  {/* UPS Node */}
                  <div className="flex justify-center mb-6">
                    <div className={`relative border-4 rounded-2xl p-6 min-w-[450px] max-w-[600px] transform transition-all hover:scale-105 ${
                      deviceMappingData.upsStatus === 'Down'
                        ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-500 shadow-xl'
                        : 'bg-gradient-to-br from-green-50 to-green-100 border-green-500 shadow-xl'
                    }`}>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center shadow-lg">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-xl text-gray-900 mb-2">{deviceMappingData.upsName}</p>
                          <p className="text-base text-gray-700 font-medium">IP: {deviceMappingData.upsIP}</p>
                        </div>
                        <span className={`px-5 py-2.5 text-base font-bold rounded-xl shadow-md ${
                          deviceMappingData.upsStatus === 'Down'
                            ? 'bg-red-600 text-white'
                            : 'bg-green-600 text-white'
                        }`}>
                          {deviceMappingData.upsStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Connection Lines with SVG */}
                  {deviceMappingData.connectedCameras.length > 0 && (
                    <div className="flex justify-center mb-6">
                      <svg width="4" height="60" className="text-gray-400">
                        <line x1="2" y1="0" x2="2" y2="60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    </div>
                  )}

                  {/* Camera Nodes */}
                  {deviceMappingData.connectedCameras.length === 0 ? (
                    <p className="text-lg text-gray-500 text-center py-8">No cameras mapped to this UPS</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {deviceMappingData.connectedCameras.map((camera: any, idx: number) => (
                        <div key={idx} className="relative group">
                          <div className={`border-3 rounded-xl p-5 transition-all hover:shadow-lg ${
                            camera.status === 'Down'
                              ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-400'
                              : camera.status === 'Up'
                              ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-400'
                              : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-400'
                          }`}>
                            <div className="flex items-start gap-3 mb-3">
                              <div className="w-5 h-5 rounded-full bg-blue-500 flex-shrink-0 mt-1 shadow-md flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-base text-gray-900 break-words leading-tight">{camera.name}</p>
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 ml-8 mb-3 font-medium">IP: {camera.ip}</p>
                            <div className="ml-8">
                              <span className={`px-3 py-1.5 text-sm font-bold rounded-lg shadow-sm ${
                                camera.status === 'Down'
                                  ? 'bg-red-600 text-white'
                                  : camera.status === 'Up'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-600 text-white'
                              }`}>
                                {camera.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reason for Down */}
                <div className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 border-4 border-yellow-500 rounded-2xl p-8 shadow-xl">
                  <h4 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <svg className="w-7 h-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Reason for Down
                  </h4>
                  <p className="text-xl text-gray-900 font-bold mb-4 bg-white rounded-lg p-4 border-2 border-yellow-400">{deviceMappingData.reason}</p>
                  {deviceMappingData.districtTotalCount > 0 && (
                    <p className="text-base text-gray-700 mt-4 font-semibold">
                      <span className="text-gray-900">District Status:</span> <span className="text-red-600">{deviceMappingData.districtDownCount}/{deviceMappingData.districtTotalCount}</span> cameras down
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Tree Structure */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 shadow-xl border border-gray-200">
                  <h4 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                    <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Connection Tree
                  </h4>
                  
                  {/* UPS Node */}
                  {deviceMappingData.connectedUPS ? (
                    <>
                      <div className="flex justify-center mb-6">
                        <div className={`relative border-4 rounded-2xl p-6 min-w-[450px] max-w-[600px] transform transition-all hover:scale-105 ${
                          deviceMappingData.upsStatus === 'Down'
                            ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-500 shadow-xl'
                            : deviceMappingData.upsStatus === 'Up'
                            ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-500 shadow-xl'
                            : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-500 shadow-xl'
                        }`}>
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center shadow-lg">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                </svg>
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-xl text-gray-900 mb-2">{deviceMappingData.upsName}</p>
                              <p className="text-base text-gray-700 font-medium">IP: {deviceMappingData.connectedUPS}</p>
                            </div>
                            <span className={`px-5 py-2.5 text-base font-bold rounded-xl shadow-md ${
                              deviceMappingData.upsStatus === 'Down'
                                ? 'bg-red-600 text-white'
                                : deviceMappingData.upsStatus === 'Up'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-600 text-white'
                            }`}>
                              {deviceMappingData.upsStatus}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Connection Line with SVG */}
                      <div className="flex justify-center mb-6">
                        <svg width="4" height="60" className="text-gray-400">
                          <line x1="2" y1="0" x2="2" y2="60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                      </div>
                    </>
                  ) : (
                    <p className="text-lg text-gray-500 text-center py-8">No UPS mapped to this camera</p>
                  )}

                  {/* Camera Nodes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {deviceMappingData.allCamerasOnUPS && deviceMappingData.allCamerasOnUPS.length > 0 ? (
                      deviceMappingData.allCamerasOnUPS.map((camera: any, idx: number) => (
                        <div key={idx} className={`relative group border-3 rounded-xl p-5 transition-all hover:shadow-lg ${
                          camera.status === 'Down'
                            ? camera.isSelected
                              ? 'bg-gradient-to-br from-red-100 to-red-200 border-red-500 ring-4 ring-red-300 shadow-xl'
                              : 'bg-gradient-to-br from-red-50 to-red-100 border-red-400'
                            : camera.status === 'Up'
                            ? camera.isSelected
                              ? 'bg-gradient-to-br from-green-100 to-green-200 border-green-500 ring-4 ring-green-300 shadow-xl'
                              : 'bg-gradient-to-br from-green-50 to-green-100 border-green-400'
                            : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-400'
                        }`}>
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-5 h-5 rounded-full bg-blue-500 flex-shrink-0 mt-1 shadow-md flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-white"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base text-gray-900 break-words leading-tight">
                                {camera.name}
                                {camera.isSelected && <span className="ml-2 text-sm text-blue-600 font-bold">(Selected)</span>}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 ml-8 mb-3 font-medium">IP: {camera.ip}</p>
                          <div className="ml-8">
                            <span className={`px-3 py-1.5 text-sm font-bold rounded-lg shadow-sm ${
                              camera.status === 'Down'
                                ? 'bg-red-600 text-white'
                                : camera.status === 'Up'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-600 text-white'
                            }`}>
                              {camera.status}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={`border-3 rounded-xl p-5 bg-gradient-to-br from-red-50 to-red-100 border-red-400 shadow-md`}>
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex-shrink-0 mt-1 shadow-md flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base text-gray-900 break-words leading-tight">{deviceMappingData.cameraName}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 ml-8 mb-3 font-medium">IP: {deviceMappingData.cameraIP}</p>
                        <div className="ml-8">
                          <span className="px-3 py-1.5 text-sm font-bold rounded-lg shadow-sm bg-red-600 text-white">
                            Down
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reason for Down */}
                <div className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 border-4 border-yellow-500 rounded-2xl p-8 shadow-xl">
                  <h4 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <svg className="w-7 h-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Reason for Down
                  </h4>
                  <p className="text-xl text-gray-900 font-bold mb-4 bg-white rounded-lg p-4 border-2 border-yellow-400">{deviceMappingData.reason}</p>
                  {deviceMappingData.districtTotalCount > 0 && (
                    <p className="text-base text-gray-700 mt-4 font-semibold">
                      <span className="text-gray-900">District Status:</span> <span className="text-red-600">{deviceMappingData.districtDownCount}/{deviceMappingData.districtTotalCount}</span> cameras down
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
