# MCP OAuth Setup Guide

This guide explains how to set up OAuth credentials for MCP (Model Context Protocol) integrations with external services.

## 🔐 Required Environment Variables

The MCP integration system requires OAuth client credentials for each service. These should be set as environment variables:

### GitHub Integration
```bash
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
```

### Notion Integration  
```bash
NOTION_CLIENT_ID=your_notion_client_id_here
NOTION_CLIENT_SECRET=your_notion_client_secret_here
```

### Slack Integration
```bash
SLACK_CLIENT_ID=your_slack_client_id_here
SLACK_CLIENT_SECRET=your_slack_client_secret_here
```

### Google Drive (Optional)
```bash
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```
*Note: Google Drive integration can use Firebase Auth instead (recommended)*

## 🔧 How to Get OAuth Credentials

### GitHub OAuth App
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in the details:
   - **Application name**: Leviousa MCP Integration
   - **Homepage URL**: https://leviousa-101.web.app
   - **Authorization callback URL**: https://leviousa-101.web.app/oauth/callback
4. Click **"Register application"**
5. Copy the **Client ID** and **Client Secret**

### Notion Integration
1. Go to [Notion My Integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Fill in the details:
   - **Name**: Leviousa MCP
   - **Associated workspace**: Select your workspace
4. Click **"Submit"**
5. Go to **OAuth Domain & URIs**
6. Add redirect URI: https://leviousa-101.web.app/oauth/callback
7. Copy the **OAuth client ID** and **OAuth client secret**

### Slack App
1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From scratch"**
3. Fill in the details:
   - **App Name**: Leviousa MCP
   - **Pick a workspace**: Select your workspace
4. Go to **OAuth & Permissions**
5. Under **Redirect URLs**, add: https://leviousa-101.web.app/oauth/callback
6. Under **Scopes** → **Bot Token Scopes**, add:
   - `channels:read`
   - `channels:history`
   - `chat:write`
   - `files:read`
7. Go to **Basic Information** → **App Credentials**
8. Copy the **Client ID** and **Client Secret**

## 🌍 Setting Environment Variables

### macOS/Linux (Terminal)
Add to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):
```bash
export GITHUB_CLIENT_ID="your_github_client_id_here"
export GITHUB_CLIENT_SECRET="your_github_client_secret_here"
# ... repeat for other services
```

### Windows (PowerShell)
```powershell
$env:GITHUB_CLIENT_ID="your_github_client_id_here"
$env:GITHUB_CLIENT_SECRET="your_github_client_secret_here"
# ... repeat for other services
```

### Using .env file
Create a `.env` file in the project root:
```bash
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
NOTION_CLIENT_ID=your_notion_client_id_here
NOTION_CLIENT_SECRET=your_notion_client_secret_here
SLACK_CLIENT_ID=your_slack_client_id_here
SLACK_CLIENT_SECRET=your_slack_client_secret_here
```

## 🚀 Testing the Integration

1. Restart the Leviousa application after setting environment variables
2. Go to **Settings** → **Integrations**
3. Click **"Connect"** on any service
4. If credentials are properly configured, it should open the OAuth flow in your browser
5. Complete the authorization process
6. You should see the service status change to "Connected"

## ❌ Troubleshooting

### "Missing OAuth credentials" Error
- Make sure environment variables are set correctly
- Restart the application after setting variables
- Check that variable names match exactly (case-sensitive)

### "Redirect URI mismatch" Error  
- Ensure you used the exact callback URL: `https://leviousa-101.web.app/oauth/callback`
- Check for typos in the OAuth app configuration

### "Invalid client" Error
- Double-check your Client ID and Client Secret
- Make sure you copied them correctly without extra spaces

## 🔒 Security Notes

- Never commit OAuth credentials to version control
- Keep your client secrets secure and private
- Rotate credentials periodically for security
- Only grant necessary permissions/scopes

## ✅ Supported Services

| Service | Status | Integration Type |
|---------|--------|------------------|
| GitHub | ✅ Ready | OAuth 2.0 |
| Notion | ✅ Ready | OAuth 2.0 |
| Slack | ✅ Ready | OAuth 2.0 |
| Google Drive | ✅ Ready | Firebase Auth (recommended) or OAuth 2.0 |

For more detailed setup instructions, see the [OAuth Setup Guide](OAUTH_SETUP_GUIDE.md). 