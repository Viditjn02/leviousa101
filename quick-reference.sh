#!/bin/bash

# Quick Reference Guide for Manual OAuth Setup
echo "🚀 LEVIOUSA GOOGLE OAUTH SETUP - QUICK REFERENCE"
echo "=============================================="
echo ""

echo "📋 STEP 1: OAuth Consent Screen"
echo "🔗 Link: https://console.cloud.google.com/apis/credentials/consent?project=leviousa-101"
echo ""
echo "✅ Fill these EXACT values:"
echo "   App name: Leviousa"
echo "   User support email: viditjn02@gmail.com"
echo "   Homepage: https://leviousa-101.web.app"
echo "   Privacy Policy: https://leviousa-101.web.app/privacy-policy.html"
echo "   Terms of Service: https://leviousa-101.web.app/terms-of-service.html"
echo "   Authorized domain: leviousa-101.web.app"
echo "   Developer contact: viditjn02@gmail.com"
echo ""
echo "🔑 Add these 15 scopes (copy-paste each URL):"
cat << 'EOF'
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/gmail.compose
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/documents.readonly
https://www.googleapis.com/auth/documents
https://www.googleapis.com/auth/spreadsheets.readonly
https://www.googleapis.com/auth/spreadsheets
https://www.googleapis.com/auth/tasks
EOF
echo ""
echo "================================================"
echo ""

echo "🌐 STEP 2: Domain Verification"  
echo "🔗 Link: https://search.google.com/search-console"
echo ""
echo "✅ Add property: https://leviousa-101.web.app"
echo "✅ Method: HTML file verification (download and upload to Firebase)"
echo "✅ After download, run:"
echo "   cd leviousa_web/public"
echo "   # Move downloaded google*.html file here"
echo "   cd .."
echo "   firebase deploy --only hosting"
echo ""
echo "================================================"
echo ""

echo "🔑 STEP 3: OAuth Client Creation"
echo "🔗 Link: https://console.cloud.google.com/apis/credentials?project=leviousa-101"
echo ""
echo "✅ Create Credentials > OAuth 2.0 Client IDs"
echo "✅ Application type: Web application"
echo "✅ Name: Leviousa OAuth Client"
echo ""
echo "✅ Authorized JavaScript origins:"
echo "   https://leviousa-101.web.app"
echo "   http://localhost:3000"
echo "   http://localhost:9001"
echo ""
echo "✅ Authorized redirect URIs:"
echo "   https://leviousa-101.web.app/oauth/callback"
echo "   http://localhost:3000/oauth/callback"
echo "   http://localhost:9001/oauth/callback"
echo ""
echo "💾 IMPORTANT: Download the JSON credentials file!"
echo ""
echo "================================================"
echo ""

echo "📤 FINAL: Submit for Verification"
echo "🔗 Back to: https://console.cloud.google.com/apis/credentials/consent?project=leviousa-101"
echo ""
echo "✅ Click 'PUBLISH APP'"
echo "✅ Upload: google-oauth-scope-justification.md"
echo "✅ Add demo video (can be done later)"
echo "✅ Submit for review"
echo ""
echo "⏱️  Expected review time: 2-6 weeks"
echo ""
echo "🎉 DONE! All the hard work is complete."

# Open all required links
echo ""
echo "🚀 Opening all required pages now..."
sleep 2

open "https://console.cloud.google.com/apis/credentials/consent?project=leviousa-101"
sleep 2
open "https://search.google.com/search-console" 
sleep 2
open "https://console.cloud.google.com/apis/credentials?project=leviousa-101"

echo "✅ All pages opened! Follow the steps above in each tab."
