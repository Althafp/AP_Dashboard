import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { gpuApiPlugin } from './vite-plugin-gpu-api.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), gpuApiPlugin()],
  server: {
    port: 3000,
    host: '0.0.0.0', // Allow external connections (including ngrok)
    strictPort: false,
    // Allow ngrok and other external hosts
    allowedHosts: [
      '810a7da5b460.ngrok-free.app',
      '.ngrok-free.app',
      '.ngrok.io',
      'localhost',
      '127.0.0.1'
    ],
    proxy: {
      // Other API calls - proxy to external API
      // Note: /api/gpu-usage is handled by the plugin middleware, not proxied
      '/api': {
        target: 'https://172.30.113.15',
        changeOrigin: true,
        secure: false, // Allow self-signed certificates
        timeout: 30000, // 30 second timeout
        rewrite: (path) => {
          // Don't rewrite /api/gpu-usage - let plugin handle it
          if (path === '/api/gpu-usage') {
            return path;
          }
          return path.replace(/^\/api/, '/api/v1');
        },
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Preserve all headers including Authorization and Cookie
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }
            if (req.headers.cookie) {
              proxyReq.setHeader('Cookie', req.headers.cookie);
            }
            // Add required headers for Motadata API
            proxyReq.setHeader('Accept', 'application/json');
            proxyReq.setHeader('Content-Type', 'application/json');
            
            // Log the request for debugging
            console.log(`[Proxy] Forwarding ${req.method} ${req.url} to https://172.30.113.15/api/v1${req.url.replace('/api', '')}`);
          });
          
          proxy.on('error', (err, req, res) => {
            console.error('[Proxy Error]', err.message);
            console.error('[Proxy Error] Request URL:', req.url);
            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'application/json',
              });
              res.end(JSON.stringify({
                error: 'Proxy Error',
                message: err.message,
                details: 'Failed to connect to API server at https://172.30.113.15. Please check network connectivity.'
              }));
            }
          });
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log(`[Proxy] Response ${proxyRes.statusCode} for ${req.method} ${req.url}`);
            if (proxyRes.statusCode >= 500) {
              console.error(`[Proxy] Server error ${proxyRes.statusCode} from API server`);
            }
          });
        },
      }
    }
  },
})

