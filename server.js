const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();
const PORT = process.env.PORT || 3000;

// Simple health check endpoint that always returns 200
app.get('/_health', (req, res) => {
  console.log('Health check received');
  res.status(200).json({ status: 'ok' });
});

app.get('/healthz', (req, res) => {
  console.log('Alternative health check received');
  res.status(200).json({ status: 'ok' });
});

// Proxy all other requests to the FastAPI app
const apiProxy = createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true,
  ws: true,
  pathRewrite: {
    '^/api': '', // remove /api prefix when forwarding to FastAPI
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error', message: err.message });
  }
});

// Use the proxy for all routes except health checks
app.use('/api', apiProxy);

// Fallback route for the root path
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Radiology Transcription API Gateway',
    api: '/api',
    health: '/_health',
    status: 'online'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
  console.log(`Health check available at /_health`);
  console.log(`API proxy available at /api/*`);
  
  // Start the FastAPI app in the background
  const { spawn } = require('child_process');
  const fastapi = spawn('uvicorn', ['main:app', '--host', '0.0.0.0', '--port', '8000']);
  
  fastapi.stdout.on('data', (data) => {
    console.log(`FastAPI: ${data}`);
  });
  
  fastapi.stderr.on('data', (data) => {
    console.error(`FastAPI error: ${data}`);
  });
  
  fastapi.on('close', (code) => {
    console.log(`FastAPI process exited with code ${code}`);
  });
});
