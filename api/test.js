// Simple test endpoint to verify Vercel functions are working
export default async function handler(req, res) {
  return res.status(200).json({ 
    message: 'Vercel API function is working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    query: req.query
  });
}


