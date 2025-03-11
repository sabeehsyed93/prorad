#!/bin/bash

echo "=== Radiology Transcription App Status ==="

# Check if backend is running
BACKEND_PID=$(lsof -ti:8000)
if [ ! -z "$BACKEND_PID" ]; then
    echo "✅ Backend is running (PID: $BACKEND_PID)"
    echo "   Backend URL: http://localhost:8000"
    
    # Check if backend is responding
    BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000)
    if [ "$BACKEND_RESPONSE" = "200" ]; then
        echo "   Backend is responding with HTTP 200"
    else
        echo "   ⚠️ Backend is not responding correctly (HTTP $BACKEND_RESPONSE)"
    fi
else
    echo "❌ Backend is not running"
fi

# Check if frontend is running
FRONTEND_PID=$(lsof -ti:3000)
if [ ! -z "$FRONTEND_PID" ]; then
    echo "✅ Frontend is running (PID: $FRONTEND_PID)"
    echo "   Frontend URL: http://localhost:3000"
    
    # Check if frontend is responding
    FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
    if [ "$FRONTEND_RESPONSE" = "200" ]; then
        echo "   Frontend is responding with HTTP 200"
    else
        echo "   ⚠️ Frontend is not responding correctly (HTTP $FRONTEND_RESPONSE)"
    fi
else
    echo "❌ Frontend is not running"
fi

# Check for recent errors in logs
echo ""
echo "=== Recent Backend Errors ==="
if [ -f "$(dirname "$0")/backend.log" ]; then
    grep -i "error\|exception\|fail" "$(dirname "$0")/backend.log" | tail -5
else
    echo "No backend log file found"
fi

echo ""
echo "=== Recent Frontend Errors ==="
if [ -f "$(dirname "$0")/frontend.log" ]; then
    grep -i "error\|exception\|fail" "$(dirname "$0")/frontend.log" | tail -5
else
    echo "No frontend log file found"
fi
