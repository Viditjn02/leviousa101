@echo off
REM Leviousa 101 Authentication Fix Script for Windows
REM This script ensures the authentication system is properly configured

echo === Leviousa 101 Authentication Setup ===
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo Error: This script must be run from the Leviousa101 root directory
    exit /b 1
)

if not exist "leviousa_web" (
    echo Error: leviousa_web directory not found
    exit /b 1
)

echo 1. Rebuilding the web application with new Firebase config...
cd leviousa_web
call npm run build
if %errorlevel% equ 0 (
    echo [SUCCESS] Web application built successfully
) else (
    echo [ERROR] Failed to build web application
    exit /b 1
)
cd ..

echo.
echo 2. Testing Firebase Admin SDK setup...
node scripts\test-firebase-admin.js
if %errorlevel% neq 0 (
    echo [WARNING] Firebase Admin SDK needs configuration
    echo Please follow the instructions above to set up the service account key
)

echo.
echo 3. Important manual steps:
echo Please ensure you have completed these steps in Firebase Console:
echo    - Added authorized domains (localhost, 127.0.0.1, leviousa-101.web.app)
echo    - Enabled Email/Password and Google authentication providers
echo    - Updated OAuth consent screen in Google Cloud Console

echo.
echo 4. Starting the application...
echo Run 'npm start' to launch Leviousa 101
echo.
echo === Setup Complete ===
echo.
echo If authentication still doesn't work:
echo 1. Open the login page in your browser
echo 2. Open Developer Tools (F12)
echo 3. Paste the contents of scripts\debug-firebase-auth.js in the console
echo 4. Check for any errors in the output

pause
