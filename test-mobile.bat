@echo off
echo Starting Next.js development server...
start "Next.js Dev Server" cmd /k "npm run dev"

timeout /t 5 /nobreak > nul

echo Starting ngrok tunnel...
start "Ngrok Tunnel" cmd /k "ngrok http 3000"

echo.
echo ========================================
echo 🚀 Mobile Testing Setup Complete!
echo ========================================
echo.
echo 1. Next.js server: http://localhost:3000
echo 2. Ngrok tunnel: Check the ngrok window for public URL
echo 3. Use the ngrok URL on your phone to test responsive design
echo.
echo 📱 Open the ngrok URL on your phone browser
echo 💻 Use Chrome DevTools to simulate mobile devices
echo.
pause
