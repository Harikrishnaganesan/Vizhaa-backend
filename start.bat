@echo off
echo Killing any existing processes on port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    taskkill /PID %%a /F 2>nul
)

echo Starting Vizhaa Backend Server...
npm run dev