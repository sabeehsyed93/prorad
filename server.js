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
  
  // Try different commands to start uvicorn, prioritizing the virtual environment
  const commands = [];
  
  // If virtual environment exists, try those commands first
  if (venvExists) {
    commands.push(
      { cmd: '/app/venv/bin/uvicorn', args: ['main:app', '--host', '0.0.0.0', '--port', '8000'] },
      { cmd: '/app/venv/bin/python', args: ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8000'] }
    );
  }
  
  // Fallback commands
  commands.push(
    { cmd: 'uvicorn', args: ['main:app', '--host', '0.0.0.0', '--port', '8000'] },
    { cmd: 'python3', args: ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8000'] },
    { cmd: '/usr/local/bin/uvicorn', args: ['main:app', '--host', '0.0.0.0', '--port', '8000'] },
    { cmd: 'python3', args: ['-c', 'import sys; print(sys.path); import uvicorn; uvicorn.run("main:app", host="0.0.0.0", port=8000)'] }
  );
  
  // Try each command until one works
  tryNextCommand(commands, 0);
}

// Function to try each uvicorn command
function tryNextCommand(commands, index) {
  if (index >= commands.length) {
    console.error('All uvicorn start commands failed');
    return;
  }
  
  const { cmd, args } = commands[index];
  console.log(`Attempting to start FastAPI with command: ${cmd} ${args.join(' ')}`);
  
  // Set environment variables for the child process
  const env = { ...process.env };
  
  // If using venv commands, make sure PATH includes the venv bin directory
  if (cmd.includes('/app/venv/bin/')) {
    env.PATH = `/app/venv/bin:${env.PATH || ''}`;
    env.VIRTUAL_ENV = '/app/venv';
  }
  
  const fastapi = require('child_process').spawn(cmd, args, { env });
  
  fastapi.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`FastAPI: ${output}`);
    
    // If we see the server started message, mark FastAPI as running
    if (output.includes('Application startup complete') || output.includes('Uvicorn running')) {
      fastApiRunning = true;
      console.log('FastAPI is now running and ready to accept requests');
    }
  });
  
  fastapi.stderr.on('data', (data) => {
    console.error(`FastAPI error: ${data}`);
  });
  
  fastapi.on('error', (err) => {
    console.error(`Failed to start FastAPI with ${cmd}: ${err.message}`);
    // Try the next command
    tryNextCommand(commands, index + 1);
  });
  
  fastapi.on('close', (code) => {
    fastApiRunning = false;
    console.log(`FastAPI process exited with code ${code}`);
    
    // If it failed immediately, try the next command
    if (code !== 0 && index < commands.length - 1) {
      tryNextCommand(commands, index + 1);
    }
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
