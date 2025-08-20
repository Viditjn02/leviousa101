#!/bin/bash

echo "🎯 GRANULAR PERMISSIONS SOLUTION FOUND!"
echo "======================================"
echo ""
echo "Based on Google's official documentation, here are your options:"
echo ""

echo "📖 KEY INSIGHT from Google docs:"
echo "OAuth clients created BEFORE 2019 need manual granular permission enabling"
echo "OAuth clients created AFTER 2019 have granular permissions enabled by default"
echo ""

echo "🔍 YOUR OAUTH CLIENT STATUS:"
echo "Client: Leviousa MCP"
echo "Created: 24 July 2025 (from screenshot)"
echo "Status: Should have granular permissions enabled by default"
echo ""

echo "🚀 SOLUTION OPTIONS:"
echo ""

echo "OPTION 1: CREATE NEW OAUTH CLIENT (RECOMMENDED)"
echo "✓ New clients automatically have granular permissions enabled"
echo "✓ This will resolve both warnings immediately"
echo ""

echo "OPTION 2: ENABLE GRANULAR CONSENT PARAMETER"
echo "✓ Add 'enable_granular_consent=true' to authorization requests"
echo "✓ This is for older clients or manual control"
echo ""

echo "OPTION 3: CHECK CURRENT CLIENT SETTINGS"
echo "✓ Verify if granular permissions are already enabled"
echo "✓ Look for consent screen configuration options"
echo ""

echo "🔧 IMMEDIATE ACTION - Create New OAuth Client:"
echo "1. Go back to Credentials page"
echo "2. Click 'CREATE CREDENTIALS' > 'OAuth 2.0 Client IDs'"  
echo "3. Select 'Web application'"
echo "4. Name: 'Leviousa OAuth Client 2025'"
echo "5. Add redirect URIs:"
echo "   - https://leviousa-101.web.app/oauth/callback"
echo "   - http://localhost:3000/oauth/callback" 
echo "   - http://localhost:9001/oauth/callback"
echo "6. Save - this will have granular permissions enabled by default"
echo ""

echo "💡 WHY THIS WORKS:"
echo "From Google docs: 'granular permission is always enabled for new Web, Android, or iOS Google OAuth 2.0 client IDs'"
echo ""

# Open the credentials page to create new client
echo "🔗 Opening credentials page to create new OAuth client..."
open "https://console.cloud.google.com/apis/credentials?project=leviousa-101"

echo ""
echo "✅ EXPECTED RESULT:"
echo "New OAuth client → No warnings → OAuth consent screen accessible!"
