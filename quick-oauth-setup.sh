#!/bin/bash

# Quick OAuth Setup - Opens required Google Cloud Console pages
echo "🚀 Opening Google Cloud Console pages for OAuth setup..."

PROJECT_ID="leviousa-101"

# OAuth Consent Screen
echo "📋 Opening OAuth Consent Screen..."
open "https://console.cloud.google.com/apis/credentials/consent?project=${PROJECT_ID}"

sleep 2

# Credentials page for OAuth Client creation
echo "🔑 Opening Credentials page..."
open "https://console.cloud.google.com/apis/credentials?project=${PROJECT_ID}"

sleep 2

# Google Search Console for domain verification
echo "🌐 Opening Google Search Console..."
open "https://search.google.com/search-console"

echo ""
echo "✅ All required pages opened in your browser!"
echo ""
echo "📋 Configuration checklist:"
echo ""
echo "1. OAuth Consent Screen Configuration:"
echo "   ✓ User Type: External"
echo "   ✓ App name: Leviousa"
echo "   ✓ User support email: viditjn02@gmail.com"
echo "   ✓ Homepage: https://leviousa-101.web.app"
echo "   ✓ Privacy Policy: https://leviousa-101.web.app/privacy-policy.html"
echo "   ✓ Terms of Service: https://leviousa-101.web.app/terms-of-service.html"
echo "   ✓ Authorized domains: leviousa-101.web.app"
echo ""
echo "2. OAuth Scopes (copy these exact URLs):"
echo "   ✓ https://www.googleapis.com/auth/userinfo.email"
echo "   ✓ https://www.googleapis.com/auth/userinfo.profile"
echo "   ✓ https://www.googleapis.com/auth/drive.file"
echo "   ✓ https://www.googleapis.com/auth/drive.readonly"
echo "   ✓ https://www.googleapis.com/auth/gmail.readonly"
echo "   ✓ https://www.googleapis.com/auth/gmail.modify"
echo "   ✓ https://www.googleapis.com/auth/gmail.send"
echo "   ✓ https://www.googleapis.com/auth/gmail.compose"
echo "   ✓ https://www.googleapis.com/auth/calendar.readonly"
echo "   ✓ https://www.googleapis.com/auth/calendar.events"
echo "   ✓ https://www.googleapis.com/auth/documents.readonly"
echo "   ✓ https://www.googleapis.com/auth/documents"
echo "   ✓ https://www.googleapis.com/auth/spreadsheets.readonly"
echo "   ✓ https://www.googleapis.com/auth/spreadsheets"
echo "   ✓ https://www.googleapis.com/auth/tasks"
echo ""
echo "3. OAuth Client Redirect URIs:"
echo "   ✓ https://leviousa-101.web.app/oauth/callback"
echo "   ✓ http://localhost:3000/oauth/callback"
echo "   ✓ http://localhost:9001/oauth/callback"
echo ""
echo "📖 Reference documentation:"
echo "   - google-oauth-scope-justification.md (for scope justifications)"
echo "   - google-oauth-consent-setup.md (detailed setup guide)"
echo "   - oauth_verification_checklist.md (completion checklist)"
echo ""
echo "🎬 Create demo video using: google-verification-demo-script.md"
echo ""
echo "🚀 After completing all steps, submit for verification!"
