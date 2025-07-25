# OAuth Services Registry Guide

## Overview

The OAuth Services Registry provides a scalable, centralized system for managing OAuth-based MCP (Model Context Protocol) services in Leviousa101. This guide explains how to add new OAuth services to the registry without modifying core application code.

## Architecture Benefits

- **Scalable**: Add new OAuth services by updating a JSON file
- **Validated**: Built-in validation ensures data quality
- **Dynamic**: Services are loaded at runtime
- **Centralized**: Single source of truth for OAuth configurations
- **Extensible**: Support for custom OAuth parameters and flows

## Registry Structure

The OAuth services registry is located at:
```
src/config/oauth-services-registry.json
```

### Service Entry Format

Each service in the registry must include:

```json
{
  "service-key": {
    "name": "Human-readable service name",
    "description": "Service description",
    "enabled": true/false,
    "priority": 1-999,
    "serverConfig": {
      "command": "npx",
      "args": ["-y", "@package/name"],
      "envMapping": {
        "key": "ENV_VARIABLE_NAME"
      }
    },
    "oauth": {
      "provider": "provider-name",
      "authUrl": "https://oauth.provider.com/authorize",
      "tokenUrl": "https://oauth.provider.com/token",
      "scopes": {
        "required": ["scope1", "scope2"],
        "default": ["scope1", "scope2", "scope3"]
      },
      "pkce": true/false,
      "customParams": {}
    },
    "capabilities": ["feature1", "feature2"],
    "documentation": "https://docs.url",
    "icon": "https://icon.url"
  }
}
```

## Adding a New OAuth Service

### Step 1: Research the Service

Before adding a new service, gather the following information:

1. **OAuth Endpoints**
   - Authorization URL
   - Token exchange URL
   - Supported OAuth flows (authorization code, PKCE, etc.)

2. **Required Scopes**
   - Minimum required permissions
   - Recommended default permissions

3. **MCP Server Package**
   - NPM package name (if available)
   - Or custom server implementation details

4. **Environment Variables**
   - Token storage variable names
   - Any additional configuration needs

### Step 2: Create the Service Entry

Example for adding a new service (using Asana as an example):

```json
{
  "asana": {
    "name": "Asana",
    "description": "Connect to Asana for project management, tasks, and team collaboration",
    "enabled": false,
    "priority": 12,
    "serverConfig": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-asana"],
      "envMapping": {
        "accessToken": "ASANA_ACCESS_TOKEN"
      }
    },
    "oauth": {
      "provider": "asana",
      "authUrl": "https://app.asana.com/-/oauth_authorize",
      "tokenUrl": "https://app.asana.com/-/oauth_token",
      "scopes": {
        "required": ["default"],
        "default": ["default"]
      },
      "pkce": true,
      "customParams": {}
    },
    "capabilities": ["projects", "tasks", "teams", "workspaces", "portfolios"],
    "documentation": "https://developers.asana.com/docs/oauth",
    "icon": "https://asana.com/favicon.ico"
  }
}
```

### Step 3: Validate the Entry

Use the validation script to ensure your entry is correct:

```bash
node scripts/validate-oauth-registry.js
```

Common validation errors and fixes:
- **Invalid URL**: Ensure URLs include protocol (https://)
- **Missing required fields**: Check all required fields are present
- **Wrong types**: Arrays should be `[]`, objects should be `{}`

### Step 4: Test the Integration

1. **Enable the service** (set `"enabled": true`)
2. **Restart the application**
3. **Check server availability**:
   ```bash
   # The service should appear in the UI server list
   ```

## Field Reference

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name for the service |
| `description` | string | Brief description of service capabilities |
| `enabled` | boolean | Whether the service is available for use |
| `priority` | number | Display order (lower = higher priority) |
| `serverConfig` | object | MCP server configuration |
| `oauth` | object | OAuth configuration |
| `capabilities` | array | List of service features |

### ServerConfig Object

| Field | Type | Description |
|-------|------|-------------|
| `command` | string | Command to run the server (e.g., "npx", "node") |
| `args` | array | Command arguments |
| `envMapping` | object | Maps credential keys to environment variables |
| `requiresDocker` | boolean | Optional: If server requires Docker |
| `requiresManualSetup` | boolean | Optional: If server needs manual configuration |

### OAuth Object

| Field | Type | Description |
|-------|------|-------------|
| `provider` | string | OAuth provider identifier |
| `authUrl` | string | OAuth authorization endpoint |
| `tokenUrl` | string | OAuth token exchange endpoint |
| `scopes` | object | Required and default OAuth scopes |
| `pkce` | boolean | Whether to use PKCE flow |
| `customParams` | object | Provider-specific OAuth parameters |

### Optional Fields

- `documentation`: URL to service documentation
- `icon`: URL to service icon/favicon
- `tenantPlaceholder`: For multi-tenant services (e.g., Microsoft)
- `instanceUrlPlaceholder`: For instance-based services (e.g., Salesforce)

## Using the Add Service Script

For easier service addition, use the provided script:

```javascript
// scripts/add-oauth-service.js example usage
const newService = {
  "name": "Your Service",
  "description": "Service description",
  "enabled": false,
  "priority": 15,
  // ... rest of configuration
};
```

Run: `node scripts/add-oauth-service.js`

## Best Practices

### 1. Start Disabled
Always add new services with `"enabled": false` initially. Enable after testing.

### 2. Use Descriptive Keys
Service keys should be lowercase, hyphen-separated (e.g., `google-drive`, not `GoogleDrive`)

### 3. Document Scopes
Clearly document what each scope provides access to in the description

### 4. Test OAuth Flow
Before enabling, test:
- Authorization URL works
- Token exchange succeeds
- Scopes are properly requested

### 5. Icon URLs
Use official favicon URLs when possible for consistency

## Troubleshooting

### Service Not Appearing
1. Check `"enabled": true`
2. Verify JSON syntax is valid
3. Restart the application
4. Check logs for loading errors

### OAuth Flow Failures
1. Verify OAuth URLs are correct
2. Check client credentials are configured
3. Ensure redirect URIs are registered with the provider
4. Verify scopes are valid for the provider

### Validation Errors
Run the validator for detailed error messages:
```bash
node scripts/validate-oauth-registry.js
```

## Examples of OAuth Services

### Simple OAuth (No special parameters)
```json
{
  "github": {
    "oauth": {
      "provider": "github",
      "authUrl": "https://github.com/login/oauth/authorize",
      "tokenUrl": "https://github.com/login/oauth/access_token",
      "scopes": {
        "required": ["repo"],
        "default": ["repo", "user"]
      },
      "pkce": false,
      "customParams": {}
    }
  }
}
```

### OAuth with PKCE
```json
{
  "notion": {
    "oauth": {
      "provider": "notion",
      "authUrl": "https://api.notion.com/v1/oauth/authorize",
      "tokenUrl": "https://api.notion.com/v1/oauth/token",
      "scopes": {
        "required": [],
        "default": []
      },
      "pkce": true,
      "customParams": {
        "owner": "user"
      }
    }
  }
}
```

### Multi-tenant OAuth
```json
{
  "microsoft-graph": {
    "oauth": {
      "provider": "microsoft",
      "authUrl": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      "tokenUrl": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      "scopes": {
        "required": ["User.Read"],
        "default": ["User.Read", "Files.Read"]
      },
      "pkce": true,
      "customParams": {
        "response_mode": "query"
      },
      "tenantPlaceholder": "{tenant}",
      "requiresTenant": true
    }
  }
}
```

## Security Considerations

1. **Never commit credentials** - Use environment variables
2. **Validate scopes** - Only request necessary permissions
3. **Use PKCE when available** - Provides additional security
4. **Regular updates** - Keep OAuth URLs and scopes current
5. **Test in development** - Never test OAuth flows in production

## Future Enhancements

The OAuth services registry is designed to be extensible. Future enhancements may include:

- Automatic OAuth URL discovery
- Dynamic scope recommendations
- Service health monitoring
- Usage analytics
- Automated testing of OAuth flows

## Contributing

When contributing new OAuth services:

1. Follow the validation requirements
2. Test the complete OAuth flow
3. Document any special requirements
4. Submit with `"enabled": false`
5. Include links to official documentation

For questions or issues, please refer to the main project documentation or open an issue in the repository. 