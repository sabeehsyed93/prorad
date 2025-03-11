#!/bin/bash

# Start the backend
echo "Starting backend server..."
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start the frontend
echo "Starting frontend development server..."
cd ../frontend
npm start &
FRONTEND_PID=$!

# Function to kill processes on exit
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit
}

# Trap Ctrl+C
trap cleanup INT

# Keep script running
echo "Development servers are running. Press Ctrl+C to stop."
wait
