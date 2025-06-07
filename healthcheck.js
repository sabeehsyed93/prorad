#!/usr/bin/env node

/**
 * Health check script for Railway deployment
 * 
 * This script makes a request to the health check endpoint and exits with
 * the appropriate status code to indicate success or failure.
 */

const http = require('http');
const https = require('https');

// Configuration - use hardcoded port 3000 to match direct_start.js
const PORT = 3000; // Hardcoded to match our application port
const HOST = process.env.HOST || 'localhost';
const PATH = '/_health';
const MAX_RETRIES = 5; // Increase retries
const RETRY_DELAY = 5000; // Increase delay to 5 seconds

// Function to make the health check request
function makeRequest(retry = 0) {
  console.log(`Health check attempt ${retry + 1}/${MAX_RETRIES}...`);
  
  const options = {
    hostname: HOST,
    port: PORT,
    path: PATH,
    method: 'GET',
    timeout: 5000, // 5 second timeout
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`Health check passed: ${data}`);
        process.exit(0); // Success
      } else {
        console.error(`Health check failed: Status code ${res.statusCode}`);
        retryOrFail(retry);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error(`Health check error: ${error.message}`);
    retryOrFail(retry);
  });
  
  req.on('timeout', () => {
    console.error('Health check timed out');
    req.destroy();
    retryOrFail(retry);
  });
  
  req.end();
}

// Function to retry or exit with failure
function retryOrFail(currentRetry) {
  if (currentRetry < MAX_RETRIES - 1) {
    console.log(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
    setTimeout(() => makeRequest(currentRetry + 1), RETRY_DELAY);
  } else {
    console.error('Health check failed after all retries');
    process.exit(1); // Failure
  }
}

// Start the health check
makeRequest();
