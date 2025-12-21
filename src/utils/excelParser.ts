import * as XLSX from 'xlsx';

export interface CameraData {
  oldDistrict: string;
  newDistrict: string;
  mandal: string;
  locationName: string;
  latitude: number;
  longitude: number;
  cameraIP: string;
  peOfCame: string;
  typeOfAnalytics: string;
}

export interface DistrictCameraMap {
  [districtName: string]: string[]; // district -> array of camera IPs
}

export interface UPSCameraMapping {
  upsToCameras: { [upsIP: string]: string[] }; // UPS IP -> array of Camera IPs
  cameraToUPS: { [cameraIP: string]: string }; // Camera IP -> UPS IP
}

// District name mapping: GeoJSON dtname -> Excel OLD DISTRICT name
const DISTRICT_NAME_MAPPING: { [key: string]: string } = {
  'Y.S.R': 'KADAPA',
  'YSR': 'KADAPA',
  'KADAPA': 'KADAPA',
  'SRI POTTI SRIRAMULU NELLORE': 'NELLORE',
  'SRI POTTI SRIRAMULU NELL*': 'NELLORE',
  'NELLORE': 'NELLORE',
  'SRIKAKULAM': 'SRIKAKULAM',
  'VIZIANAGARAM': 'VIZIANAGARAM',
  'VISAKHAPATNAM': 'VISAKHAPATNAM',
  'EAST GODAVARI': 'EAST GODAVARI',
  'WEST GODAVARI': 'WEST GODAVARI',
  'KRISHNA': 'KRISHNA URBAN', // May need to handle both URBAN and RURAL
  'KRISHNA URBAN': 'KRISHNA URBAN',
  'KRISHNA RURAL': 'KRISHNA RURAL',
  'GUNTUR': 'GUNTUR',
  'PRAKASAM': 'PRAKASAM',
  'KURNOOL': 'KURNOOL',
  'CHITTOOR': 'CHITTOOR',
  'ANANTAPURAMU': 'ANANTAPURAMU',
  'ANANTAPUR': 'ANANTAPURAMU',
};

// Display name mapping: GeoJSON dtname -> Display name (for UI)
const DISTRICT_DISPLAY_NAMES: { [key: string]: string } = {
  'Y.S.R': 'Kadapa',
  'YSR': 'Kadapa',
  'KADAPA': 'Kadapa',
  'SRI POTTI SRIRAMULU NELLORE': 'Nellore',
  'SRI POTTI SRIRAMULU NELL*': 'Nellore',
  'NELLORE': 'Nellore',
  'SRIKAKULAM': 'Srikakulam',
  'VIZIANAGARAM': 'Vizianagaram',
  'VISAKHAPATNAM': 'Visakhapatnam',
  'EAST GODAVARI': 'East Godavari',
  'WEST GODAVARI': 'West Godavari',
  'KRISHNA': 'Krishna',
  'KRISHNA URBAN': 'Krishna Urban',
  'KRISHNA RURAL': 'Krishna Rural',
  'GUNTUR': 'Guntur',
  'PRAKASAM': 'Prakasam',
  'KURNOOL': 'Kurnool',
  'CHITTOOR': 'Chittoor',
  'ANANTAPURAMU': 'Anantapuramu',
  'ANANTAPUR': 'Anantapuramu',
};

// Normalize district name for lookup (returns Excel OLD DISTRICT name)
export function normalizeDistrictName(geoJsonName: string): string {
  const upperName = geoJsonName.toUpperCase().trim();
  
  // Check direct mapping first
  if (DISTRICT_NAME_MAPPING[upperName]) {
    return DISTRICT_NAME_MAPPING[upperName];
  }
  
  // Try partial matching
  for (const [geoName, excelName] of Object.entries(DISTRICT_NAME_MAPPING)) {
    if (upperName.includes(geoName) || geoName.includes(upperName)) {
      return excelName;
    }
  }
  
  // Return uppercase version as fallback
  return upperName;
}

// Get display name for district (returns user-friendly name)
export function getDistrictDisplayName(geoJsonName: string): string {
  const upperName = geoJsonName.toUpperCase().trim();
  
  // Check direct mapping first
  if (DISTRICT_DISPLAY_NAMES[upperName]) {
    return DISTRICT_DISPLAY_NAMES[upperName];
  }
  
  // Try partial matching
  for (const [geoName, displayName] of Object.entries(DISTRICT_DISPLAY_NAMES)) {
    if (upperName.includes(geoName) || geoName.includes(upperName)) {
      return displayName;
    }
  }
  
  // Return title case version as fallback
  return geoJsonName.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

export async function parseExcelFile(filePath: string): Promise<DistrictCameraMap> {
  try {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);
    
    // Create district -> camera IPs mapping
    const districtMap: DistrictCameraMap = {};
    
    data.forEach((row: any) => {
      // Use OLD DISTRICT column (as requested) - try multiple possible column name variations
      const oldDistrict = (
        row['OLD DISTRICT'] || 
        row['Old District'] || 
        row['oldDistrict'] || 
        row['OLD_DISTRICT'] ||
        row['Old DISTRICT'] ||
        row['OLD DISTRICT'] ||
        // Fallback to NEW DISTRICT if OLD DISTRICT not found
        row['NEW DISTRICT'] || 
        row['New District'] || 
        row['newDistrict'] || 
        row['NEW_DISTRICT'] ||
        row['District'] ||
        row['DISTRICT'] ||
        ''
      ).toString().trim();
      
      const cameraIP = (
        row['CAMERA IP'] || 
        row['Camera IP'] || 
        row['cameraIP'] || 
        row['CAMERA_IP'] ||
        row['Camera IP Address'] ||
        row['IP'] ||
        ''
      ).toString().trim();
      
      if (oldDistrict && cameraIP) {
        // Normalize district name (remove "district" suffix, handle variations)
        // Store in uppercase for consistent lookup
        const normalizedDistrict = oldDistrict
          .replace(/\s+district$/i, '')
          .replace(/\s+District$/i, '')
          .trim()
          .toUpperCase();
        
        if (!districtMap[normalizedDistrict]) {
          districtMap[normalizedDistrict] = [];
        }
        
        if (!districtMap[normalizedDistrict].includes(cameraIP)) {
          districtMap[normalizedDistrict].push(cameraIP);
        }
      }
    });
    
    console.log('Parsed Excel - Districts:', Object.keys(districtMap));
    console.log('District -> Camera IPs mapping:', districtMap);
    
    return districtMap;
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    return {};
  }
}

export async function parseUPSCameraMapping(filePath: string): Promise<UPSCameraMapping> {
  try {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);
    
    // Create UPS -> Cameras and Camera -> UPS mappings
    const upsToCameras: { [upsIP: string]: string[] } = {};
    const cameraToUPS: { [cameraIP: string]: string } = {};
    
    data.forEach((row: any) => {
      // Try multiple possible column name variations
      const cameraIP = (
        row['CAMERA IP'] || 
        row['Camera IP'] || 
        row['cameraIP'] || 
        row['CAMERA_IP'] ||
        row['Camera IP Address'] ||
        row['IP'] ||
        ''
      ).toString().trim();
      
      const upsIP = (
        row['UPs IP'] || 
        row['UPS IP'] || 
        row['upsIP'] || 
        row['UPS_IP'] ||
        row['UPs IP Address'] ||
        row['UPS'] ||
        ''
      ).toString().trim();
      
      if (cameraIP && upsIP) {
        // UPS -> Cameras mapping (one UPS can have multiple cameras)
        if (!upsToCameras[upsIP]) {
          upsToCameras[upsIP] = [];
        }
        if (!upsToCameras[upsIP].includes(cameraIP)) {
          upsToCameras[upsIP].push(cameraIP);
        }
        
        // Camera -> UPS mapping (one camera has one UPS)
        cameraToUPS[cameraIP] = upsIP;
      }
    });
    
    console.log('Parsed UPS-Camera Mapping:', {
      upsCount: Object.keys(upsToCameras).length,
      cameraCount: Object.keys(cameraToUPS).length,
      sample: Object.keys(upsToCameras).slice(0, 3)
    });
    
    return { upsToCameras, cameraToUPS };
  } catch (error) {
    console.error('Error parsing UPS-Camera mapping:', error);
    return { upsToCameras: {}, cameraToUPS: {} };
  }
}

export interface DistrictGPUMap {
  [districtName: string]: string[]; // district -> array of GPU IPs
}

export interface CameraLocation {
  ip: string;
  lat: number;
  lng: number;
  district: string;
  locationName: string;
  mandal: string;
}

export interface OLTCameraMapping {
  cameraToOLT: { [cameraIP: string]: { oltIP: string; ponPort: string } }; // Camera IP -> OLT IP + PON Port
  oltToCameras: { [oltIP: string]: string[] }; // OLT IP -> array of Camera IPs
  allOLTIPs: string[]; // All unique OLT IPs
  districtOLTs: { [districtName: string]: string[] }; // District -> OLT IPs in that district
}

export async function parseCameraLocations(filePath: string = '/Book1.xlsx'): Promise<Record<string, CameraLocation>> {
  try {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);
    
    const locations: Record<string, CameraLocation> = {};
    
    data.forEach((row: any) => {
      const ip = row['CAMERA IP'];
      const lat = parseFloat(row['LATITUDE']);
      const lng = parseFloat(row['LONGITUDE']);
      const newDistrict = row['NEW DISTRICT'] || row['Old DISTRICT'] || 'Unknown';
      const mandal = row['MANDAL'] || '';
      const locationName = row['Location Name'] || '';
      
      if (ip && !isNaN(lat) && !isNaN(lng)) {
        locations[ip] = {
          ip,
          lat,
          lng,
          district: newDistrict,
          mandal,
          locationName
        };
      }
    });
    
    console.log(`[parseCameraLocations] Loaded ${Object.keys(locations).length} camera locations`);
    return locations;
  } catch (error) {
    console.error('Error parsing camera locations:', error);
    return {};
  }
}

export async function parseGPUIPs(filePath: string): Promise<{ allIPs: string[]; districtMap: DistrictGPUMap }> {
  try {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);
    
    // Extract all GPU IPs and group by district
    const gpuIPs: string[] = [];
    const districtMap: DistrictGPUMap = {};
    
    data.forEach((row: any) => {
      // Try multiple possible column name variations for IP
      const ip = (
        row['IP'] || 
        row['ip'] || 
        row['GPU IP'] || 
        row['gpuIP'] || 
        row['GPU_IP'] ||
        row['Gpu IP'] ||
        row['IP Address'] ||
        ''
      ).toString().trim();
      
      // Try multiple possible column name variations for District
      const district = (
        row['District'] || 
        row['district'] || 
        row['DISTRICT'] ||
        row['District Name'] ||
        row['districtName'] ||
        ''
      ).toString().trim();
      
      if (ip) {
        if (!gpuIPs.includes(ip)) {
          gpuIPs.push(ip);
        }
        
        // Group by district
        if (district) {
          // Normalize district name (uppercase, handle variations)
          const normalizedDistrict = district
            .replace(/\s+district$/i, '')
            .replace(/\s+District$/i, '')
            .trim()
            .toUpperCase();
          
          // Handle district name variations
          let mappedDistrict = normalizedDistrict;
          if (normalizedDistrict === 'VIJAYANAGARAM') {
            mappedDistrict = 'VIZIANAGARAM';
          } else if (normalizedDistrict === 'ANANTHAPUR' || normalizedDistrict === 'ANANTHAPURAMU') {
            mappedDistrict = 'ANANTAPURAMU';
          } else if (normalizedDistrict === 'KARNOOL') {
            mappedDistrict = 'KURNOOL';
          }
          
          if (!districtMap[mappedDistrict]) {
            districtMap[mappedDistrict] = [];
          }
          
          if (!districtMap[mappedDistrict].includes(ip)) {
            districtMap[mappedDistrict].push(ip);
          }
        }
      }
    });
    
    console.log('Parsed GPU IPs:', {
      total: gpuIPs.length,
      districts: Object.keys(districtMap),
      districtCounts: Object.fromEntries(
        Object.entries(districtMap).map(([d, ips]) => [d, ips.length])
      ),
      sample: gpuIPs.slice(0, 5)
    });
    
    return { allIPs: gpuIPs, districtMap };
  } catch (error) {
    console.error('Error parsing GPU IPs:', error);
    return { allIPs: [], districtMap: {} };
  }
}

/**
 * Parse OLT IP Excel file - reads ONLY "Sheet1"
 * Format: S.No, District Name, Camera IP, OLT/POP Name, OLT/POP IP, PON Port No
 */
export async function parseOLTMapping(filePath: string): Promise<OLTCameraMapping> {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch OLT mapping file: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    const cameraToOLT: { [cameraIP: string]: { oltIP: string; ponPort: string } } = {};
    const oltToCameras: { [oltIP: string]: string[] } = {};
    const oltIPsSet = new Set<string>();
    const districtOLTsMap: { [districtName: string]: Set<string> } = {};
    
    // Find "Sheet1" (case insensitive)
    const sheet1Name = workbook.SheetNames.find(name => name.toLowerCase() === 'sheet1');
    
    if (!sheet1Name) {
      console.warn('Sheet1 not found in OLT Excel file. Available sheets:', workbook.SheetNames);
      return {
        cameraToOLT: {},
        oltToCameras: {},
        allOLTIPs: [],
        districtOLTs: {}
      };
    }
    
    console.log(`Reading OLT data from sheet: ${sheet1Name}`);
    const worksheet = workbook.Sheets[sheet1Name];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${data.length} rows in ${sheet1Name}`);
    
    data.forEach((row: any, index: number) => {
      // Get values with exact column names from the Excel
      const cameraIP = (row['Camera IP'] || row['CAMERA IP'] || row['camera ip'] || '').toString().trim();
      const oltIP = (row['OLT/POP IP'] || row['OLT IP'] || row['OLT_IP'] || row['Olt IP'] || '').toString().trim();
      const ponPort = (row['PON Port No'] || row['PONPORT NO'] || row['PON_PORT_NO'] || row['Pon Port No'] || '').toString().trim();
      let district = (row['District Name'] || row['DISTRICT'] || row['District'] || row['district'] || '').toString().trim().toUpperCase();
      
      if (!cameraIP || !oltIP) {
        if (index < 5) { // Only log first few to avoid spam
          console.log(`Row ${index + 1}: Skipping - Camera IP: "${cameraIP}", OLT IP: "${oltIP}"`);
        }
        return; // Skip invalid rows
      }
      
      // Normalize district: treat "KRISHNA RURAL" and "KRISHNA URBAN" as "KRISHNA"
      if (district.includes('KRISHNA RURAL') || district.includes('KRISHNA URBAN')) {
        district = 'KRISHNA';
      }
      
      // Map Camera IP to OLT IP + PON Port (last one wins if duplicates)
      cameraToOLT[cameraIP] = { oltIP, ponPort };
      
      // Map OLT IP to Cameras
      if (!oltToCameras[oltIP]) {
        oltToCameras[oltIP] = [];
      }
      if (!oltToCameras[oltIP].includes(cameraIP)) {
        oltToCameras[oltIP].push(cameraIP);
      }
      
      // Track unique OLT IPs
      oltIPsSet.add(oltIP);
      
      // Track OLTs by district
      if (district) {
        if (!districtOLTsMap[district]) {
          districtOLTsMap[district] = new Set<string>();
        }
        districtOLTsMap[district].add(oltIP);
      }
    });
    
    // Convert districtOLTsMap Sets to arrays
    const districtOLTs: { [districtName: string]: string[] } = {};
    Object.entries(districtOLTsMap).forEach(([district, oltSet]) => {
      districtOLTs[district] = Array.from(oltSet);
    });
    
    const result = {
      cameraToOLT,
      oltToCameras,
      allOLTIPs: Array.from(oltIPsSet),
      districtOLTs
    };
    
    console.log('OLT Mapping parsed from Sheet1:', {
      totalOLTs: result.allOLTIPs.length,
      totalCameras: Object.keys(result.cameraToOLT).length,
      districts: Object.keys(result.districtOLTs),
      sampleOLTs: result.allOLTIPs.slice(0, 5),
      sampleCameras: Object.keys(result.cameraToOLT).slice(0, 5),
      districtCounts: Object.entries(result.districtOLTs).map(([d, olts]) => `${d}: ${olts.length} OLTs`)
    });
    
    return result;
  } catch (error) {
    console.error('Error parsing OLT mapping:', error);
    return {
      cameraToOLT: {},
      oltToCameras: {},
      allOLTIPs: [],
      districtOLTs: {}
    };
  }
}

