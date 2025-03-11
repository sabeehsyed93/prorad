#!/bin/bash

# Get the absolute path of the project directory
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_LOG="$PROJECT_DIR/backend.log"
FRONTEND_LOG="$PROJECT_DIR/frontend.log"

echo "=== Restarting Radiology Transcription App ==="
echo "Project directory: $PROJECT_DIR"

# Function to check if a directory exists and contains expected files
check_directory() {
    local dir=$1
    local file=$2
    local name=$3
    
    if [ ! -d "$dir" ]; then
        echo "Error: $name directory not found at $dir"
        return 1
    fi
    
    if [ ! -f "$dir/$file" ]; then
        echo "Error: $file not found in $name directory"
        echo "Contents of $dir:"
        ls -la "$dir"
        return 1
    fi
    
    return 0
}

# Check directories before proceeding
check_directory "$BACKEND_DIR" "main.py" "Backend" || exit 1
check_directory "$FRONTEND_DIR" "package.json" "Frontend" || exit 1

echo "Stopping any running processes..."

# Kill any processes running on port 3000 (frontend)
FRONTEND_PID=$(lsof -ti:3000)
if [ ! -z "$FRONTEND_PID" ]; then
    echo "Killing frontend process (PID: $FRONTEND_PID)"
    kill -9 $FRONTEND_PID
else
    echo "No frontend process found running on port 3000"
fi

# Kill any processes running on port 8000 (backend)
BACKEND_PID=$(lsof -ti:8000)
if [ ! -z "$BACKEND_PID" ]; then
    echo "Killing backend process (PID: $BACKEND_PID)"
    kill -9 $BACKEND_PID
else
    echo "No backend process found running on port 8000"
fi

# Wait a moment to ensure processes are terminated
sleep 2

# Start backend server
echo "Starting backend server..."
cd "$BACKEND_DIR"
source "$PROJECT_DIR/venv/bin/activate"
python3 -m uvicorn main:app --host 0.0.0.0 --reload > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait for backend to initialize
sleep 3

# Start frontend server
echo "Starting frontend server..."
cd "$FRONTEND_DIR"
npm start > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo "=== Restart Complete ==="
echo "Backend log: $BACKEND_LOG"
echo "Frontend log: $FRONTEND_LOG"
echo "Access the application at: http://localhost:3000"

# Wait a moment for services to start
sleep 3

# Check if services are running
BACKEND_RUNNING=$(lsof -ti:8000)
FRONTEND_RUNNING=$(lsof -ti:3000)

if [ ! -z "$BACKEND_RUNNING" ] && [ ! -z "$FRONTEND_RUNNING" ]; then
    echo "✅ Both backend and frontend are running!"
else
    echo "⚠️ Warning: Some services may not have started correctly."
    [ -z "$BACKEND_RUNNING" ] && echo "   - Backend is not running"
    [ -z "$FRONTEND_RUNNING" ] && echo "   - Frontend is not running"
    echo "Check the log files for more information."
fi
