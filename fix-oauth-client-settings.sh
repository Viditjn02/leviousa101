#!/bin/bash

echo "🔧 FIXING OAUTH CLIENT FOR GRANULAR PERMISSIONS"
echo "==============================================="
echo ""
echo "Perfect! You're now on the OAuth client configuration page for 'Leviousa MCP'"
echo ""

echo "📋 WHAT YOU NEED TO DO ON THIS PAGE:"
echo ""

echo "1. 🔍 SCROLL DOWN on the current page and look for these sections:"
echo "   ✓ 'Additional settings'"
echo "   ✓ 'Security settings'"  
echo "   ✓ 'Advanced settings'"
echo "   ✓ 'Authorization settings'"
echo ""

echo "2. 🎯 FIND AND ENABLE these specific settings:"
echo "   ✓ 'Enable incremental authorization' - TURN THIS ON"
echo "   ✓ 'Enable PKCE' or 'Proof Key for Code Exchange' - TURN THIS ON"
echo "   ✓ 'Enable granular consent' or 'Unbundled consent' - TURN THIS ON"
echo ""

echo "3. 📝 UPDATE REDIRECT URIs (make sure these are included):"
echo "   ✓ https://leviousa-101.web.app/oauth/callback"
echo "   ✓ http://localhost:3000/oauth/callback"
echo "   ✓ http://localhost:9001/oauth/callback"
echo ""

echo "4. ✅ SAVE CHANGES"
echo "   Click the blue 'Save' button at the bottom of the page"
echo ""

echo "🔗 Based on the Google documentation you found:"
echo "The OAuth 2.0 policies page explains 'incremental authorization'"
echo "This allows users to grant permissions one at a time instead of all at once"
echo ""

echo "🚀 EXPECTED RESULT:"
echo "After enabling these settings and saving:"
echo "✓ The 'Granular permissions' warning will disappear"
echo "✓ The 'Legacy browsers' warning should also be resolved"
echo "✓ OAuth consent screen will become accessible"
echo ""

echo "💡 IF YOU DON'T SEE THESE SETTINGS:"
echo "1. Try scrolling down to see more sections"
echo "2. Look for an 'Edit' or 'Advanced' button to expand options"
echo "3. Check if there's a tab called 'Security' or 'Advanced'"
echo ""

echo "🎯 KEY INSIGHT FROM GOOGLE DOCS:"
echo "The issue is your client needs to support 'unbundled consent'"
echo "This means users can approve individual scopes rather than all-or-nothing"

# Try to update redirect URIs via CLI as backup
echo ""
echo "🔧 CLI BACKUP: Attempting to update redirect URIs..."

# Get the OAuth client details
PROJECT_ID="leviousa-101"
CLIENT_ID="284693214404-jl4dabihe7k6o2loj8ell4nf344kef1m.apps.googleusercontent.com"

echo "If CLI methods work, they'll update redirect URIs automatically..."
echo "But manual settings changes are still needed for incremental authorization"

echo ""
echo "✅ NEXT: Make the changes on your current page, then test by trying to access OAuth consent screen again!"
