#!/bin/bash
# Leviousa 101 Authentication Fix Script
# This script ensures the authentication system is properly configured

echo "=== Leviousa 101 Authentication Setup ==="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "leviousa_web" ]; then
    echo -e "${RED}Error: This script must be run from the Leviousa101 root directory${NC}"
    exit 1
fi

echo "1. Rebuilding the web application with new Firebase config..."
cd leviousa_web
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Web application built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build web application${NC}"
    exit 1
fi
cd ..

echo
echo "2. Testing Firebase Admin SDK setup..."
node scripts/test-firebase-admin.js
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠ Firebase Admin SDK needs configuration${NC}"
    echo "Please follow the instructions above to set up the service account key"
fi

echo
echo "3. Important manual steps:"
echo -e "${YELLOW}Please ensure you have completed these steps in Firebase Console:${NC}"
echo "   - Added authorized domains (localhost, 127.0.0.1, leviousa-101.web.app)"
echo "   - Enabled Email/Password and Google authentication providers"
echo "   - Updated OAuth consent screen in Google Cloud Console"

echo
echo "4. Starting the application..."
echo -e "${GREEN}Run 'npm start' to launch Leviousa 101${NC}"
echo
echo "=== Setup Complete ==="
echo
echo "If authentication still doesn't work:"
echo "1. Open the login page in your browser"
echo "2. Open Developer Tools (F12)"
echo "3. Paste the contents of scripts/debug-firebase-auth.js in the console"
echo "4. Check for any errors in the output"
