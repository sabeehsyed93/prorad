#!/usr/bin/env node

/**
 * Direct startup script for the FastAPI application
 * This script starts both the Node.js proxy server and the FastAPI backend
 * without relying on environment variables for port configuration
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn } = require('child_process');
const fs = require('fs');

// Hardcoded ports - NEVER use environment variables for these
const PORT = 3000;
const FASTAPI_PORT = 8000;

// Log all environment variables for debugging
console.log('Environment variables:');
console.log(`Original PORT=${process.env.PORT}`);
console.log(`Original FASTAPI_PORT=${process.env.FASTAPI_PORT}`);

// Log our hardcoded ports
console.log(`Starting direct_start.js with hardcoded ports: NODE=${PORT}, FASTAPI=${FASTAPI_PORT}`);

// Create Express server
const app = express();

// Add health check endpoint
app.get('/_health', (req, res) => {
  console.log('Health check received');
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.status(200).send('API is running. Use /process endpoint for API calls.');
});

// Start FastAPI directly
function startFastAPI() {
  console.log('Starting FastAPI directly from direct_start.js');
  
  // Determine which Python executable to use
  let pythonCmd = '/app/venv/bin/python';
  if (!fs.existsSync(pythonCmd)) {
    pythonCmd = 'python3';
    console.log('Virtual environment not found, using system Python');
  } else {
    console.log('Using virtual environment Python');
  }
  
  // Direct Python command to start uvicorn with hardcoded port
  const pythonCode = `#!/usr/bin/env python3
import sys
import os
print("Python version:", sys.version)
print("Python path:", sys.executable)
print("Current directory:", os.getcwd())
print("Starting uvicorn directly...")

try:
    import uvicorn
    print("Uvicorn imported successfully")
    print("Starting uvicorn with host=0.0.0.0, port=8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
except Exception as e:
    print(f"Error starting uvicorn: {e}")
    sys.exit(1)
  `;
  
  // Write the Python code to a file
  fs.writeFileSync('./direct_start.py', pythonCode);
  console.log('Created direct_start.py script');
  
  // Start the Python process
  const fastapi = spawn(pythonCmd, ['./direct_start.py'], {
    stdio: 'inherit' // Show Python output in Node.js logs
  });
  
  fastapi.on('error', (err) => {
    console.error(`Failed to start Python: ${err.message}`);
  });
  
  fastapi.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
  });
}

// Start FastAPI
startFastAPI();

// Set up proxy to FastAPI
app.use('/api', createProxyMiddleware({
  target: `http://localhost:${FASTAPI_PORT}`,
  changeOrigin: true,
  pathRewrite: {
    '^/api': ''
  }
}));

// Start Express server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Node.js server listening on port ${PORT}`);
  console.log(`Proxying API requests to FastAPI on port ${FASTAPI_PORT}`);
});
