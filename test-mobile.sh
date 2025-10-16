#!/bin/bash

echo "🚀 Starting Mobile Testing Setup..."

# Start Next.js development server in background
echo "Starting Next.js development server..."
npm run dev &
NEXTJS_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

# Start ngrok tunnel
echo "Starting ngrok tunnel..."
ngrok http 3000 &
NGROK_PID=$!

echo ""
echo "========================================"
echo "🚀 Mobile Testing Setup Complete!"
echo "========================================"
echo ""
echo "1. Next.js server: http://localhost:3000"
echo "2. Ngrok tunnel: Check the ngrok window for public URL"
echo "3. Use the ngrok URL on your phone to test responsive design"
echo ""
echo "📱 Open the ngrok URL on your phone browser"
echo "💻 Use Chrome DevTools to simulate mobile devices"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop
wait
