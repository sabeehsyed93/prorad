FROM node:18-slim

WORKDIR /app

# Install Python, pip, and other dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    curl \
    procps \
    net-tools \
    && rm -rf /var/lib/apt/lists/*

# Create symbolic links for python and pip
RUN ln -sf /usr/bin/python3 /usr/bin/python && \
    ln -sf /usr/bin/pip3 /usr/bin/pip

# Copy package.json and install Node.js dependencies
COPY package.json ./
RUN npm install

# Copy Python requirements and install Python dependencies
COPY requirements.txt ./

# Install Python dependencies with verbose output
RUN pip install --no-cache-dir --verbose -r requirements.txt && \
    pip install --no-cache-dir --verbose uvicorn fastapi

# Verify uvicorn is installed and in PATH
RUN which uvicorn || echo "uvicorn not found in PATH" && \
    python -m pip list | grep uvicorn && \
    python -m pip list | grep fastapi

# Copy application code
COPY . .

# Create a startup script
RUN echo '#!/bin/bash\necho "Starting server..."\nnode server.js' > /app/start.sh && \
    chmod +x /app/start.sh

# Make sure the healthcheck script is executable
COPY healthcheck.js /app/healthcheck.js
RUN chmod +x /app/healthcheck.js

# Add Docker healthcheck
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 CMD node /app/healthcheck.js

# Expose port for the application
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV PYTHONUNBUFFERED=1

# Command to run the application
CMD ["/app/start.sh"]
