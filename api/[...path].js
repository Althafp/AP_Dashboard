const https = require('https');

// Target API server
const API_TARGET = 'https://223.196.186.236';
const API_BASE_PATH = '/api/v1';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    return res.status(200).end();
  }

  // Get the path from the request
  const path = req.query.path || [];
  const apiPath = Array.isArray(path) ? path.join('/') : path;
  
  // Get query parameters (excluding 'path')
  const queryParams = { ...req.query };
  delete queryParams.path;
  const queryString = new URLSearchParams(queryParams).toString();
  
  // Construct the full path
  const targetPath = apiPath ? `${API_BASE_PATH}/${apiPath}` : API_BASE_PATH;
  const fullPath = queryString ? `${targetPath}?${queryString}` : targetPath;
  
  // Parse the target URL
  const url = new URL(API_TARGET);
  
  // Prepare request options
  const options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: fullPath,
    method: req.method || 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Host': url.hostname,
    },
    // Bypass SSL certificate validation (like Vite's secure: false)
    rejectUnauthorized: false,
  };
  
  // Forward important headers
  if (req.headers.authorization) {
    options.headers['Authorization'] = req.headers.authorization;
  }
  if (req.headers.cookie) {
    options.headers['Cookie'] = req.headers.cookie;
  }
  if (req.headers['content-type']) {
    options.headers['Content-Type'] = req.headers['content-type'];
  }
  
  return new Promise((resolve, reject) => {
    const proxyReq = https.request(options, (proxyRes) => {
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
      
      // Copy status code
      res.statusCode = proxyRes.statusCode;
      
      // Copy headers (except those that shouldn't be forwarded)
      const headersToSkip = ['connection', 'transfer-encoding', 'content-encoding', 'content-length'];
      Object.keys(proxyRes.headers).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (!headersToSkip.includes(lowerKey)) {
          res.setHeader(key, proxyRes.headers[key]);
        }
      });
      
      // Pipe the response
      proxyRes.pipe(res);
      proxyRes.on('end', () => {
        resolve();
      });
    });
    
    proxyReq.on('error', (error) => {
      console.error('Proxy error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Proxy error', message: error.message });
      }
      reject(error);
    });
    
    // Forward request body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      proxyReq.write(body);
    }
    
    proxyReq.end();
  });
}

