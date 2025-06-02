const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();
const PORT = process.env.PORT || 3000;

// Add middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Simple health check endpoint that always returns 200
// Railway will check this endpoint to determine if the service is healthy
app.get('/_health', (req, res) => {
  console.log('Health check received at /_health');
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Alternative health check endpoints
app.get('/healthz', (req, res) => {
  console.log('Health check received at /healthz');
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  console.log('Health check received at /health');
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback route for the root path - respond before setting up the proxy
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Radiology Transcription API Gateway',
    api: '/api',
    health: '/_health',
    status: 'online',
    version: '1.0.0'
  });
});

// Variable to track if FastAPI is running
let fastApiRunning = false;

// Proxy middleware with conditional forwarding
const apiProxy = createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true,
  ws: true,
  pathRewrite: {
    '^/api': '', // remove /api prefix when forwarding to FastAPI
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying request to FastAPI: ${req.method} ${req.url}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    // If FastAPI is not running yet, return a 503 Service Unavailable
    if (!fastApiRunning) {
      res.status(503).json({ 
        error: 'Service Unavailable', 
        message: 'The API is starting up, please try again in a moment',
        status: 'initializing'
      });
    } else {
      res.status(500).json({ 
        error: 'Proxy error', 
        message: err.message,
        status: 'error'
      });
    }
  }
});

// Use the proxy for API routes
app.use('/api', apiProxy);

// Function to check if Python virtual environment exists
function checkVirtualEnv() {
  return new Promise((resolve, reject) => {
    console.log('Checking Python virtual environment...');
    const { exec } = require('child_process');
    
    // Check if venv directory exists
    exec('[ -d "/app/venv" ] && echo "exists" || echo "not found"', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error checking venv: ${error.message}`);
        resolve(false);
        return;
      }
      
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      
      const exists = stdout.trim() === 'exists';
      console.log(`Python virtual environment ${exists ? 'found' : 'not found'}.`);
      resolve(exists);
    });
  });
}

// Function to install Python dependencies (fallback if needed)
function installPythonDependencies() {
  return new Promise((resolve, reject) => {
    console.log('Installing Python dependencies...');
    const { spawn } = require('child_process');
    
    // Try to use the virtual environment if it exists
    const pipPath = '/app/venv/bin/pip';
    const fs = require('fs');
    
    if (fs.existsSync(pipPath)) {
      console.log('Using virtual environment pip');
      const pip = spawn(pipPath, ['install', '-r', 'requirements.txt']);
      
      pip.stdout.on('data', (data) => {
        console.log(`pip: ${data}`);
      });
      
      pip.stderr.on('data', (data) => {
        console.error(`pip error: ${data}`);
      });
      
      pip.on('close', (code) => {
        if (code === 0) {
          console.log('Python dependencies installed successfully');
          resolve();
        } else {
          console.error(`pip process exited with code ${code}`);
          // Continue anyway to avoid blocking the server
          resolve();
        }
      });
    } else {
      console.log('Virtual environment not found, skipping pip install');
      resolve();
    }
  });
}

// Start the server immediately to respond to health checks
const server = app.listen(PORT, async () => {
  console.log(`Express server running on port ${PORT}`);
  console.log(`Health check available at /_health`);
  console.log(`API proxy available at /api/*`);
  
  try {
    // Check for virtual environment
    const venvExists = await checkVirtualEnv();
    
    // Install Python dependencies if needed
    console.log('Setting up environment...');
    if (venvExists) {
      console.log('Using existing virtual environment');
    } else {
      console.log('Virtual environment not found, will try fallback methods');
    }
    await installPythonDependencies();
    
    // Start the FastAPI app in the background
    console.log('Starting FastAPI with uvicorn...');
    startFastApi(venvExists);
    
  } catch (err) {
    console.error('Error during startup:', err);
  }
});

// Function to start FastAPI
function startFastApi(venvExists) {
  const { spawn } = require('child_process');
  const fs = require('fs');
  
  console.log('Starting FastAPI using Python script...');
  
  // Use our dedicated Python script to start uvicorn
  let pythonCmd, scriptPath;
  
  // Check if our start script exists
  if (fs.existsSync('./start_uvicorn.py')) {
    console.log('Found start_uvicorn.py script');
    scriptPath = './start_uvicorn.py';
  } else {
    console.error('start_uvicorn.py not found!');
    return;
  }
  
  // Determine which Python executable to use
  if (venvExists && fs.existsSync('/app/venv/bin/python')) {
    pythonCmd = '/app/venv/bin/python';
    console.log('Using virtual environment Python');
  } else {
    pythonCmd = 'python3';
    console.log('Using system Python');
  }
  
  // Log the command we're about to run
  console.log(`Running: ${pythonCmd} ${scriptPath}`);
  
  // Start the Python script
  const fastapi = spawn(pythonCmd, [scriptPath], {
    stdio: 'inherit' // This will show Python output directly in the Node.js logs
  });
  
  fastapi.on('error', (err) => {
    console.error(`Failed to start Python script: ${err.message}`);
  });
  
  fastapi.on('close', (code) => {
    fastApiRunning = false;
    console.log(`Python script process exited with code ${code}`);
  });
  
  // Set a timeout to check if FastAPI is running
  setTimeout(() => {
    if (!fastApiRunning) {
      console.log('FastAPI not detected as running after timeout, but continuing anyway');
    }
  }, 5000);
}

// Listen for FastAPI startup in the logs
process.on('log', (data) => {
  if (typeof data === 'string' && 
      (data.includes('Application startup complete') || data.includes('Uvicorn running'))) {
    fastApiRunning = true;
    console.log('FastAPI is now running and ready to accept requests');
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
