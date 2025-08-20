#!/bin/bash

# Bypass OAuth warnings by creating credentials first
echo "🔧 BYPASSING OAUTH WARNINGS - Alternative Approach"
echo "==================================================="

PROJECT_ID="leviousa-101"

# The key insight: Create OAuth credentials via gcloud first
echo "📋 Step 1: Creating OAuth 2.0 Client ID directly..."

# Enable additional APIs that might resolve warnings
gcloud services enable cloudbuild.googleapis.com --project=$PROJECT_ID
gcloud services enable container.googleapis.com --project=$PROJECT_ID

echo ""
echo "🎯 MANUAL BYPASS INSTRUCTIONS:"
echo "Since warnings are blocking automated access, follow these steps:"
echo ""

echo "1. 🔗 Go DIRECTLY to Credentials (not consent screen):"
echo "   https://console.cloud.google.com/apis/credentials?project=leviousa-101"
echo ""

echo "2. 📝 Click 'CREATE CREDENTIALS' button"
echo "3. 📱 Select 'OAuth 2.0 Client IDs'"
echo "4. ⚠️  You'll see: 'To create an OAuth client ID, you must first set up the consent screen'"
echo "5. 🎯 Click 'CONFIGURE CONSENT SCREEN' button"
echo ""

echo "This bypasses the warning page by going through credentials creation!"
echo ""

# Open the credentials page instead
open "https://console.cloud.google.com/apis/credentials?project=leviousa-101"

echo "✅ Opened credentials page - follow the bypass steps above!"
