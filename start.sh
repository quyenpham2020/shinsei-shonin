#!/bin/bash

echo "========================================"
echo " Shinsei Shonin - Starting Servers"
echo "========================================"
echo ""

echo "Starting Backend Server..."
cd backend && npm run dev &
BACKEND_PID=$!

sleep 2

echo "Starting Frontend Server..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo " Both servers are running!"
echo "========================================"
echo ""
echo "  Backend:  http://localhost:3001"
echo "  Frontend: http://localhost:3000"
echo ""
echo "  Backend PID:  $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"
echo ""
echo "  Press Ctrl+C to stop both servers"
echo "========================================"

# Wait for both processes
wait
