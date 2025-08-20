#!/bin/bash

# Fix Granular Permissions OAuth Warning
echo "🔧 FIXING GRANULAR PERMISSIONS WARNING"
echo "======================================"

echo "The issue: Your 'Leviousa MCP' OAuth client doesn't support granular permissions"
echo "Solution: Update the OAuth client to support incremental authorization"
echo ""

echo "📋 MANUAL STEPS (EXACT INSTRUCTIONS):"
echo ""

echo "1. 🔗 On the current page you're viewing, look for:"
echo "   'Granular permissions' section with ⚠️ warning"
echo ""

echo "2. 🎯 Click the 'Learn how to fix it' button"
echo "   (It's in the Data access and user consent section)"
echo ""

echo "3. 📖 This will show you specific steps to:"
echo "   ✓ Enable incremental authorization"
echo "   ✓ Update OAuth client settings"
echo "   ✓ Fix granular permissions"
echo ""

echo "4. 🔧 Alternative: Update OAuth Client directly"
echo "   ✓ Go to: Credentials > Click 'Leviousa MCP'"
echo "   ✓ Look for 'Enable incremental authorization'"
echo "   ✓ Enable this setting"
echo "   ✓ Save changes"
echo ""

echo "5. 🚀 After fixing this, OAuth consent screen should become accessible!"
echo ""

# Try to get OAuth client details
echo "📊 Current OAuth Client Status:"
TOKEN=$(gcloud auth application-default print-access-token)

# Try to get OAuth client info via API
CLIENT_INFO=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://www.googleapis.com/oauth2/v1/client/credentials" 2>/dev/null || echo "API call failed")

echo "🔍 If API access worked, client details would show here"
echo ""

echo "🎯 QUICKEST SOLUTION:"
echo "1. Click 'Learn how to fix it' button on your current page"
echo "2. Follow the specific instructions provided"
echo "3. This will resolve both warnings and unlock consent screen access"

# Open a direct link to the OAuth client edit page
echo ""
echo "🔧 Alternative: Direct OAuth Client Edit"
echo "Opening OAuth client editor..."

# The OAuth client IDs visible in the screenshot
open "https://console.cloud.google.com/apis/credentials/oauthclient/284693214404-114da?project=leviousa-101"

echo "✅ Opened OAuth client editor - look for 'incremental authorization' setting!"
