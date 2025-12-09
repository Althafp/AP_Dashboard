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

