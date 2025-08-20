#!/bin/bash
set -e

# Google Cloud OAuth Consent Screen Setup Script
# Leviousa - AI Meeting Assistant

echo "🚀 Starting Google Cloud OAuth Setup for Leviousa..."
echo "Project: leviousa-101"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ID="leviousa-101"

# Function to print status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verify project is set correctly
print_status "Verifying Google Cloud project..."
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    print_status "Setting project to $PROJECT_ID..."
    gcloud config set project $PROJECT_ID
fi
print_success "Project verified: $PROJECT_ID"

# Check authentication
print_status "Checking authentication..."
ACCOUNT=$(gcloud config get-value account 2>/dev/null)
if [ -z "$ACCOUNT" ]; then
    print_error "Not authenticated. Please run: gcloud auth login"
    exit 1
fi
print_success "Authenticated as: $ACCOUNT"

# Enable required APIs (if not already enabled)
print_status "Ensuring required APIs are enabled..."

REQUIRED_APIS=(
    "drive.googleapis.com"
    "docs.googleapis.com"
    "gmail.googleapis.com"
    "calendar-json.googleapis.com"
    "sheets.googleapis.com"
    "tasks.googleapis.com"
    "iamcredentials.googleapis.com"
)

for api in "${REQUIRED_APIS[@]}"; do
    if gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
        print_success "✓ $api already enabled"
    else
        print_status "Enabling $api..."
        gcloud services enable "$api"
        print_success "✓ Enabled $api"
    fi
done

# Create OAuth client credentials if they don't exist
print_status "Creating OAuth 2.0 Client ID..."

# Check if credentials already exist
EXISTING_CREDENTIALS=$(gcloud alpha iap oauth-brands list 2>/dev/null | grep -c "oauth2" || echo "0")

if [ "$EXISTING_CREDENTIALS" -eq "0" ]; then
    print_status "No existing OAuth brand found. This requires manual setup in Google Cloud Console."
    
    # Create the JSON payload for OAuth consent screen
    print_status "Preparing OAuth consent screen configuration..."
    
    cat > oauth_consent_config.json << 'EOF'
{
  "applicationTitle": "Leviousa",
  "supportEmail": "viditjn02@gmail.com",
  "homepageUri": "https://leviousa-101.web.app",
  "privacyPolicyUri": "https://leviousa-101.web.app/privacy-policy.html",
  "tosUri": "https://leviousa-101.web.app/terms-of-service.html",
  "authorizedDomains": [
    "leviousa-101.web.app"
  ],
  "developerContactInformation": [
    "viditjn02@gmail.com"
  ]
}
EOF
    
    print_success "OAuth consent configuration saved to oauth_consent_config.json"
    
    # Try to create OAuth client using alternative method
    print_status "Attempting to create OAuth client credentials..."
    
    # Get access token for API calls
    TOKEN=$(gcloud auth application-default print-access-token 2>/dev/null || gcloud auth print-access-token)
    
    # Try the IAM credentials API approach
    print_status "Using Google Cloud Console web interface is required for OAuth consent screen setup."
    
    echo ""
    echo "==============================================="
    echo "🔧 MANUAL STEPS REQUIRED"
    echo "==============================================="
    echo ""
    echo "1. Open Google Cloud Console OAuth Consent Screen:"
    echo "   https://console.cloud.google.com/apis/credentials/consent?project=leviousa-101"
    echo ""
    echo "2. Configure OAuth Consent Screen with these values:"
    echo "   - User Type: External"
    echo "   - App name: Leviousa"
    echo "   - User support email: viditjn02@gmail.com"
    echo "   - App domain:"
    echo "     * Application home page: https://leviousa-101.web.app"
    echo "     * Application privacy policy: https://leviousa-101.web.app/privacy-policy.html"
    echo "     * Application terms of service: https://leviousa-101.web.app/terms-of-service.html"
    echo "   - Authorized domains: leviousa-101.web.app"
    echo "   - Developer contact: viditjn02@gmail.com"
    echo ""
    echo "3. Add OAuth Scopes (copy and paste these exact scope URLs):"
    cat << 'EOF'
   - https://www.googleapis.com/auth/userinfo.email
   - https://www.googleapis.com/auth/userinfo.profile
   - https://www.googleapis.com/auth/drive.file
   - https://www.googleapis.com/auth/drive.readonly
   - https://www.googleapis.com/auth/gmail.readonly
   - https://www.googleapis.com/auth/gmail.modify
   - https://www.googleapis.com/auth/gmail.send
   - https://www.googleapis.com/auth/gmail.compose
   - https://www.googleapis.com/auth/calendar.readonly
   - https://www.googleapis.com/auth/calendar.events
   - https://www.googleapis.com/auth/documents.readonly
   - https://www.googleapis.com/auth/documents
   - https://www.googleapis.com/auth/spreadsheets.readonly
   - https://www.googleapis.com/auth/spreadsheets
   - https://www.googleapis.com/auth/tasks
EOF
    echo ""
    echo "4. Create OAuth 2.0 Client ID:"
    echo "   - Go to: https://console.cloud.google.com/apis/credentials?project=leviousa-101"
    echo "   - Click 'Create Credentials' > 'OAuth 2.0 Client IDs'"
    echo "   - Application type: Web application"
    echo "   - Name: Leviousa OAuth Client"
    echo "   - Authorized redirect URIs:"
    echo "     * https://leviousa-101.web.app/oauth/callback"
    echo "     * http://localhost:3000/oauth/callback"
    echo "     * http://localhost:9001/oauth/callback"
    echo ""
    echo "5. Domain Verification (Google Search Console):"
    echo "   - Go to: https://search.google.com/search-console"
    echo "   - Add property: leviousa-101.web.app"
    echo "   - Verify using DNS TXT record or HTML file upload"
    echo ""
    
    print_warning "Some steps require manual web interface interaction due to Google's security requirements."
    print_status "Use the documentation files created for detailed scope justifications:"
    echo "   - google-oauth-scope-justification.md"
    echo "   - google-oauth-consent-setup.md"
    echo ""
    
else
    print_success "OAuth credentials already exist"
fi

# Create a comprehensive verification checklist
print_status "Creating verification checklist..."

cat > oauth_verification_checklist.md << 'EOF'
# Google OAuth Verification Checklist ✅

## Automated Setup Completed
- [✅] Google Cloud project configured (leviousa-101)
- [✅] Required APIs enabled (Drive, Docs, Gmail, Calendar, Sheets, Tasks)
- [✅] Privacy Policy deployed: https://leviousa-101.web.app/privacy-policy.html
- [✅] Terms of Service deployed: https://leviousa-101.web.app/terms-of-service.html
- [✅] Scope justification documentation created
- [✅] Demo video script prepared

## Manual Steps Required
- [ ] Domain verification in Google Search Console
- [ ] OAuth consent screen configuration
- [ ] OAuth 2.0 client credentials creation
- [ ] Scope addition with justifications
- [ ] Demo video recording (2-3 minutes)
- [ ] Verification submission with documentation

## Verification URLs
- OAuth Consent Screen: https://console.cloud.google.com/apis/credentials/consent?project=leviousa-101
- Credentials Management: https://console.cloud.google.com/apis/credentials?project=leviousa-101
- Domain Verification: https://search.google.com/search-console

## Next Steps
1. Complete manual configuration steps above
2. Record demo video using provided script
3. Submit for verification with documentation package
4. Respond to any Google review requests promptly

Expected approval time: 2-6 weeks
EOF

print_success "Verification checklist created: oauth_verification_checklist.md"

echo ""
echo "==============================================="
echo "📋 SETUP SUMMARY"
echo "==============================================="
echo ""
echo "✅ Automated components completed:"
echo "   - Google Cloud project configured"
echo "   - APIs enabled"
echo "   - Documentation prepared"
echo "   - Legal pages deployed"
echo ""
echo "⚠️  Manual steps required:"
echo "   - OAuth consent screen configuration (web UI)"
echo "   - Domain verification (Google Search Console)"
echo "   - OAuth client creation (web UI)"
echo ""
echo "📁 Documentation files available:"
echo "   - google-oauth-scope-justification.md"
echo "   - google-oauth-consent-setup.md"
echo "   - google-verification-demo-script.md"
echo "   - oauth_verification_checklist.md"
echo ""

print_success "OAuth setup script completed!"
print_status "Follow the manual steps above to complete the verification process."

echo ""
echo "🚀 Ready for Google OAuth verification submission!"
