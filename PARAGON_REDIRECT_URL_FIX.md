# Paragon Redirect URL Fix

## Issue Summary
Error encountered: `{"message":"Redirect url is missing in query parameters.","code":"7105","status":400,"meta":{}}`

This error occurs when the Paragon Connect Portal is accessed but the redirect URLs are not properly configured in the Paragon dashboard.

## Root Cause
The error code 7105 specifically indicates that the redirect URL is missing or doesn't match what's configured in your Paragon project dashboard. This happens because:

1. **Missing Standard Redirect URL**: Paragon requires `https://passport.useparagon.com/oauth` to be configured
2. **Development Environment URLs**: For localhost testing, additional URLs may be needed
3. **Project Configuration**: The Paragon project needs proper redirect URL setup

## Solution

### Step 1: Log into Paragon Dashboard

1. Go to https://dashboard.useparagon.com
2. Sign in to your account
3. Navigate to your project (Project ID: `db5e019e-0558-4378-93de-f212a73e0606`)

### Step 2: Configure Redirect URLs

1. In your Paragon dashboard, go to **Settings > SDK Setup**
2. Look for **Redirect URLs** or **OAuth Configuration** section
3. Add the following redirect URLs:

```
https://passport.useparagon.com/oauth
http://localhost:3001
http://localhost:3000
http://localhost:8080
https://leviousa-101.web.app
```

### Step 3: Verify Integration Configuration

Make sure your integration has these settings:

```javascript
// In your application
await paragon.authenticate(projectId, userToken);

// When connecting to a service
paragon.connect("gmail", {
  onSuccess: () => {
    console.log("Connection successful!");
  },
  onError: (error) => {
    console.error("Connection error:", error);
  }
});
```

### Step 4: Test the Integration

1. Open the test file: `test-paragon-connect.html` in a browser
2. Click "Test Gmail Connection"
3. The Connect Portal should open without the 7105 error
4. Complete the OAuth flow for Gmail

## Required Redirect URLs

For this project, ensure these URLs are configured in Paragon dashboard:

### Production URLs
- `https://passport.useparagon.com/oauth` (Standard Paragon redirect)
- `https://leviousa-101.web.app` (Your production app)

### Development URLs  
- `http://localhost:3001` (Paragon MCP server)
- `http://localhost:3000` (Development server)
- `http://localhost:8080` (Alternative dev port)

## Environment Variables Check

Verify your `.env` file in `services/paragon-mcp/` has:

```bash
PROJECT_ID=db5e019e-0558-4378-93de-f212a73e0606
SIGNING_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
MCP_SERVER_URL=http://localhost:3001
```

## Testing Steps

1. **Start Paragon MCP Server:**
   ```bash
   cd services/paragon-mcp
   nvm use 22.17.1
   npm run start:sse
   ```

2. **Start Main Application:**
   ```bash
   npm start
   ```

3. **Test Connect Portal:**
   - Open `test-paragon-connect.html` in browser
   - Click test button
   - Should see Connect Portal open without error 7105

## Common Issues

### Issue: Still getting 7105 error
**Solution**: Double-check redirect URLs in Paragon dashboard match exactly

### Issue: Authentication fails  
**Solution**: Verify PROJECT_ID and SIGNING_KEY in .env file

### Issue: Connect Portal doesn't open
**Solution**: Ensure integration (e.g., Gmail) is enabled in Paragon dashboard

## Verification

After applying the fix:
1. ✅ No more 7105 redirect URL errors
2. ✅ Connect Portal opens successfully  
3. ✅ OAuth flow completes properly
4. ✅ Integration works as expected

## Next Steps

Once the redirect URLs are configured:
1. Test the integration thoroughly
2. Document any additional URLs needed for your environment
3. Update production deployment with correct redirect URLs
4. Monitor for any remaining authentication issues

## Notes

- Redirect URLs are case-sensitive
- Protocol (http/https) must match exactly
- Port numbers must be included for localhost URLs
- Changes to redirect URLs in Paragon dashboard may take a few minutes to propagate