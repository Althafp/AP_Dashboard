import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SSH credentials
const SSH_CONFIG = {
  host: '172.30.114.239',
  port: 22,
  username: 'root',
  password: 'M@t61x!@143',
};

// Host configuration for live utilization
// District to hosts mapping
const DISTRICT_HOSTS = {
  guntur: [
    '172.30.49.181',
    '172.30.49.182',
    '172.30.49.183',
    '172.30.49.184',
    '172.30.49.185'
  ],
  krishna: [
    '172.30.114.238',
    '172.30.114.239',
    '172.30.114.240',
    '172.30.114.241',
    '172.30.114.242',
    '172.30.114.243',
    '172.30.114.244',
    '172.30.114.245',
    '172.30.114.246',
    '172.30.114.247',
    '172.30.114.248',
    '172.30.114.249',
    '172.30.114.250',
    '172.30.114.251',
    '172.30.114.252'
  ]
};

// All hosts combined
const ALL_HOSTS = [...DISTRICT_HOSTS.guntur, ...DISTRICT_HOSTS.krishna];

// SSH config for Live Utilization hosts (GPU servers with nvidia-smi)
const HOST_SSH_CONFIG = {
  port: 22,
  username: 'root',
  password: 'M@t61x!@143',
};

// SSH config for LPU hosts (CPU Utilization page - different password)
const LPU_SSH_CONFIG = {
  port: 22,
  username: 'root',
  password: 'root',
};

// SSH config for GPU stats server (Server Utilization page)
const GPU_STATS_SSH_CONFIG = {
  host: '172.30.51.72',
  port: 22,
  username: 'root',
  password: 'M@t61x!@143', // Will be set by user
};

const GPU_FILE_PATH = '/opt/gpu_usage.csv';
const CPU_FILE_PATH = '/opt/cpu_usage.csv';
const GPU_LOCAL_FILE_PATH = path.join(__dirname, 'public', 'gpu_usage.csv');
const CPU_LOCAL_FILE_PATH = path.join(__dirname, 'public', 'cpu_usage.csv');
// LPU district mapping Excel (single sheet)
const TMS_EXCEL_FILE = path.join(__dirname, 'public', 'LPU_district.xlsx');

function getDataFromSSH(filePath) {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', () => {
      const command = `cat ${filePath}`;
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          reject(err);
          return;
        }

        let fileContent = '';
        let errorOutput = '';
        let dataChunks = 0;

        stream
          .on('close', (code) => {
            conn.end();
            console.log(`[SSH] File read complete. Size: ${fileContent.length} bytes, Chunks: ${dataChunks}, Exit code: ${code}`);
            if (code !== 0) {
              reject(new Error(`Command failed: ${errorOutput}`));
            } else {
              // Verify we got the full file by checking last line
              const lines = fileContent.split('\n');
              const lastLine = lines[lines.length - 1] || lines[lines.length - 2];
              console.log(`[SSH] Total lines: ${lines.length}, Last line: ${lastLine?.substring(0, 50)}...`);
              resolve(fileContent);
            }
          })
          .on('data', (data) => {
            dataChunks++;
            fileContent += data.toString();
          })
          .stderr.on('data', (data) => {
            errorOutput += data.toString();
          });
      });
    });

    conn.on('error', (err) => {
      reject(err);
    });

    conn.connect(SSH_CONFIG);
  });
}

// Execute command on a specific host (uses HOST_SSH_CONFIG for Live Utilization)
function executeCommandOnHost(host, command) {
  return executeCommandOnHostWithConfig(host, command, HOST_SSH_CONFIG);
}

// Execute command on a specific host with custom SSH config
function executeCommandOnHostWithConfig(host, command, sshConfig) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const config = { ...sshConfig, host };

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        let stdout = '';
        let stderr = '';

        stream
          .on('close', (code) => {
            conn.end();
            if (code !== 0) {
              console.log(`[${host}] Command exit code: ${code}, stderr: ${stderr}`);
              reject(new Error(`Command failed with code ${code}: ${stderr}`));
            } else {
              resolve(stdout.trim());
            }
          })
          .on('data', (data) => {
            stdout += data.toString();
          })
          .stderr.on('data', (data) => {
            stderr += data.toString();
          });
      });
    });

    conn.on('error', (err) => {
      console.log(`[${host}] SSH connection error: ${err.message}`);
      reject(new Error(`SSH connection error: ${err.message}`));
    });

    conn.connect(config);
  });
}

// Get GPU metrics from a host
async function getGpuMetrics(host) {
  try {
    const command = `nvidia-smi --query-gpu=index,name,utilization.gpu,utilization.memory,memory.used,memory.total,temperature.gpu --format=csv,noheader,nounits`;
    const output = await executeCommandOnHost(host, command);
    
    const gpus = [];
    const lines = output.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const parts = line.split(', ').map(p => p.trim());
      if (parts.length >= 7) {
        gpus.push({
          index: parseInt(parts[0]) || 0,
          name: parts[1] || 'Unknown',
          gpuUtilization: parseFloat(parts[2]) || 0,
          memoryUtilization: parseFloat(parts[3]) || 0,
          memoryUsed: parseFloat(parts[4]) || 0,
          memoryTotal: parseFloat(parts[5]) || 0,
          temperature: parseFloat(parts[6]) || 0
        });
      }
    }
    
    return gpus;
  } catch (err) {
    console.warn(`⚠️ Failed to get GPU metrics from ${host}:`, err.message);
    return [];
  }
}

// Get CPU and Memory metrics from a host (for Live Utilization GPU servers)
async function getCpuMemoryMetrics(host) {
  console.log(`\n[${host}] Starting metrics collection...`);
  try {
    const cpuCommand = `vmstat 1 2 | tail -1 | awk '{print 100 - $15}'`;
    const cpuCommandAlt = `grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$3+$4+$5)} END {print usage}'`;
    const memCommand = `free -m | awk 'NR==2{print $2","$3","$4","$7}'`;
    
    let cpuUtil = '0';
    console.log(`[${host}] Executing CPU command: ${cpuCommand}`);
    try {
      cpuUtil = await executeCommandOnHost(host, cpuCommand);
      console.log(`[${host}] ✅ CPU output: "${cpuUtil}"`);
    } catch (err1) {
      console.log(`[${host}] ⚠️ Primary CPU command failed: ${err1.message}`);
      console.log(`[${host}] Trying alternative CPU command: ${cpuCommandAlt}`);
      try {
        cpuUtil = await executeCommandOnHost(host, cpuCommandAlt);
        console.log(`[${host}] ✅ CPU output (alt): "${cpuUtil}"`);
      } catch (err2) {
        console.log(`[${host}] ❌ Both CPU commands failed, using 0`);
        cpuUtil = '0';
      }
    }
    
    console.log(`[${host}] Executing Memory command: ${memCommand}`);
    const memDetails = await executeCommandOnHost(host, memCommand).catch((err) => {
      console.log(`[${host}] ⚠️ Memory command failed: ${err.message}, using 0,0,0,0`);
      return '0,0,0,0';
    });
    console.log(`[${host}] ✅ Memory output: "${memDetails}"`);
    
    const memParts = memDetails.split(',');
    
    const memoryTotal = parseFloat(memParts[0]) || 0;
    const memoryUsed = parseFloat(memParts[1]) || 0;
    const memoryUtilization = memoryTotal > 0 ? (memoryUsed / memoryTotal) * 100 : 0;
    
    const result = {
      cpuUtilization: parseFloat(cpuUtil) || 0,
      memoryUtilization: memoryUtilization,
      memoryTotal: memoryTotal,
      memoryUsed: memoryUsed,
      memoryFree: parseFloat(memParts[2]) || 0,
      memoryAvailable: parseFloat(memParts[3]) || 0
    };
    
    console.log(`[${host}] 📊 Final metrics:`, JSON.stringify(result));
    return result;
  } catch (err) {
    console.error(`[${host}] ❌ Failed to get CPU/Memory metrics:`, err.message);
    return {
      cpuUtilization: 0,
      memoryUtilization: 0,
      memoryTotal: 0,
      memoryUsed: 0,
      memoryFree: 0,
      memoryAvailable: 0
    };
  }
}

// Get CPU and Memory metrics from LPU host (for CPU Utilization page)
async function getCpuMemoryMetricsFromLPU(host) {
  console.log(`\n[LPU ${host}] Starting metrics collection...`);
  try {
    const cpuCommand = `vmstat 1 2 | tail -1 | awk '{print 100 - $15}'`;
    const cpuCommandAlt = `grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$3+$4+$5)} END {print usage}'`;
    const memCommand = `free -m | awk 'NR==2{print $2","$3","$4","$7}'`;
    
    let cpuUtil = '0';
    console.log(`[LPU ${host}] Executing CPU command: ${cpuCommand}`);
    try {
      cpuUtil = await executeCommandOnHostWithConfig(host, cpuCommand, LPU_SSH_CONFIG);
      console.log(`[LPU ${host}] ✅ CPU output: "${cpuUtil}"`);
    } catch (err1) {
      console.log(`[LPU ${host}] ⚠️ Primary CPU command failed: ${err1.message}`);
      console.log(`[LPU ${host}] Trying alternative CPU command: ${cpuCommandAlt}`);
      try {
        cpuUtil = await executeCommandOnHostWithConfig(host, cpuCommandAlt, LPU_SSH_CONFIG);
        console.log(`[LPU ${host}] ✅ CPU output (alt): "${cpuUtil}"`);
      } catch (err2) {
        console.log(`[LPU ${host}] ❌ Both CPU commands failed, using 0`);
        cpuUtil = '0';
      }
    }
    
    console.log(`[LPU ${host}] Executing Memory command: ${memCommand}`);
    const memDetails = await executeCommandOnHostWithConfig(host, memCommand, LPU_SSH_CONFIG).catch((err) => {
      console.log(`[LPU ${host}] ⚠️ Memory command failed: ${err.message}, using 0,0,0,0`);
      return '0,0,0,0';
    });
    console.log(`[LPU ${host}] ✅ Memory output: "${memDetails}"`);
    
    const memParts = memDetails.split(',');
    
    const memoryTotal = parseFloat(memParts[0]) || 0;
    const memoryUsed = parseFloat(memParts[1]) || 0;
    const memoryUtilization = memoryTotal > 0 ? (memoryUsed / memoryTotal) * 100 : 0;
    
    const result = {
      cpuUtilization: parseFloat(cpuUtil) || 0,
      memoryUtilization: memoryUtilization,
      memoryTotal: memoryTotal,
      memoryUsed: memoryUsed,
      memoryFree: parseFloat(memParts[2]) || 0,
      memoryAvailable: parseFloat(memParts[3]) || 0
    };
    
    console.log(`[LPU ${host}] 📊 Final metrics:`, JSON.stringify(result));
    return result;
  } catch (err) {
    console.error(`[LPU ${host}] ❌ Failed to get CPU/Memory metrics:`, err.message);
    return {
      cpuUtilization: 0,
      memoryUtilization: 0,
      memoryTotal: 0,
      memoryUsed: 0,
      memoryFree: 0,
      memoryAvailable: 0
    };
  }
}

// Get CPU utilization from `top` command on a host
async function getCpuFromTop(host) {
  try {
    // Run top in batch mode once and grab the Cpu(s) line
    const command = `top -b -n1 | grep "Cpu(s)" || top -b -n1 | head -n 5`;
    const output = await executeCommandOnHost(host, command);

    let cpuUtil = 0;

    // Try to parse "xx.x%id" (idle) and convert to utilization
    const idleMatch = output.match(/(\d+(\.\d+)?)\s*%id/);
    if (idleMatch) {
      const idle = parseFloat(idleMatch[1]) || 0;
      cpuUtil = Math.max(0, Math.min(100, 100 - idle));
    } else {
      // Fallback: sum of user + system if available
      const userMatch = output.match(/(\d+(\.\d+)?)\s*%us/);
      const sysMatch = output.match(/(\d+(\.\d+)?)\s*%sy/);
      const user = userMatch ? parseFloat(userMatch[1]) || 0 : 0;
      const sys = sysMatch ? parseFloat(sysMatch[1]) || 0 : 0;
      cpuUtil = Math.max(0, Math.min(100, user + sys));
    }

    return { host, cpuUtilization: cpuUtil };
  } catch (err) {
    console.warn(`⚠️ Failed to get CPU (top) metrics from ${host}:`, err.message);
    return { host, cpuUtilization: 0, error: err.message };
  }
}

// Read LPU hosts from the TMS Excel file for specific districts
function getLpuHostsFromExcel() {
  const result = {
    'guntur': [],
    'krishna-urban': [],
    'krishna-rural': [],
  };

  try {
    if (!fs.existsSync(TMS_EXCEL_FILE)) {
      console.warn(`[CPU-UTIL] TMS Excel file not found at ${TMS_EXCEL_FILE}`);
      return result;
    }

    const workbook = XLSX.readFile(TMS_EXCEL_FILE);
    // New file has a single sheet; use first sheet directly
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    if (!sheet) {
      console.warn('[CPU-UTIL] TMS Updation Status sheet not found in Excel');
      return result;
    }

    const rows = XLSX.utils.sheet_to_json(sheet);

    rows.forEach((row) => {
      const districtRaw =
        row['District'] ||
        row['DISTRICT'] ||
        row['district'] ||
        row['District Name'] ||
        row['districtName'] ||
        '';

      const ipRaw =
        row['LPU IP ADDRESS'] ||
        row['LPU IP Address'] ||
        row['LPU IP ADDR'] || // new sheet header
        row['LPU IP'] ||
        row['LPU_IP'] ||
        row['IP'] ||
        '';

      const district = districtRaw.toString().trim().toUpperCase();
      const ip = ipRaw.toString().trim();

      if (!district || !ip) {
        return;
      }

      let key = null;
      if (district.includes('GUNTUR')) {
        key = 'guntur';
      } else if (district.includes('KRISHNA') && district.includes('URBAN')) {
        key = 'krishna-urban';
      } else if (district.includes('KRISHNA') && district.includes('RURAL')) {
        key = 'krishna-rural';
      }

      if (!key) {
        return;
      }

      if (!result[key].includes(ip)) {
        result[key].push(ip);
      }
    });

    console.log('[CPU-UTIL] LPU hosts from Excel:', {
      guntur: result['guntur'].length,
      'krishna-urban': result['krishna-urban'].length,
      'krishna-rural': result['krishna-rural'].length,
    });
  } catch (err) {
    console.warn('[CPU-UTIL] Failed to read TMS Excel file:', err.message);
  }

  return result;
}

// Get all metrics from a host
async function getHostMetrics(host) {
  try {
    console.log(`📡 Fetching metrics from ${host}...`);
    
    const [gpuMetrics, cpuMemoryMetrics] = await Promise.all([
      getGpuMetrics(host),
      getCpuMemoryMetrics(host)
    ]);
    
    return {
      host,
      timestamp: new Date().toISOString(),
      gpu: gpuMetrics,
      cpu: {
        utilization: cpuMemoryMetrics.cpuUtilization
      },
      memory: {
        utilization: cpuMemoryMetrics.memoryUtilization,
        total: cpuMemoryMetrics.memoryTotal,
        used: cpuMemoryMetrics.memoryUsed,
        free: cpuMemoryMetrics.memoryFree,
        available: cpuMemoryMetrics.memoryAvailable
      }
    };
  } catch (err) {
    console.error(`❌ Error getting metrics from ${host}:`, err.message);
    return {
      host,
      timestamp: new Date().toISOString(),
      error: err.message,
      gpu: [],
      cpu: { utilization: 0 },
      memory: {
        utilization: 0,
        total: 0,
        used: 0,
        free: 0,
        available: 0
      }
    };
  }
}

// Get metrics from all hosts in parallel
async function getAllHostsMetrics(district = 'all') {
  let hostsToQuery = ALL_HOSTS;
  
  if (district === 'guntur') {
    hostsToQuery = DISTRICT_HOSTS.guntur;
  } else if (district === 'krishna') {
    hostsToQuery = DISTRICT_HOSTS.krishna;
  }
  
  console.log(`🚀 Starting parallel fetch from ${hostsToQuery.length} hosts (district: ${district})...\n`);
  
  const promises = hostsToQuery.map(host => getHostMetrics(host));
  const results = await Promise.all(promises);
  
  return {
    timestamp: new Date().toISOString(),
    totalHosts: hostsToQuery.length,
    district: district,
    hosts: results
  };
}

function getDataFromLocal(fileName, isGPU = true) {
  return new Promise((resolve, reject) => {
    try {
      let srcDataPath, publicPath;
      
      if (isGPU) {
        // Prefer src/data/gpu_usage.csv (source of truth) over public/gpu_usage.csv
        srcDataPath = path.join(__dirname, 'src', 'data', 'gpu_usage.csv');
        publicPath = path.join(__dirname, 'public', 'gpu_usage.csv');
      } else {
        // For CPU, check both src/data and public
        srcDataPath = path.join(__dirname, 'src', 'data', fileName);
        publicPath = path.join(__dirname, 'public', fileName);
      }
      
      let filePath;
      if (fs.existsSync(srcDataPath)) {
        filePath = srcDataPath;
        console.log(`[Local] Using src/data path: ${filePath}`);
      } else if (fs.existsSync(publicPath)) {
        filePath = publicPath;
        console.log(`[Local] Using public path: ${filePath}`);
      } else {
        reject(new Error(`Local file not found at ${srcDataPath} or ${publicPath}`));
        return;
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      if (isGPU) {
        const timestampCount = (content.match(/^Timestamp:/gm) || []).length;
        console.log(`[Local] File read. Size: ${content.length} bytes, Lines: ${lines.length}, Timestamps: ${timestampCount}`);
      } else {
        console.log(`[Local] File read. Size: ${content.length} bytes, Lines: ${lines.length}`);
      }
      const lastLine = lines[lines.length - 1] || lines[lines.length - 2];
      console.log(`[Local] Last line: ${lastLine?.substring(0, 50)}...`);
      resolve(content);
    } catch (error) {
      reject(error);
    }
  });
}

export function gpuApiPlugin() {
  return {
    name: 'gpu-api-plugin',
    async configureServer(server) {
      // Health check endpoint
      server.middlewares.use('/health', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString()
        }, null, 2));
      });

      server.middlewares.use('/api/gpu-usage', async (req, res, next) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        try {
          let csvData;
          try {
            csvData = await getDataFromSSH(GPU_FILE_PATH);
            console.log('✅ GPU data fetched from SSH');
          } catch (sshError) {
            console.warn('⚠️ SSH failed, using local file:', sshError.message);
            csvData = await getDataFromLocal('gpu_usage.csv', true);
            console.log('✅ GPU data loaded from local file');
          }

          // Log data size for debugging
          const lines = csvData.split('\n');
          const timestampCount = (csvData.match(/^Timestamp:/gm) || []).length;
          console.log(`[API] Returning CSV: ${csvData.length} bytes, ${lines.length} lines, ${timestampCount} timestamps`);

          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Cache-Control', 'no-cache');
          res.statusCode = 200;
          res.end(csvData);
        } catch (error) {
          console.error('❌ Error fetching GPU data:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error.message }));
        }
      });

      // CPU usage endpoint
      server.middlewares.use('/api/cpu-usage', async (req, res, next) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        try {
          let csvData;
          try {
            csvData = await getDataFromSSH(CPU_FILE_PATH);
            console.log('✅ CPU data fetched from SSH');
          } catch (sshError) {
            console.warn('⚠️ SSH failed, using local file:', sshError.message);
            csvData = await getDataFromLocal('cpu_usage.csv', false);
            console.log('✅ CPU data loaded from local file');
          }

          // Log data size for debugging
          const lines = csvData.split('\n');
          console.log(`[API] Returning CPU CSV: ${csvData.length} bytes, ${lines.length} lines`);

          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Cache-Control', 'no-cache');
          res.statusCode = 200;
          res.end(csvData);
        } catch (error) {
          console.error('❌ Error fetching CPU data:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error.message }));
        }
      });

      // Host utilization endpoint - serves from file, collects only on refresh
      server.middlewares.use('/api/host-utilization', async (req, res, next) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        try {
          const jsonPath = path.join(__dirname, 'public', 'host_utilization.json');
          const urlParams = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`).searchParams;
          const refresh = urlParams.get('refresh') === 'true';
          const district = urlParams.get('district') || 'all';
          
          // If refresh is requested or file doesn't exist, collect new data
          if (refresh || !fs.existsSync(jsonPath)) {
            console.log(`[API] Collecting host utilization data from ${district} district...`);
            const startTime = Date.now();
            
            const metrics = await getAllHostsMetrics(district);
            const endTime = Date.now();
            
            console.log(`[API] Collected data from ${metrics.hosts.length} hosts in ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
            
            // Log summary
            metrics.hosts.forEach(hostData => {
              if (hostData.error) {
                console.log(`❌ ${hostData.host}: Error - ${hostData.error}`);
              } else {
                const gpuCount = hostData.gpu.length;
                const avgGpuUtil = gpuCount > 0 
                  ? (hostData.gpu.reduce((sum, g) => sum + g.gpuUtilization, 0) / gpuCount).toFixed(1)
                  : 0;
                console.log(`✅ ${hostData.host}: ${gpuCount} GPU(s), GPU: ${avgGpuUtil}%, CPU: ${hostData.cpu.utilization.toFixed(1)}%, Memory: ${hostData.memory.utilization.toFixed(1)}%`);
              }
            });

            // Save to file
            const jsonData = JSON.stringify(metrics, null, 2);
            try {
              // Ensure directory exists
              const dir = path.dirname(jsonPath);
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
              fs.writeFileSync(jsonPath, jsonData, 'utf8');
              console.log(`💾 Saved host utilization data to: ${jsonPath}`);
            } catch (saveError) {
              console.warn('⚠️ Failed to save to file:', saveError.message);
            }

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-cache');
            res.statusCode = 200;
            res.end(jsonData);
          } else {
            // Serve from existing file, filter by district if needed
            const jsonData = fs.readFileSync(jsonPath, 'utf-8');
            const data = JSON.parse(jsonData);
            
            // Filter hosts by district if not 'all'
            let filteredData = data;
            if (district !== 'all') {
              const hostsToInclude = district === 'guntur' ? DISTRICT_HOSTS.guntur : DISTRICT_HOSTS.krishna;
              filteredData = {
                ...data,
                hosts: data.hosts.filter((h) => hostsToInclude.includes(h.host)),
                totalHosts: data.hosts.filter((h) => hostsToInclude.includes(h.host)).length,
                district: district
              };
            }
            
            console.log(`[API] Serving cached host utilization data from file: ${filteredData.hosts?.length || 0} hosts (district: ${district})`);
            
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-cache');
            res.statusCode = 200;
            res.end(JSON.stringify(filteredData, null, 2));
          }
        } catch (error) {
          console.error('❌ Error with host utilization:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error.message }));
        }
      });

      // GPU Stats from JSON file on remote server (Server Utilization page)
      // Reads from gpu_stats_andhra.json which contains districts: srikakulam, guntur, kadapa
      server.middlewares.use('/api/gpu-stats', async (req, res, next) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        try {
          const jsonPath = '/opt/gpu_monitor/data/gpu_stats_andhra.json';
          
          console.log(`[GPU-Stats] Connecting to ${GPU_STATS_SSH_CONFIG.host} to read ${jsonPath}...`);
          
          const jsonContent = await new Promise((resolve, reject) => {
            const conn = new Client();
            
            conn.on('ready', () => {
              // Suppress SSH warnings by redirecting stderr, then parse JSON
              const command = `cat ${jsonPath} 2>/dev/null || cat ${jsonPath}`;
              conn.exec(command, (err, stream) => {
                if (err) {
                  conn.end();
                  reject(err);
                  return;
                }

                let fileContent = '';
                let errorOutput = '';

                stream
                  .on('close', (code) => {
                    conn.end();
                    if (code !== 0) {
                      reject(new Error(`Command failed: ${errorOutput}`));
                    } else {
                      try {
                        // Clean up any SSH warning messages that might have been captured
                        // Remove lines that look like SSH warnings before parsing
                        const cleanedContent = fileContent
                          .split('\n')
                          .filter(line => {
                            const trimmed = line.trim();
                            // Filter out SSH warning messages
                            return !trimmed.includes('Permanently added') &&
                                   !trimmed.includes('ECDSA') &&
                                   !trimmed.includes('Warning:') &&
                                   !trimmed.startsWith('Warning');
                          })
                          .join('\n');
                        
                        const jsonData = JSON.parse(cleanedContent);
                        resolve(jsonData);
                      } catch (parseError) {
                        reject(new Error(`Failed to parse JSON: ${parseError.message}`));
                      }
                    }
                  })
                  .on('data', (data) => {
                    fileContent += data.toString();
                  })
                  .stderr.on('data', (data) => {
                    // Ignore SSH warnings in stderr
                    const stderrText = data.toString();
                    if (!stderrText.includes('Permanently added') && 
                        !stderrText.includes('ECDSA') &&
                        !stderrText.includes('Warning:')) {
                      errorOutput += stderrText;
                    }
                  });
              });
            });

            conn.on('error', (err) => {
              console.error(`[GPU-Stats] SSH connection error: ${err.message}`);
              reject(new Error(`SSH connection error: ${err.message}`));
            });

            conn.connect(GPU_STATS_SSH_CONFIG);
          });

          console.log(`[GPU-Stats] ✅ Successfully fetched GPU stats data`);
          
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache');
          res.statusCode = 200;
          res.end(JSON.stringify(jsonContent, null, 2));
        } catch (error) {
          console.error('❌ Error fetching GPU stats:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error.message }));
        }
      });

      // CPU utilization from LPU hosts defined in LPU_district.xlsx
      // This endpoint:
      //  - Reads all three districts (guntur, krishna-urban, krishna-rural)
      //  - Runs `top` once per host to get current CPU snapshot
      //  - Saves a single cpu_utilization.json with all hosts, including district name
      //  - Returns the same JSON payload
      server.middlewares.use('/api/cpu-utilization-hosts', async (req, res, next) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        try {
          const lpuHosts = getLpuHostsFromExcel();
          const districts = ['guntur', 'krishna-urban', 'krishna-rural'];

          // Build host list and map each host to its district
          const hostDistrictMap = {};
          let hostsToQuery = [];
          districts.forEach((d) => {
            (lpuHosts[d] || []).forEach((ip) => {
              if (!hostDistrictMap[ip]) {
                hostDistrictMap[ip] = d;
                hostsToQuery.push(ip);
              }
            });
          });

          if (hostsToQuery.length === 0) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(
              JSON.stringify(
                {
                  timestamp: new Date().toISOString(),
                  totalHosts: 0,
                  hosts: [],
                  districts: {
                    guntur: [],
                    'krishna-urban': [],
                    'krishna-rural': [],
                  },
                  note: 'No hosts found for LPU districts in Excel',
                },
                null,
                2
              )
            );
            return;
          }

          console.log(
            `\n${'='.repeat(80)}\n[CPU-UTIL] Fetching CPU & Memory utilization from ${hostsToQuery.length} LPU hosts across 3 districts...\n${'='.repeat(80)}\n`
          );

          // Get full CPU + Memory metrics for each LPU host (using LPU password)
          const results = await Promise.all(
            hostsToQuery.map(async (host) => {
              try {
                const metrics = await getCpuMemoryMetricsFromLPU(host);
                return {
                  host,
                  cpuUtilization: metrics.cpuUtilization,
                  memoryUtilization: metrics.memoryUtilization,
                  memoryTotal: metrics.memoryTotal,
                  memoryUsed: metrics.memoryUsed,
                  memoryFree: metrics.memoryFree,
                  memoryAvailable: metrics.memoryAvailable,
                };
              } catch (err) {
                console.error(`\n[LPU ${host}] ❌ FAILED to get metrics:`, err.message);
                return {
                  host,
                  cpuUtilization: 0,
                  memoryUtilization: 0,
                  memoryTotal: 0,
                  memoryUsed: 0,
                  memoryFree: 0,
                  memoryAvailable: 0,
                  error: err.message,
                };
              }
            })
          );
          
          console.log(`\n${'='.repeat(80)}\n[CPU-UTIL] ✅ Completed fetching from all ${hostsToQuery.length} hosts\n${'='.repeat(80)}\n`);

          // Attach district name to each host
          const hostsWithDistrict = results.map((h) => ({
            ...h,
            district: hostDistrictMap[h.host] || 'unknown',
          }));

          const payload = {
            timestamp: new Date().toISOString(),
            totalHosts: hostsToQuery.length,
            hosts: hostsWithDistrict,
            districts: {
              guntur: hostsWithDistrict.filter((h) => h.district === 'guntur'),
              'krishna-urban': hostsWithDistrict.filter((h) => h.district === 'krishna-urban'),
              'krishna-rural': hostsWithDistrict.filter((h) => h.district === 'krishna-rural'),
            },
          };

          // Always overwrite CPU utilization snapshot to JSON file for external use
          try {
            const cpuJsonPath = path.join(__dirname, 'public', 'cpu_utilization.json');
            const dir = path.dirname(cpuJsonPath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(cpuJsonPath, JSON.stringify(payload, null, 2), 'utf8');
            console.log(`[CPU-UTIL] Saved utilization snapshot to: ${cpuJsonPath}`);
          } catch (saveErr) {
            console.warn('[CPU-UTIL] Failed to save cpu_utilization.json:', saveErr.message);
          }

          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache');
          res.statusCode = 200;
          res.end(JSON.stringify(payload, null, 2));
        } catch (error) {
          console.error('❌ Error with CPU utilization hosts:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error.message }));
        }
      });

      // OLT Status API Proxy
      // Proxies the external OLT status API to avoid CORS issues
      // GET /api/olt-status?olt_no=172.16.245.199
      server.middlewares.use('/api/olt-status', async (req, res, next) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        try {
          // Parse query parameters
          const url = new URL(req.url, `http://${req.headers.host}`);
          const oltNo = url.searchParams.get('olt_no');

          if (!oltNo) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing olt_no parameter' }));
            return;
          }

          console.log(`[OLT-API] Checking status for OLT: ${oltNo}`);

          // Import node-fetch for server-side fetch
          const fetch = (await import('node-fetch')).default;
          const FormData = (await import('form-data')).default;

          // Create FormData and append olt_no
          const formData = new FormData();
          formData.append('olt_no', oltNo);

          // Make POST request to external OLT API
          const response = await fetch('https://enterprise.apsfl.in/monitor/Ems/managedelementmgr', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              ...formData.getHeaders()
            },
            body: formData
          });

          const data = await response.json();
          console.log(`[OLT-API] Response for ${oltNo}:`, data);

          // Return the API response
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify(data));
        } catch (error) {
          console.error('[OLT-API] Error:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    },
  };
}

