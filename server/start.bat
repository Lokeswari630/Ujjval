@echo off
echo Starting Smart Hospital Assistant Backend Server...
echo.

REM Check if MongoDB is running (optional)
echo Checking MongoDB connection...
timeout /t 2 >nul

REM Start the server
echo Starting server on port 5000...
node server.js

pause
