const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

// 🔐 SSH credentials
const SSH_CONFIG = {
  host: '172.30.114.239',
  port: 22,
  username: 'root',
  password: 'M@t61x!@143',
};

// 📄 File path on server
const FILE_PATH = '/opt/gpu_usage.csv';

// Local fallback file path
const LOCAL_FILE_PATH = path.join(process.cwd(), 'public', 'gpu_usage.csv');

/**
 * Get file content from remote server via SSH
 * @returns {Promise<string>} File content as string
 */
async function getDataFromSSH() {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', () => {
      console.log('✅ SSH Connected for GPU data');

      const command = `cat ${FILE_PATH}`;

      conn.exec(command, (err, stream) => {
        if (err) {
          console.error('❌ Exec error:', err);
          conn.end();
          reject(err);
          return;
        }

        let fileContent = '';
        let errorOutput = '';

        stream
          .on('close', (code, signal) => {
            conn.end();
            
            if (code !== 0) {
              reject(new Error(`Command failed with code ${code}. Error: ${errorOutput}`));
            } else {
              console.log('📄 GPU data retrieved from SSH');
              resolve(fileContent);
            }
          })
          .on('data', (data) => {
            fileContent += data.toString();
          })
          .stderr.on('data', (data) => {
            errorOutput += data.toString();
          });
      });
    });

    conn.on('error', (err) => {
      console.error('❌ SSH Error:', err.message);
      reject(err);
    });

    conn.connect(SSH_CONFIG);
  });
}

/**
 * Get file content from local file (fallback)
 * @returns {Promise<string>} File content as string
 */
async function getDataFromLocal() {
  return new Promise((resolve, reject) => {
    try {
      if (fs.existsSync(LOCAL_FILE_PATH)) {
        const content = fs.readFileSync(LOCAL_FILE_PATH, 'utf-8');
        console.log('📄 GPU data loaded from local file');
        resolve(content);
      } else {
        reject(new Error('Local file not found'));
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Vercel serverless function handler
 */
export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try SSH first, fallback to local file
    let csvData;
    try {
      csvData = await getDataFromSSH();
    } catch (sshError) {
      console.warn('SSH failed, trying local file:', sshError.message);
      csvData = await getDataFromLocal();
    }

    res.setHeader('Content-Type', 'text/csv');
    res.status(200).send(csvData);
  } catch (error) {
    console.error('Error fetching GPU data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch GPU data',
      message: error.message 
    });
  }
}

