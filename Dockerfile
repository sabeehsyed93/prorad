FROM node:18-slim

WORKDIR /app

# Install Python, pip, and other dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    curl \
    procps \
    net-tools \
    && rm -rf /var/lib/apt/lists/*

# Create a Python virtual environment
RUN python3 -m venv /app/venv

# Make sure we use the virtualenv
ENV PATH="/app/venv/bin:$PATH"
ENV VIRTUAL_ENV="/app/venv"

# Copy package.json and install Node.js dependencies
COPY package.json ./
RUN npm install

# Copy Python requirements and install Python dependencies
COPY requirements.txt ./

# Install Python dependencies in the virtual environment
RUN /app/venv/bin/pip install --upgrade pip && \
    /app/venv/bin/pip install --no-cache-dir -r requirements.txt && \
    /app/venv/bin/pip install --no-cache-dir uvicorn fastapi

# Verify uvicorn is installed and in PATH
RUN /app/venv/bin/uvicorn --version && \
    /app/venv/bin/pip list | grep uvicorn && \
    /app/venv/bin/pip list | grep fastapi

# Copy application code
COPY . .

# Ensure our Python startup scripts are executable
COPY start_uvicorn.py /app/start_uvicorn.py
RUN chmod +x /app/start_uvicorn.py

# Create a simple startup script that directly runs our Node.js direct_start.js
RUN echo '#!/bin/bash' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'echo "Starting application with direct_start.js..."' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Print environment variables for debugging' >> /app/start.sh && \
    echo 'echo "Environment variables:"' >> /app/start.sh && \
    echo 'echo "Original PORT=$PORT"' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Ensure virtual environment is activated' >> /app/start.sh && \
    echo 'if [ -d "/app/venv" ]; then' >> /app/start.sh && \
    echo '  echo "Activating Python virtual environment"' >> /app/start.sh && \
    echo '  export PATH="/app/venv/bin:$PATH"' >> /app/start.sh && \
    echo '  export VIRTUAL_ENV="/app/venv"' >> /app/start.sh && \
    echo '  echo "Python version: $(/app/venv/bin/python --version)"' >> /app/start.sh && \
    echo 'else' >> /app/start.sh && \
    echo '  echo "Virtual environment not found, using system Python"' >> /app/start.sh && \
    echo '  echo "Python version: $(python3 --version)"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Make direct_start.js executable' >> /app/start.sh && \
    echo 'chmod +x /app/direct_start.js' >> /app/start.sh && \
    echo 'chmod +x /app/start_uvicorn.py' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start the application using our direct starter script' >> /app/start.sh && \
    echo 'echo "Starting direct_start.js..."' >> /app/start.sh && \
    echo 'exec node /app/direct_start.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Make sure the healthcheck script is executable
COPY healthcheck.js /app/healthcheck.js
RUN chmod +x /app/healthcheck.js

# Add Docker healthcheck
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 CMD node /app/healthcheck.js

# Expose port for the application
EXPOSE 3000

# Set environment variables - avoid using PORT as it might be overridden by Railway
ENV NODE_PORT=3000
ENV FASTAPI_PORT=8000
ENV PYTHONUNBUFFERED=1
# Unset PORT to avoid conflicts
ENV PORT=""

# Command to run the application
CMD ["/app/start.sh"]
