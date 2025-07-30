# Paragon MCP Integration

## Overview

We have successfully integrated Paragon MCP (Model Context Protocol) to replace our previous individual MCP servers (Google, Notion) with a unified solution that provides access to 130+ SaaS integrations through a single interface.

## What is Paragon MCP?

Paragon MCP is an open-source MCP server that wraps Paragon ActionKit – a REST API exposing pre-built "actions" for 130+ SaaS apps (Slack, Salesforce, Google Calendar, etc.). The server translates every ActionKit action into an MCP tool, allowing our application to call these integrations with simple JSON tool-calls.

### Key Features:
- **130+ Pre-built Integrations**: Access to Gmail, Google Drive, Calendar, Notion, Slack, Salesforce, HubSpot, and many more
- **Built-in Connect Portal**: OAuth/API-key widget for user authentication
- **JWT Authentication**: Secure user-specific access to integrations
- **Stateless Transport**: Server-Sent Events (SSE) endpoint for bi-directional MCP messages

## Architecture Changes

### Before (Multiple MCP Servers):
```
Leviousa → Google MCP Server → Google APIs
        → Notion MCP Server → Notion APIs
        → (Each integration needs its own server)
```

### After (Unified Paragon MCP):
```
Leviousa → Paragon MCP Server → Paragon ActionKit → 130+ SaaS APIs
        (Single server for all integrations)
```

## Implementation Details

### 1. JWT Authentication Service
Created `src/features/invisibility/mcp/paragonJwtService.js` to handle JWT token generation for user authentication:
- Generates RS256-signed JWT tokens for each user
- Integrates with Firebase authentication to get current user ID
- Tokens include required claims: `sub`, `aud`, `iat`, `exp`

### 2. MCPServerManager Updates
Modified `src/features/invisibility/mcpServerManager.js`:
- Added Paragon server definition with Node 22.17.1 runtime
- Special handling for Paragon environment setup
- Loads Paragon configuration from `.env` file

### 3. MCPClient Updates
Updated `src/features/invisibility/mcp/MCPClient.js`:
- Changed `startConfiguredServers` to only start Paragon
- Added JWT authentication flow for Paragon
- Modified `_startServerInternal` to handle JWT tokens

### 4. Service Registry Updates
Updated `src/config/oauth-services-registry.json`:
- Added Paragon service configuration
- Disabled Google and Notion servers (replaced by Paragon)

## Setup Requirements

### 1. Node.js 22.14+
Paragon MCP requires Node.js version 22.14 or higher. We have configured it to use:
```
/Users/viditjain/.nvm/versions/node/v22.17.1/bin/node
```

### 2. Paragon Account
You need to:
1. Sign up at https://dashboard.useparagon.com/signup
2. Get your Project ID from the dashboard
3. Generate a Signing Key from Settings > SDK Setup

### 3. Environment Configuration
Update `services/paragon-mcp/.env`:
```env
PROJECT_ID="your-actual-project-id"
SIGNING_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
MCP_SERVER_URL="http://localhost:3001"
NODE_ENV="development"
LIMIT_TO_INTEGRATIONS=gmail,googleCalendar,googleDrive,googleDocs,googleSheets,googleTasks,notion,slack
```

## How It Works

### 1. Server Startup
When the application starts:
1. MCPClient calls `startConfiguredServers()`
2. Paragon server is registered and started
3. JWT service is initialized with signing key
4. Server process is spawned with Node 22

### 2. User Authentication Flow
For each user:
1. Firebase authentication provides user ID
2. JWT service generates a Paragon User Token
3. Token is passed to Paragon MCP server
4. User can access their connected integrations

### 3. Tool Invocation
When calling a tool (e.g., sending an email):
1. Tool request is sent to Paragon MCP
2. Paragon validates JWT token
3. If user hasn't connected the integration, returns Connect Portal URL
4. If connected, executes the action via ActionKit

## Available Integrations

Paragon provides access to 130+ integrations. Some key ones include:

### Communication
- Gmail (send, search, manage emails)
- Slack (send messages, manage channels)
- Microsoft Teams
- Discord

### Productivity
- Google Calendar (create/manage events)
- Google Drive (manage files)
- Google Docs/Sheets
- Notion (pages, databases)
- Asana
- Trello

### CRM & Sales
- Salesforce
- HubSpot
- Pipedrive
- Close.io

### And many more...

## Testing

### Test Script
Created `test-paragon-mcp.js` to verify the integration:
```bash
node test-paragon-mcp.js
```

This script:
- Checks environment configuration
- Tests JWT generation
- Starts the Paragon MCP server
- Sends initialization requests
- Lists available tools

### Current Status
The integration is complete but requires valid Paragon credentials to fully test:
- ✅ JWT service implemented
- ✅ Server configuration added
- ✅ MCPClient updated for Paragon
- ✅ Old servers disabled
- ⏳ Awaiting Paragon Project ID and Signing Key

## Connect Portal Integration

The Paragon Connect Portal allows users to authorize integrations. When a tool is called without authorization:

1. Paragon returns a setup URL
2. User is presented with OAuth/API key flow
3. Credentials are stored by Paragon
4. Subsequent calls work automatically

To integrate the Connect Portal UI, we can use the Paragon Connect SDK:
```javascript
import { paragon } from '@useparagon/connect';

// When setup URL is received
paragon.connect(integrationName, {
  onSuccess: () => {
    // Retry the original action
  }
});
```

## Migration Benefits

1. **Simplified Architecture**: One server instead of many
2. **More Integrations**: 130+ vs. just Google and Notion
3. **Centralized Auth**: Paragon handles OAuth for all services
4. **Better Maintenance**: Updates handled by Paragon
5. **Scalability**: Easy to add new integrations

## Next Steps

1. **Get Paragon Credentials**:
   - Sign up at https://dashboard.useparagon.com/signup
   - Create a project
   - Generate signing key

2. **Update Environment**:
   - Add actual Project ID and Signing Key to `.env`
   - Test with real credentials

3. **Implement Connect Portal**:
   - Add Paragon Connect SDK to frontend
   - Handle setup URLs in UI
   - Create seamless auth flow

4. **Test All Integrations**:
   - Verify Gmail functionality
   - Test other Google services
   - Verify Notion access
   - Test additional integrations

## Troubleshooting

### "Neither SIGNING_KEY nor SIGNING_KEY_PATH is set"
- Ensure `.env` file has valid signing key
- Check environment variables are loaded

### "No current user ID for Paragon JWT generation"
- Ensure user is logged in via Firebase
- Check authService is initialized

### Server fails to start
- Verify Node 22.17.1 is installed
- Check file permissions
- Ensure port 3001 is available

## Resources

- [Paragon Documentation](https://docs.useparagon.com)
- [Paragon MCP GitHub](https://github.com/useparagon/paragon-mcp)
- [MCP Specification](https://modelcontextprotocol.com)
- [ActionKit API Reference](https://docs.useparagon.com/actionkit) 