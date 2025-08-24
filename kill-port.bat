@echo off
echo Checking for processes using port 5000...
netstat -ano | findstr :5000
if %errorlevel% equ 0 (
    echo Found processes using port 5000. Killing them...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
        echo Killing process %%a
        taskkill /PID %%a /F
    )
    echo Port 5000 is now free.
) else (
    echo No processes found using port 5000.
)
pause