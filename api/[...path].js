const https = require('https');

// Target API server
const API_TARGET = 'https://223.196.186.236';
const API_BASE_PATH = '/api/v1';

export default async function handler(req, res) {
  // Debug logging
  console.log('Proxy function called:', {
    method: req.method,
    url: req.url,
    query: req.query,
    headers: Object.keys(req.headers)
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    return res.status(200).end();
  }

  // Get the path from the request
  // Vercel passes the path segments as an array in req.query.path
  const pathSegments = req.query.path || [];
  const apiPath = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;
  
  console.log('Path segments:', pathSegments, 'API path:', apiPath);
  
  // Get all query parameters (excluding 'path' which is the route parameter)
  const queryParams = { ...req.query };
  delete queryParams.path;
  
  // Build query string from remaining params
  const queryString = Object.keys(queryParams).length > 0 
    ? '?' + new URLSearchParams(queryParams).toString()
    : '';
  
  // Construct the full path
  // Example: /api/query/objects/status?status=Up
  // apiPath = "query/objects/status"
  // targetPath = "/api/v1/query/objects/status"
  const targetPath = apiPath ? `${API_BASE_PATH}/${apiPath}` : API_BASE_PATH;
  const fullPath = targetPath + queryString;
  
  console.log('Full target path:', fullPath);
  
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
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        hostname: url.hostname,
        path: fullPath
      });
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Proxy error', 
          message: error.message,
          details: {
            target: API_TARGET,
            path: fullPath,
            code: error.code
          }
        });
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

