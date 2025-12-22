import React, { useEffect, useRef, useState, useMemo } from 'react';
import { apiService } from '../services/api';
import { parseUPSCameraMapping, parseOLTMapping, parseCameraLocations, CameraLocation } from '../utils/excelParser';

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google: any;
  }
}

interface CameraMarker {
  ip: string;
  name: string;
  status: 'Up' | 'Down' | 'Unknown';
  lat: number;
  lng: number;
  district: string;
}

interface DeviceMappingData {
  type: 'Camera';
  cameraIP: string;
  cameraName: string;
  cameraStatus: string;
  connectedUPS: string | null;
  upsStatus: string;
  upsMonitor: any;
  upsName: string;
  allCamerasOnUPS: any[];
  connectedOLT: string | null;
  oltPonPort: string | null;
  oltStatus: string;
  oltLastUpTime: string;
  oltLastDownTime: string;
  allCamerasOnOLT: any[];
  reason: string;
}

const SearchMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const [loading, setLoading] = useState(false);
  const [cameras, setCameras] = useState<CameraMarker[]>([]);
  const [filteredCameras, setFilteredCameras] = useState<CameraMarker[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [showLocations, setShowLocations] = useState(false);
  const [searchIP, setSearchIP] = useState<string>('');
  const [searchType, setSearchType] = useState<'camera' | 'ups' | 'olt'>('camera');
  const [selectedCamera, setSelectedCamera] = useState<CameraMarker | null>(null);
  const [showConnectionPanel, setShowConnectionPanel] = useState(false);
  const [deviceMappingData, setDeviceMappingData] = useState<DeviceMappingData | null>(null);
  const [loadingMapping, setLoadingMapping] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string>('');

  // 13 Districts list
  const DISTRICTS_LIST = [
    'ANANTAPUR',
    'CHITTOOR',
    'EAST GODAVARI',
    'GUNTUR',
    'KADAPA',
    'KRISHNA',
    'KRISHNA RURAL',
    'KRISHNA URBAN',
    'KURNOOL',
    'NELLORE',
    'PRAKASAM',
    'SRIKAKULAM',
    'VISAKHAPATNAM',
    'VIZIANAGARAM',
    'WEST GODAVARI'
  ];

  // Districts that have UPS-Camera mapping data
  const DISTRICTS_WITH_UPS = [
    'GUNTUR',
    'NELLORE',
    'PRAKASAM',
    'SRIKAKULAM',
    'VISAKHAPATNAM',
    'VIZIANAGARAM'
  ];

  // Helper function to normalize district name for comparison
  const normalizeDistrictForUPS = (district: string): string => {
    if (!district) return '';
    const normalized = district.toUpperCase().trim();
    // Handle variations and exact matches
    if (normalized === 'GUNTUR' || normalized.includes('GUNTUR')) return 'GUNTUR';
    if (normalized === 'NELLORE' || normalized.includes('NELLORE') || normalized.includes('SRI POTTI SRIRAMULU NELLORE')) return 'NELLORE';
    if (normalized === 'PRAKASAM' || normalized.includes('PRAKASAM')) return 'PRAKASAM';
    if (normalized === 'SRIKAKULAM' || normalized.includes('SRIKAKULAM')) return 'SRIKAKULAM';
    if (normalized === 'VISAKHAPATNAM' || normalized.includes('VISAKHAPATNAM') || normalized.includes('VIZAG')) return 'VISAKHAPATNAM';
    if (normalized === 'VIZIANAGARAM' || normalized.includes('VIZIANAGARAM')) return 'VIZIANAGARAM';
    return normalized;
  };

  // Check if a district has UPS data
  const hasUPSData = (district: string): boolean => {
    const normalized = normalizeDistrictForUPS(district);
    return DISTRICTS_WITH_UPS.includes(normalized);
  };

  // Excel data states
  const [upsCameraMapping, setUpsCameraMapping] = useState<any>({
    cameraToUPS: {},
    upsToCameras: {}
  });
  const [oltCameraMapping, setOltCameraMapping] = useState<any>({
    cameraToOLT: {},
    oltToCameras: {},
    allOLTIPs: [],
    districtOLTs: {}
  });
  const [cameraLocations, setCameraLocations] = useState<Record<string, CameraLocation>>({});

  // Load Excel data
  useEffect(() => {
    const loadExcelData = async () => {
      try {
        // Load camera locations from Book1.xlsx
        const locations = await parseCameraLocations();
        setCameraLocations(locations);

        // Load UPS-Camera mappings from multiple districts
        const mappingFiles = [
          '/GUNTUR UPS & CAMERA IPS MAPING DATA.xlsx',
          '/Srikakulam Camera with UPS-IP Details.xlsx',
          '/PRAKASAM Camera & ups maping data.xlsx',
          '/Nellore Camera with UPS-IP Details.xlsx',
          '/Vizianagaram Camera with UPS-IP Details.xlsx',
          '/Visakhapatnam Camera with UPS-IP Details.xlsx'
        ];

        const mappingResults = await Promise.all(
          mappingFiles.map(async (file) => {
            try {
              return await parseUPSCameraMapping(file);
            } catch (err) {
              console.warn(`Error loading UPS-Camera mapping from ${file}:`, err);
              return { upsToCameras: {}, cameraToUPS: {} };
            }
          })
        );

        // Merge all UPS mappings
        const mergedUpsToCameras: { [upsIP: string]: string[] } = {};
        const mergedCameraToUPS: { [cameraIP: string]: string } = {};

        mappingResults.forEach((mapping) => {
          Object.entries(mapping.upsToCameras).forEach(([upsIP, cameras]) => {
            if (!mergedUpsToCameras[upsIP]) {
              mergedUpsToCameras[upsIP] = [];
            }
            cameras.forEach((camIP: string) => {
              if (!mergedUpsToCameras[upsIP].includes(camIP)) {
                mergedUpsToCameras[upsIP].push(camIP);
              }
            });
          });

          Object.entries(mapping.cameraToUPS).forEach(([cameraIP, upsIP]) => {
            mergedCameraToUPS[cameraIP] = upsIP;
          });
        });

        console.log('[SearchMap] Merged UPS-Camera mappings:', {
          upsCount: Object.keys(mergedUpsToCameras).length,
          cameraCount: Object.keys(mergedCameraToUPS).length
        });
        
        // Debug: Check if specific camera IP exists in mapping
        const testCameraIP = '10.246.6.8';
        if (mergedCameraToUPS[testCameraIP]) {
          console.log(`[SearchMap] Test camera ${testCameraIP} found in mapping - UPS: ${mergedCameraToUPS[testCameraIP]}`);
        } else {
          console.log(`[SearchMap] Test camera ${testCameraIP} NOT found in mapping`);
          // Show sample of what's in the mapping
          const sampleCameras = Object.keys(mergedCameraToUPS).slice(0, 5);
          console.log(`[SearchMap] Sample camera IPs in mapping:`, sampleCameras);
        }

        setUpsCameraMapping({
          upsToCameras: mergedUpsToCameras,
          cameraToUPS: mergedCameraToUPS
        });

        // Load OLT mapping
        const oltMapping = await parseOLTMapping('/OLT IP\'s.xlsx');
        setOltCameraMapping(oltMapping);
      } catch (error) {
        console.error('Error loading Excel data:', error);
      }
    };

    loadExcelData();
  }, []);

  // Load cameras only for selected district and when showLocations is checked
  useEffect(() => {
    const loadCameras = async () => {
      if (Object.keys(cameraLocations).length === 0) return;
      if (!selectedDistrict || !showLocations) {
        // No district selected or showLocations not checked, clear cameras
        setCameras([]);
        setFilteredCameras([]);
        return;
      }
      
      setLoading(true);
      try {
        // Filter cameras by selected district from Book1.xlsx
        const districtCameras: CameraMarker[] = Object.values(cameraLocations)
          .filter(loc => loc.district === selectedDistrict)
          .map(loc => ({
            ip: loc.ip,
            name: loc.locationName || loc.ip,
            status: 'Unknown' as 'Up' | 'Down' | 'Unknown',
            lat: loc.lat,
            lng: loc.lng,
            district: loc.district
          }));

        console.log(`[SearchMap] Loaded ${districtCameras.length} cameras for ${selectedDistrict}`);

        // Try to fetch status from API for these cameras (but don't fail if it errors)
        try {
          const [upResponse, downResponse] = await Promise.all([
            apiService.getApi().get('/query/objects/status?status=Up').catch(() => ({ data: { result: [] } })),
            apiService.getApi().get('/query/objects/status?status=Down').catch(() => ({ data: { result: [] } }))
          ]);

          const upCameras = upResponse.data.result || upResponse.data || [];
          const downCameras = downResponse.data.result || downResponse.data || [];

          // Create status map
          const statusMap: Record<string, 'Up' | 'Down'> = {};
          upCameras.forEach((cam: any) => {
            const ip = cam['object.ip'] || '';
            if (ip) statusMap[ip] = 'Up';
          });
          downCameras.forEach((cam: any) => {
            const ip = cam['object.ip'] || '';
            if (ip) statusMap[ip] = 'Down';
          });

          // Update camera statuses
          districtCameras.forEach(camera => {
            if (statusMap[camera.ip]) {
              camera.status = statusMap[camera.ip];
            }
          });

          console.log(`[SearchMap] Updated status for ${selectedDistrict} cameras from API`);
        } catch (apiError) {
          console.warn('[SearchMap] Could not fetch camera status from API, showing all as Unknown:', apiError);
        }

        setCameras(districtCameras);
        setFilteredCameras(districtCameras);
      } catch (error) {
        console.error('Error loading cameras:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCameras();
  }, [cameraLocations, selectedDistrict, showLocations]);

  // Initialize Google Map
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      console.error('[SearchMap] Google Maps API key not configured');
      setLoading(false);
      return;
    }

    const initializeMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      if (!window.google || !window.google.maps) return;

      console.log('[SearchMap] Initializing map...');
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 15.9129, lng: 79.7400 }, // Andhra Pradesh center
        zoom: 8,
        mapTypeId: 'roadmap',
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
      });

      mapInstanceRef.current = map;
      console.log('[SearchMap] Map initialized successfully');
    };

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps && window.google.maps.Map) {
      console.log('[SearchMap] Google Maps already loaded');
      setTimeout(() => {
        initializeMap();
      }, 100);
      return;
    }

    // Check if script is already in DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('[SearchMap] Script already in DOM, waiting for load...');
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.Map) {
          clearInterval(checkInterval);
          initializeMap();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.google || !window.google.maps) {
          console.error('[SearchMap] Google Maps failed to load');
          setLoading(false);
        }
      }, 10000);
      
      return () => clearInterval(checkInterval);
    }

    // Load Google Maps script
    console.log('[SearchMap] Loading Google Maps script...');
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('[SearchMap] Script loaded');
      setTimeout(() => {
        initializeMap();
      }, 100);
    };
    
    script.onerror = () => {
      console.error('[SearchMap] Failed to load Google Maps script');
      setLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // Don't remove the script as other components might be using it
    };
  }, []);

  // Update markers when filtered cameras change and auto-zoom to fit
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    if (!window.google || !window.google.maps) return;

    if (filteredCameras.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();

    filteredCameras.forEach(camera => {
      const position = { lat: camera.lat, lng: camera.lng };
      const marker = new window.google.maps.Marker({
        position,
        map: mapInstanceRef.current!,
        title: `${camera.name} (${camera.ip})`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: camera.status === 'Down' ? '#ef4444' : camera.status === 'Up' ? '#22c55e' : '#6b7280',
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        handleCameraClick(camera);
      });

      markersRef.current.push(marker);
      bounds.extend(position);
    });

    // Auto-zoom to fit all markers
    mapInstanceRef.current.fitBounds(bounds);
    
    // Ensure zoom level is not too close
    const listener = window.google.maps.event.addListenerOnce(mapInstanceRef.current, 'bounds_changed', () => {
      const currentZoom = mapInstanceRef.current?.getZoom();
      if (currentZoom && currentZoom > 15) {
        mapInstanceRef.current?.setZoom(15);
      }
    });
  }, [filteredCameras]);

  // Filter cameras by search (Camera/UPS/OLT) - Precise IP search
  useEffect(() => {
    const applySearch = async () => {
      setSearchMessage(''); // Clear previous message
      
      if (!searchIP.trim()) {
        // No search term - use cameras from selected district (if showLocations is checked)
        if (showLocations && selectedDistrict) {
          setFilteredCameras(cameras);
        } else {
          setFilteredCameras([]);
        }
        return;
      }

      const searchTerm = searchIP.trim().toLowerCase();
      
      if (searchType === 'camera') {
        // Precise search by camera IP - exact match only
        setLoading(true);
        
        // Search for exact IP match (case-insensitive)
        let matchingCameras: CameraMarker[] = [];
        const searchIPTrimmed = searchIP.trim();
        
        // Try exact match first
        let location = cameraLocations[searchIPTrimmed];
        
        // If not found, try case-insensitive match
        if (!location) {
          const matchingKey = Object.keys(cameraLocations).find(ip => ip.toLowerCase() === searchTerm);
          if (matchingKey) {
            location = cameraLocations[matchingKey];
          }
        }
        
        if (location) {
          matchingCameras.push({
            ip: location.ip,
            name: location.locationName || location.ip,
            status: 'Unknown',
            lat: location.lat,
            lng: location.lng,
            district: location.district
          });
        } else {
          // No exact match found
          setSearchMessage(`No camera found with IP: ${searchIP}`);
          setFilteredCameras([]);
          setLoading(false);
          return;
        }

        // Try to get status from API
        if (matchingCameras.length > 0) {
          try {
            const [upResponse, downResponse] = await Promise.all([
              apiService.getApi().get('/query/objects/status?status=Up').catch(() => ({ data: { result: [] } })),
              apiService.getApi().get('/query/objects/status?status=Down').catch(() => ({ data: { result: [] } }))
            ]);

            const upCameras = upResponse.data.result || [];
            const downCameras = downResponse.data.result || [];

            const statusMap: Record<string, 'Up' | 'Down'> = {};
            upCameras.forEach((cam: any) => {
              const ip = cam['object.ip'] || '';
              if (ip) statusMap[ip] = 'Up';
            });
            downCameras.forEach((cam: any) => {
              const ip = cam['object.ip'] || '';
              if (ip) statusMap[ip] = 'Down';
            });

            matchingCameras.forEach(camera => {
              if (statusMap[camera.ip]) {
                camera.status = statusMap[camera.ip];
              }
            });
          } catch (err) {
            console.warn('[SearchMap] Could not fetch status for camera search');
          }
        }

        console.log(`[SearchMap] Camera search "${searchTerm}": Found ${matchingCameras.length} camera(s)`);
        if (matchingCameras.length === 0) {
          setSearchMessage(`No camera found with IP: ${searchIP}`);
        }
        setFilteredCameras(matchingCameras);
        setLoading(false);
      } else if (searchType === 'ups') {
        // Search by UPS IP - show all cameras connected to this UPS (from all districts)
        setLoading(true);
        const camerasOnUPS = upsCameraMapping.upsToCameras[searchIP] || [];
        
        if (camerasOnUPS.length > 0) {
          // Load these cameras from location data
          const upsConnectedCameras: CameraMarker[] = [];
          
          for (const cameraIP of camerasOnUPS) {
            const location = cameraLocations[cameraIP];
            if (location) {
              upsConnectedCameras.push({
                ip: location.ip,
                name: location.locationName || location.ip,
                status: 'Unknown',
                lat: location.lat,
                lng: location.lng,
                district: location.district
              });
            }
          }

          // Try to get status from API
          try {
            const [upResponse, downResponse] = await Promise.all([
              apiService.getApi().get('/query/objects/status?status=Up').catch(() => ({ data: { result: [] } })),
              apiService.getApi().get('/query/objects/status?status=Down').catch(() => ({ data: { result: [] } }))
            ]);

            const upCameras = upResponse.data.result || [];
            const downCameras = downResponse.data.result || [];

            const statusMap: Record<string, 'Up' | 'Down'> = {};
            upCameras.forEach((cam: any) => {
              const ip = cam['object.ip'] || '';
              if (ip) statusMap[ip] = 'Up';
            });
            downCameras.forEach((cam: any) => {
              const ip = cam['object.ip'] || '';
              if (ip) statusMap[ip] = 'Down';
            });

            upsConnectedCameras.forEach(camera => {
              if (statusMap[camera.ip]) {
                camera.status = statusMap[camera.ip];
              }
            });
          } catch (err) {
            console.warn('[SearchMap] Could not fetch status for UPS search');
          }

          console.log(`[SearchMap] UPS ${searchIP}: Found ${upsConnectedCameras.length} connected cameras`);
          setFilteredCameras(upsConnectedCameras);
          setLoading(false);
        } else {
          console.warn(`[SearchMap] No cameras found for UPS ${searchIP}`);
          setSearchMessage(`No cameras found connected to UPS IP: ${searchIP}`);
          setFilteredCameras([]);
          setLoading(false);
        }
      } else if (searchType === 'olt') {
        // Search by OLT IP - show all cameras connected to this OLT (from all districts)
        setLoading(true);
        const camerasOnOLT = oltCameraMapping.oltToCameras[searchIP] || [];
        
        if (camerasOnOLT.length > 0) {
          // Load these cameras from location data
          const oltConnectedCameras: CameraMarker[] = [];
          
          for (const cameraIP of camerasOnOLT) {
            const location = cameraLocations[cameraIP];
            if (location) {
              oltConnectedCameras.push({
                ip: location.ip,
                name: location.locationName || location.ip,
                status: 'Unknown',
                lat: location.lat,
                lng: location.lng,
                district: location.district
              });
            }
          }

          // Try to get status from API
          try {
            const [upResponse, downResponse] = await Promise.all([
              apiService.getApi().get('/query/objects/status?status=Up').catch(() => ({ data: { result: [] } })),
              apiService.getApi().get('/query/objects/status?status=Down').catch(() => ({ data: { result: [] } }))
            ]);

            const upCameras = upResponse.data.result || [];
            const downCameras = downResponse.data.result || [];

            const statusMap: Record<string, 'Up' | 'Down'> = {};
            upCameras.forEach((cam: any) => {
              const ip = cam['object.ip'] || '';
              if (ip) statusMap[ip] = 'Up';
            });
            downCameras.forEach((cam: any) => {
              const ip = cam['object.ip'] || '';
              if (ip) statusMap[ip] = 'Down';
            });

            oltConnectedCameras.forEach(camera => {
              if (statusMap[camera.ip]) {
                camera.status = statusMap[camera.ip];
              }
            });
          } catch (err) {
            console.warn('[SearchMap] Could not fetch status for OLT search');
          }

          console.log(`[SearchMap] OLT ${searchIP}: Found ${oltConnectedCameras.length} connected cameras`);
          setFilteredCameras(oltConnectedCameras);
          setLoading(false);
        } else {
          console.warn(`[SearchMap] No cameras found for OLT ${searchIP}`);
          setSearchMessage(`No cameras found connected to OLT IP: ${searchIP}`);
          setFilteredCameras([]);
          setLoading(false);
        }
      }
    };

    applySearch();
  }, [cameras, searchIP, searchType, upsCameraMapping, oltCameraMapping, cameraLocations, showLocations, selectedDistrict]);

  // Handle camera marker click
  const handleCameraClick = async (camera: CameraMarker) => {
    setSelectedCamera(camera);
    setShowConnectionPanel(true);
    setLoadingMapping(true);

    try {
      // Fetch monitor data using correct API endpoints
      const [upResponse, downResponse] = await Promise.all([
        apiService.getApi().get('/query/objects/status?status=Up').catch(() => ({ data: { result: [] } })),
        apiService.getApi().get('/query/objects/status?status=Down').catch(() => ({ data: { result: [] } }))
      ]);

      const upMonitors = upResponse.data.result || upResponse.data || [];
      const downMonitors = downResponse.data.result || downResponse.data || [];

      // Create monitor map
      const monitorByIP: Record<string, any> = {};
      [...upMonitors, ...downMonitors].forEach((m: any) => {
        const ip = m['object.ip'] || '';
        if (ip) monitorByIP[ip] = m;
      });

      // Get UPS information - only for districts that have UPS data
      let connectedUPS: string | null = null;
      let upsStatus = 'Unknown';
      let upsMonitor = null;
      let allCamerasOnUPS: any[] = [];

      // Only check for UPS if this district has UPS mapping data
      const cameraDistrict = camera.district || '';
      const hasUPS = hasUPSData(cameraDistrict);
      console.log(`[SearchMap] Camera ${camera.ip} in district "${cameraDistrict}" - Has UPS data: ${hasUPS}`);
      
      if (hasUPS) {
        // Try exact match first
        connectedUPS = upsCameraMapping.cameraToUPS[camera.ip] || null;
        
        // If not found, try case-insensitive search
        if (!connectedUPS) {
          const matchingKey = Object.keys(upsCameraMapping.cameraToUPS).find(
            key => key.toLowerCase() === camera.ip.toLowerCase()
          );
          if (matchingKey) {
            connectedUPS = upsCameraMapping.cameraToUPS[matchingKey];
            console.log(`[SearchMap] Found UPS via case-insensitive match: ${connectedUPS}`);
          }
        }
        
        // Debug: Show what's in the mapping
        if (!connectedUPS) {
          console.log(`[SearchMap] Camera ${camera.ip} not found in UPS mapping`);
          console.log(`[SearchMap] Total cameras in UPS mapping: ${Object.keys(upsCameraMapping.cameraToUPS).length}`);
          const sampleKeys = Object.keys(upsCameraMapping.cameraToUPS).slice(0, 10);
          console.log(`[SearchMap] Sample camera IPs in mapping:`, sampleKeys);
        } else {
          console.log(`[SearchMap] Camera ${camera.ip} - Connected UPS: ${connectedUPS}`);
        }
        
        if (connectedUPS) {
          upsMonitor = monitorByIP[connectedUPS];
          const isUp = upMonitors.some((m: any) => (m['object.ip'] || '') === connectedUPS);
          const isDown = downMonitors.some((m: any) => (m['object.ip'] || '') === connectedUPS);
          upsStatus = isUp ? 'Up' : isDown ? 'Down' : 'Unknown';

          // Get all cameras on this UPS
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
              isSelected: cameraIP === camera.ip
            };
          });
        }
      } else {
        // District doesn't have UPS data - set connectedUPS to null
        connectedUPS = null;
        console.log(`[SearchMap] District "${camera.district}" does not have UPS mapping data`);
      }

      // Get OLT information
      const oltInfo = oltCameraMapping.cameraToOLT[camera.ip] || null;
      let oltStatus = 'Unknown';
      let oltLastUpTime = '';
      let oltLastDownTime = '';
      let allCamerasOnOLT: any[] = [];

      if (oltInfo) {
        const oltStatusData = await checkOLTStatus(oltInfo.oltIP);
        oltStatus = oltStatusData.status;
        oltLastUpTime = oltStatusData.lastUpTime || '';
        oltLastDownTime = oltStatusData.lastDownTime || '';

        // Get all cameras on this OLT
        const camerasOnOLT = oltCameraMapping.oltToCameras[oltInfo.oltIP] || [];
        allCamerasOnOLT = camerasOnOLT.map((cameraIP: string) => {
          const cameraMonitor = monitorByIP[cameraIP];
          const isUp = upMonitors.some((m: any) => (m['object.ip'] || '') === cameraIP);
          const isDown = downMonitors.some((m: any) => (m['object.ip'] || '') === cameraIP);
          const camOltInfo = oltCameraMapping.cameraToOLT[cameraIP];

          return {
            ip: cameraIP,
            name: cameraMonitor?.['object.name'] || cameraIP,
            status: isUp ? 'Up' : isDown ? 'Down' : 'Unknown',
            monitor: cameraMonitor,
            ponPort: camOltInfo?.ponPort || 'N/A',
            isSelected: cameraIP === camera.ip
          };
        });
      }

      // Get camera status from monitor data or use the camera's current status
      const cameraMonitor = monitorByIP[camera.ip];
      const isCameraUp = upMonitors.some((m: any) => (m['object.ip'] || '') === camera.ip);
      const isCameraDown = downMonitors.some((m: any) => (m['object.ip'] || '') === camera.ip);
      const finalCameraStatus = isCameraUp ? 'Up' : isCameraDown ? 'Down' : camera.status;

      // Determine reason
      let reason = '';
      if (finalCameraStatus === 'Down' && upsStatus === 'Down') {
        reason = 'Power Issue - UPS and camera are down';
      } else if (finalCameraStatus === 'Down' && upsStatus === 'Up') {
        reason = 'CAT6 Issue or Camera End Issue - Camera down while UPS is up';
      } else if (finalCameraStatus === 'Up' && upsStatus === 'Down') {
        reason = 'Connected to Raw Current - Camera is up but UPS is down';
      } else {
        reason = 'Normal Operation';
      }

      const mappingData: DeviceMappingData = {
        type: 'Camera',
        cameraIP: camera.ip,
        cameraName: camera.name,
        cameraStatus: finalCameraStatus,
        connectedUPS: connectedUPS,
        upsStatus: upsStatus,
        upsMonitor: upsMonitor,
        upsName: upsMonitor?.['object.name'] || connectedUPS || 'Not Found',
        allCamerasOnUPS: allCamerasOnUPS,
        connectedOLT: oltInfo?.oltIP || null,
        oltPonPort: oltInfo?.ponPort || null,
        oltStatus: oltStatus,
        oltLastUpTime: oltLastUpTime,
        oltLastDownTime: oltLastDownTime,
        allCamerasOnOLT: allCamerasOnOLT,
        reason: reason
      };

      setDeviceMappingData(mappingData);
    } catch (error) {
      console.error('Error loading device mapping:', error);
      // Even if API fails, show connection network with available data
      // Only get UPS if district has UPS data
      let connectedUPS: string | null = null;
      if (hasUPSData(camera.district)) {
        connectedUPS = upsCameraMapping.cameraToUPS[camera.ip] || null;
      }
      
      const oltInfo = oltCameraMapping.cameraToOLT[camera.ip] || null;
      
      // Try to get OLT status
      let oltStatus = 'Unknown';
      let oltLastUpTime = '';
      let oltLastDownTime = '';
      
      if (oltInfo) {
        try {
          const oltStatusData = await checkOLTStatus(oltInfo.oltIP);
          oltStatus = oltStatusData.status;
          oltLastUpTime = oltStatusData.lastUpTime || '';
          oltLastDownTime = oltStatusData.lastDownTime || '';
        } catch (oltError) {
          console.warn('Could not fetch OLT status:', oltError);
        }
      }

      const fallbackData: DeviceMappingData = {
        type: 'Camera',
        cameraIP: camera.ip,
        cameraName: camera.name,
        cameraStatus: camera.status,
        connectedUPS: connectedUPS,
        upsStatus: 'Unknown',
        upsMonitor: null,
        upsName: connectedUPS || 'Not Found',
        allCamerasOnUPS: (connectedUPS && hasUPSData(camera.district)) ? (upsCameraMapping.upsToCameras[connectedUPS] || []).map((camIP: string) => ({
          ip: camIP,
          name: camIP,
          status: 'Unknown' as 'Up' | 'Down' | 'Unknown',
          monitor: null,
          isSelected: camIP === camera.ip
        })) : [],
        connectedOLT: oltInfo?.oltIP || null,
        oltPonPort: oltInfo?.ponPort || null,
        oltStatus: oltStatus,
        oltLastUpTime: oltLastUpTime,
        oltLastDownTime: oltLastDownTime,
        allCamerasOnOLT: oltInfo ? (oltCameraMapping.oltToCameras[oltInfo.oltIP] || []).map((camIP: string) => ({
          ip: camIP,
          name: camIP,
          status: 'Unknown' as 'Up' | 'Down' | 'Unknown',
          monitor: null,
          ponPort: oltInfo?.ponPort || 'N/A',
          isSelected: camIP === camera.ip
        })) : [],
        reason: 'Unable to fetch full status - showing connection structure only'
      };

      setDeviceMappingData(fallbackData);
    } finally {
      setLoadingMapping(false);
    }
  };

  // Check OLT status
  const checkOLTStatus = async (oltIP: string): Promise<{ status: string; lastUpTime?: string; lastDownTime?: string }> => {
    try {
      const response = await fetch(`/api/olt-status?olt_no=${encodeURIComponent(oltIP)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.message === 'success' && data.data && data.data.length > 0) {
        const oltData = data.data[0];
        const oltStatusCode = oltData.olt_status?.toString();
        const status = oltStatusCode === '1' ? 'Up' : oltStatusCode === '4' ? 'Down' : 'Unknown';
        return {
          status,
          lastUpTime: oltData.last_up_time,
          lastDownTime: oltData.last_down_time
        };
      }
      
      return { status: 'Unknown' };
    } catch (error) {
      console.error(`[OLT Status Check] Error for ${oltIP}:`, error);
      return { status: 'Unknown' };
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Camera Search & Location</h1>
        
        {/* Filters */}
        <div className="flex gap-4 items-end">
          {/* District Dropdown */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by District
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                if (!e.target.value) {
                  setShowLocations(false); // Uncheck if district is cleared
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select a District --</option>
              {DISTRICTS_LIST.map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>

          {/* Show Locations Checkbox */}
          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showLocations}
                onChange={(e) => {
                  setShowLocations(e.target.checked);
                  if (!e.target.checked) {
                    setFilteredCameras([]); // Clear cameras when unchecked
                  }
                }}
                disabled={!selectedDistrict}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Show Locations
              </span>
            </label>
          </div>

          {/* Search Type */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Type
            </label>
            <select
              value={searchType}
              onChange={(e) => {
                setSearchType(e.target.value as 'camera' | 'ups' | 'olt');
                setSearchIP(''); // Clear search when type changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="camera">Camera IP/Name</option>
              <option value="ups">UPS IP</option>
              <option value="olt">OLT IP</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {searchType === 'camera' ? 'Search Camera' : searchType === 'ups' ? 'Search UPS IP (Exact)' : 'Search OLT IP (Exact)'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchIP}
                onChange={(e) => setSearchIP(e.target.value)}
                placeholder={
                  searchType === 'camera' 
                    ? 'Enter camera IP or name...' 
                    : searchType === 'ups'
                    ? 'Enter exact UPS IP (e.g., 10.246.14.98)...'
                    : 'Enter exact OLT IP (e.g., 172.16.245.73)...'
                }
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchIP && (
                <button
                  onClick={() => setSearchIP('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {searchType === 'camera' && (
              <p className="text-xs text-blue-600 mt-1">
                💡 Enter exact camera IP (e.g., 10.246.27.77)
              </p>
            )}
            {searchType !== 'camera' && (
              <p className="text-xs text-blue-600 mt-1">
                💡 Enter exact IP to show all connected cameras across districts
              </p>
            )}
            {searchMessage && (
              <p className="text-xs text-red-600 mt-1 font-semibold">
                ⚠️ {searchMessage}
              </p>
            )}
          </div>

          {/* Stats - Show when district is selected or search is active */}
          {(selectedDistrict || searchIP.trim()) && filteredCameras.length > 0 && (
            <div className="flex gap-4 items-center px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-center">
                <p className="text-xs text-gray-600">Total</p>
                <p className="text-lg font-bold text-gray-900">{filteredCameras.length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600">Up</p>
                <p className="text-lg font-bold text-green-600">
                  {filteredCameras.filter(c => c.status === 'Up').length}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600">Down</p>
                <p className="text-lg font-bold text-red-600">
                  {filteredCameras.filter(c => c.status === 'Down').length}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600">Unknown</p>
                <p className="text-lg font-bold text-gray-600">
                  {filteredCameras.filter(c => c.status === 'Unknown').length}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map and Connection Panel Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className={`${showConnectionPanel ? 'w-1/2' : 'w-full'} transition-all duration-300 relative`}>
          <div ref={mapRef} className="w-full h-full" />
          {loading && selectedDistrict && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
              <div className="bg-white rounded-lg shadow-lg px-6 py-3 flex items-center gap-3 border border-blue-200">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <p className="text-sm font-medium text-gray-700">Loading cameras for {selectedDistrict}...</p>
              </div>
            </div>
          )}
        </div>

        {/* Connection Panel */}
        {showConnectionPanel && deviceMappingData && (
          <div className="w-1/2 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Connection Network</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Camera: {deviceMappingData.cameraName} ({deviceMappingData.cameraIP})
                </p>
              </div>
              <button
                onClick={() => setShowConnectionPanel(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {loadingMapping ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-lg text-gray-600">Loading connection data...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Neural Network Visualization - Same as AndhraPradeshMap */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 shadow-lg border border-slate-200">
                    <h4 className="text-base font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Connection Network
                    </h4>

                    <div className="relative">
                      {/* SVG for connection lines */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                        {/* Line from OLT to UPS */}
                        {deviceMappingData.connectedOLT && deviceMappingData.connectedUPS && (
                          <line x1="15%" y1="50%" x2="45%" y2="50%" stroke="#9333ea" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" />
                        )}
                        {/* Line from UPS to Camera */}
                        {deviceMappingData.connectedUPS && (
                          <line x1="55%" y1="50%" x2="85%" y2="50%" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" />
                        )}
                      </svg>

                      <div className="relative grid grid-cols-3 gap-6 items-center" style={{ zIndex: 1 }}>
                        
                        {/* LEFT: OLT Node */}
                        <div className="flex flex-col items-center">
                          {deviceMappingData.connectedOLT ? (
                            <>
                              <div className="relative group">
                                <div className={`w-28 h-28 rounded-2xl border-4 shadow-xl flex flex-col items-center justify-center cursor-help transition-transform hover:scale-110 ${
                                  deviceMappingData.oltStatus === 'Down'
                                    ? 'bg-gradient-to-br from-red-400 to-red-600 border-red-700'
                                    : deviceMappingData.oltStatus === 'Up'
                                    ? 'bg-gradient-to-br from-purple-400 to-purple-600 border-purple-700'
                                    : 'bg-gradient-to-br from-gray-400 to-gray-600 border-gray-700'
                                }`}>
                                  <svg className="w-12 h-12 text-white mb-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                  </svg>
                                  <p className="text-xs font-bold text-white">OLT</p>
                                </div>
                                <div className="absolute hidden group-hover:block z-50 top-full mt-2 left-1/2 transform -translate-x-1/2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-2xl">
                                  <p className="font-bold mb-1">OLT {deviceMappingData.connectedOLT}</p>
                                  <p>PON Port: {deviceMappingData.oltPonPort || 'N/A'}</p>
                                  <p className="mt-2">Status: <span className={deviceMappingData.oltStatus === 'Up' ? 'text-green-400' : 'text-red-400'}>{deviceMappingData.oltStatus}</span></p>
                                  {deviceMappingData.oltLastUpTime && <p className="mt-1 text-green-300 text-xs">↑ {deviceMappingData.oltLastUpTime}</p>}
                                  {deviceMappingData.oltLastDownTime && <p className="text-red-300 text-xs">↓ {deviceMappingData.oltLastDownTime}</p>}
                                </div>
                              </div>
                              <div className="mt-3 text-center">
                                <p className="text-xs font-semibold text-gray-700">{deviceMappingData.connectedOLT}</p>
                                <span className={`inline-block mt-1 px-2 py-1 text-xs font-bold rounded ${
                                  deviceMappingData.oltStatus === 'Down' ? 'bg-red-600 text-white' :
                                  deviceMappingData.oltStatus === 'Up' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-white'
                                }`}>
                                  {deviceMappingData.oltStatus}
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="w-28 h-28 rounded-2xl border-4 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                              <p className="text-xs text-gray-400 text-center">No OLT</p>
                            </div>
                          )}
                        </div>

                        {/* CENTER: UPS Node */}
                        <div className="flex flex-col items-center">
                          {deviceMappingData.connectedUPS ? (
                            <>
                              <div className="relative group">
                                <div className={`w-28 h-28 rounded-2xl border-4 shadow-xl flex flex-col items-center justify-center cursor-help transition-transform hover:scale-110 ${
                                  deviceMappingData.upsStatus === 'Down'
                                    ? 'bg-gradient-to-br from-red-400 to-red-600 border-red-700'
                                    : deviceMappingData.upsStatus === 'Up'
                                    ? 'bg-gradient-to-br from-green-400 to-green-600 border-green-700'
                                    : 'bg-gradient-to-br from-gray-400 to-gray-600 border-gray-700'
                                }`}>
                                  <svg className="w-12 h-12 text-white mb-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                  </svg>
                                  <p className="text-xs font-bold text-white">UPS</p>
                                </div>
                                <div className="absolute hidden group-hover:block z-50 top-full mt-2 left-1/2 transform -translate-x-1/2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-2xl">
                                  <p className="font-bold mb-1">{deviceMappingData.upsName}</p>
                                  <p>IP: {deviceMappingData.connectedUPS}</p>
                                  <p className="mt-2">Status: <span className={deviceMappingData.upsStatus === 'Up' ? 'text-green-400' : 'text-red-400'}>{deviceMappingData.upsStatus}</span></p>
                                </div>
                              </div>
                              <div className="mt-3 text-center">
                                <p className="text-xs font-semibold text-gray-700">{deviceMappingData.connectedUPS}</p>
                                <span className={`inline-block mt-1 px-2 py-1 text-xs font-bold rounded ${
                                  deviceMappingData.upsStatus === 'Down' ? 'bg-red-600 text-white' :
                                  deviceMappingData.upsStatus === 'Up' ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                                }`}>
                                  {deviceMappingData.upsStatus}
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="w-28 h-28 rounded-2xl border-4 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                              <p className="text-xs text-gray-400 text-center">No UPS</p>
                            </div>
                          )}
                        </div>

                        {/* RIGHT: Camera */}
                        <div className="flex flex-col items-center">
                          <div className="relative">
                            <div className="w-32 h-32 rounded-3xl border-4 border-indigo-500 shadow-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex flex-col items-center justify-center ring-4 ring-indigo-200 animate-pulse">
                              <svg className="w-14 h-14 text-white mb-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                              </svg>
                              <p className="text-xs font-bold text-white">CAMERA</p>
                              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                                <span className="text-xs font-bold text-gray-900">★</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 text-center">
                            <p className="text-xs font-bold text-gray-900">{deviceMappingData.cameraIP}</p>
                            <span className={`inline-block mt-1 px-3 py-1 text-xs font-bold rounded-lg shadow ${
                              deviceMappingData.cameraStatus === 'Down' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                            }`}>
                              {deviceMappingData.cameraStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Camera Lists */}
                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* UPS Cameras */}
                      {deviceMappingData.connectedUPS && deviceMappingData.allCamerasOnUPS && deviceMappingData.allCamerasOnUPS.length > 0 && (
                        <div className="bg-white rounded-lg p-4 shadow border border-blue-200">
                          <h5 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            Cameras on UPS {deviceMappingData.connectedUPS}
                          </h5>
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {deviceMappingData.allCamerasOnUPS.map((camera: any, idx: number) => (
                              <div key={idx} className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                                camera.isSelected
                                  ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                                  : camera.status === 'Down'
                                  ? 'bg-red-50 border-red-200 hover:bg-red-100'
                                  : 'bg-green-50 border-green-200 hover:bg-green-100'
                              }`}>
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div className={`w-2 h-2 rounded-full ${camera.isSelected ? 'bg-indigo-500' : 'bg-blue-500'} flex-shrink-0`}></div>
                                  <p className="text-xs font-mono text-gray-900 truncate" title={camera.name}>{camera.ip}</p>
                                  {camera.isSelected && <span className="text-xs font-bold text-indigo-600">★</span>}
                                </div>
                                <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded ${
                                  camera.status === 'Down' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                                }`}>
                                  {camera.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* OLT Cameras */}
                      {deviceMappingData.connectedOLT && deviceMappingData.allCamerasOnOLT && deviceMappingData.allCamerasOnOLT.length > 0 && (
                        <div className="bg-white rounded-lg p-4 shadow border border-purple-200">
                          <h5 className="text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                            Cameras on OLT {deviceMappingData.connectedOLT}
                          </h5>
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {deviceMappingData.allCamerasOnOLT.map((camera: any, idx: number) => (
                              <div key={idx} className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                                camera.isSelected
                                  ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                                  : camera.status === 'Down'
                                  ? 'bg-red-50 border-red-200 hover:bg-red-100'
                                  : 'bg-green-50 border-green-200 hover:bg-green-100'
                              }`}>
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div className={`w-2 h-2 rounded-full ${camera.isSelected ? 'bg-indigo-500' : 'bg-purple-500'} flex-shrink-0`}></div>
                                  <p className="text-xs font-mono text-gray-900 truncate" title={camera.name}>{camera.ip}</p>
                                  {camera.isSelected && <span className="text-xs font-bold text-indigo-600">★</span>}
                                </div>
                                <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded ${
                                  camera.status === 'Down' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                                }`}>
                                  {camera.status}
                                </span>
                              </div>
                            ))}
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
                      Reason for Status
                    </h4>
                    <p className="text-xl text-gray-900 font-bold bg-white rounded-lg p-4 border-2 border-yellow-400">{deviceMappingData.reason}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchMap;

