#!/usr/bin/env python3
"""
Simple script to start uvicorn with hardcoded settings.
This avoids any issues with environment variables and shell escaping.
"""

import os
import sys
import logging
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Start the uvicorn server with hardcoded settings."""
    logger.info("Starting uvicorn server...")
    logger.info(f"Current working directory: {os.getcwd()}")
    logger.info(f"Python version: {sys.version}")
    logger.info(f"Python executable: {sys.executable}")
    
    # List all files in current directory for debugging
    logger.info("Files in current directory:")
    for file in os.listdir('.'):
        logger.info(f"  - {file}")
    
    # Hardcoded settings
    host = "0.0.0.0"
    port = 8000
    
    logger.info(f"Starting uvicorn with host={host}, port={port}")
    
    try:
        uvicorn.run("main:app", host=host, port=port, log_level="info")
    except Exception as e:
        logger.error(f"Error starting uvicorn: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
