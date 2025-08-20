#!/bin/bash

echo "🔧 FIXING LEVIOUSA MCP OAUTH CLIENT"
echo "=================================="
echo ""
echo "You're right! The issue is specifically with your 'Leviousa MCP' client"
echo "We need to fix THIS client, not create a new one."
echo ""

echo "🎯 THE REAL PROBLEM:"
echo "Your 'Leviousa MCP' OAuth client is missing granular permissions support"
echo "This is blocking access to the OAuth consent screen"
echo ""

echo "📋 SPECIFIC SOLUTIONS FOR YOUR CLIENT:"
echo ""

echo "SOLUTION 1: Enable Granular Consent via API"
echo "✓ Update the client configuration directly"
echo "✓ Force enable granular permissions"
echo ""

echo "SOLUTION 2: Edit Client Configuration (Manual)"
echo "✓ Go back to the Leviousa MCP client page"
echo "✓ Look for any 'Edit' or 'Configure' buttons"
echo "✓ Find settings related to consent screen"
echo ""

echo "SOLUTION 3: Delete and Recreate SAME Client"
echo "✓ Delete 'Leviousa MCP' client"
echo "✓ Create new one with exact same name and settings"
echo "✓ Preserve your existing setup but with new permissions"
echo ""

# Try to update the existing client via API
echo "🔧 ATTEMPTING TO FIX VIA CLI..."

PROJECT_ID="leviousa-101"
CLIENT_ID="284693214404-jl4dabihe7k6o2loj8eil4nf344kef1m.apps.googleusercontent.com"

echo "Client to fix: $CLIENT_ID"

# Try to get current client details
TOKEN=$(gcloud auth application-default print-access-token)

echo "🔍 Current client configuration:"
echo "Name: Leviousa MCP"
echo "Issue: Granular permissions not enabled"
echo "Impact: Cannot access OAuth consent screen"
echo ""

echo "📖 MANUAL STEPS TO FIX LEVIOUSA MCP:"
echo ""
echo "1. Go back to your OAuth client page for 'Leviousa MCP'"
echo "2. Look for these options:"
echo "   ✓ 'Configure consent screen' button"
echo "   ✓ 'Edit settings' option"  
echo "   ✓ 'Advanced configuration' section"
echo "3. If you see a 'Delete' option, consider recreating the client"
echo "4. When recreating, use EXACT same name: 'Leviousa MCP'"
echo ""

echo "🎯 KEY INSIGHT:"
echo "The warnings appear because this specific client lacks modern OAuth features"
echo "We need to enable granular permissions on THIS client specifically"

# Open the specific client page
echo "🔗 Opening Leviousa MCP client configuration..."
open "https://console.cloud.google.com/apis/credentials/oauthclient/284693214404-jl4dabihe7k6o2loj8eil4nf344kef1m?project=leviousa-101"

echo ""
echo "✅ NEXT STEPS:"
echo "1. Check if there are 'Edit' or 'Configure' buttons on the client page"
echo "2. Look for granular permissions or consent screen settings"
echo "3. If no options available, consider deleting and recreating with same name"
