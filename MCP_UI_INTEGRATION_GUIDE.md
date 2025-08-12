# MCP UI Integration Guide for Leviousa 101

## 🎯 Overview

MCP UI transforms Leviousa 101's MCP tools into rich, interactive UI components. Instead of just drafting emails, users can now compose and send them directly. Calendar bookings, LinkedIn profiles, and Notion saves all become interactive experiences with beautiful interfaces.

## 🏗️ Architecture

### Core Components

1. **MCPUIBridge** (`src/features/mcp-ui/services/MCPUIBridge.js`)
   - Singleton service managing UI resources
   - Handles communication between MCP tools and UI components
   - Manages resource lifecycle and cleanup

2. **MCPUIRenderer** (`src/features/mcp-ui/components/MCPUIRenderer.js`)
   - Lit element component for rendering UI resources
   - Provides sandboxed iframe rendering for security
   - Handles UI actions and messaging

3. **MCPDashboard** (`src/features/mcp-ui/components/MCPDashboard.js`)
   - Unified dashboard for managing active UI resources
   - Displays available tools and their UI capabilities
   - Provides quick actions and resource management

4. **UIResourceGenerator** (`src/features/mcp-ui/utils/UIResourceGenerator.js`)
   - Utility class for generating UI resources
   - Creates HTML interfaces for:
     - Email composers
     - Calendar widgets
     - LinkedIn profile cards
     - Notion summary savers

## 🚀 Key Features

### 1. Interactive Email Composer
- **Tool**: `gmail.createDraft`
- **UI Features**:
  - Rich text editor
  - Recipient management (To, CC, BCC)
  - Attachment support
  - Draft saving
  - Direct sending capability

### 2. Visual Calendar Widget
- **Tool**: `google-calendar.createEvent`
- **UI Features**:
  - Date and time pickers
  - Duration selection
  - Location input
  - Attendee management
  - Reminder settings

### 3. LinkedIn Profile Cards
- **Tool**: `linkedin.searchPeople`
- **UI Features**:
  - Profile photo display
  - Contact information
  - Professional summary
  - Quick connect actions
  - View full profile links

### 4. Notion Summary Saver
- **Tool**: `notion.createPage`
- **UI Features**:
  - Content preview
  - Title editing
  - Tag management
  - Workspace selection
  - One-click save

## 🔧 Implementation Details

### How UI Resources Work

1. **Tool Invocation**
   ```javascript
   // When a tool is called
   const result = await mcpClient.invokeTool('gmail.createDraft', {
     to: 'user@example.com',
     subject: 'Meeting Follow-up'
   });
   ```

2. **UI Resource Detection**
   ```javascript
   // MCPClient checks if response is a UI resource
   if (result && result.type === 'ui_resource') {
     this.emit('ui-resource-received', {
       toolName,
       result
     });
   }
   ```

3. **Resource Registration**
   ```javascript
   // MCPUIBridge registers the resource
   const resourceId = mcpUIBridge.registerUIResource(
     serverId,
     toolName,
     result.resource
   );
   ```

4. **UI Rendering**
   ```javascript
   // MCPUIRenderer displays the resource
   <mcp-ui-renderer
     .resource=${resource}
     .serverId=${serverId}
     .toolName=${toolName}
   ></mcp-ui-renderer>
   ```

### Security Measures

1. **Sandboxed Iframes**
   - UI resources render in sandboxed iframes
   - Limited permissions: `allow-scripts allow-forms`
   - No access to parent window except through postMessage

2. **Content Sanitization**
   - DOMPurify sanitizes all HTML content
   - XSS protection through strict CSP
   - Event handler stripping

3. **Message Validation**
   - All UI actions validated before execution
   - Origin checks on postMessage events
   - Tool parameter validation

## 📝 Usage Instructions

### For Users

1. **Enable MCP UI**
   - Go to Settings > Invisibility
   - Find "MCP Interactive UI" section
   - Toggle to "Active"

2. **Try Features**
   - Click "Try It" buttons to test each feature
   - UI components appear inline
   - Actions execute through connected MCP servers

3. **Manage Resources**
   - Active resources show in dashboard
   - Click X to close resources
   - Resources auto-expire after 1 hour

### For Developers

1. **Adding New UI Resources**

   ```javascript
   // In UIResourceGenerator.js
   static generateCustomWidget(options) {
     const html = `
       <div class="custom-widget">
         <!-- Your HTML here -->
       </div>
       <script>
         function handleAction() {
           window.parent.postMessage({
             type: 'ui-action',
             tool: 'your-tool.action',
             params: { /* ... */ }
           }, '*');
         }
       </script>
     `;
     
     return {
       type: 'resource',
       resource: {
         uri: `ui://custom-widget/${Date.now()}`,
         mimeType: 'text/html',
         title: 'Custom Widget',
         text: html
       }
     };
   }
   ```

2. **Handling UI Actions**

   ```javascript
   // In your MCP server or tool
   async handleUIAction(action) {
     const { tool, params } = action;
     
     switch (tool) {
       case 'your-tool.action':
         return await this.performAction(params);
       default:
         throw new Error(`Unknown tool: ${tool}`);
     }
   }
   ```

3. **Registering UI-Capable Tools**

   ```javascript
   // In tool registration
   toolRegistry.registerServerTool('your-server', 'yourTool', {
     title: 'Your Tool',
     description: 'Tool description',
     supportsUI: true,
     uiCapabilities: ['interactive', 'real-time']
   });
   ```

## 🧪 Testing

### Unit Tests
```bash
# Run standalone tests
node debug/test-mcp-ui-standalone.js

# Test specific components
node debug/test-mcp-ui-integration.js
```

### Manual Testing
1. Start Leviousa 101
2. Enable an MCP service (e.g., Gmail)
3. Go to Settings > Invisibility
4. Click "Try It" on any feature
5. Verify UI renders correctly
6. Test actions (send, save, etc.)

## 🔍 Troubleshooting

### Common Issues

1. **UI Not Rendering**
   - Check browser console for errors
   - Verify MCP service is connected
   - Ensure UI mode is active

2. **Actions Not Working**
   - Check MCP server logs
   - Verify OAuth tokens are valid
   - Test tool directly without UI

3. **Security Warnings**
   - Normal for sandboxed content
   - Ensure using HTTPS in production
   - Check CSP headers

### Debug Mode

Enable debug logging:
```javascript
// In MCPUIBridge.js
this.debug = true;
```

## 🚦 Future Enhancements

1. **More UI Components**
   - Slack message composers
   - GitHub PR creators
   - Discord channel managers

2. **Advanced Features**
   - Drag-and-drop file uploads
   - Real-time collaboration
   - Multi-resource workflows

3. **Customization**
   - User-defined themes
   - Layout preferences
   - Keyboard shortcuts

## 📚 Resources

- [MCP Documentation](https://modelcontextprotocol.com)
- [Lit Element Guide](https://lit.dev)
- [DOMPurify Security](https://github.com/cure53/DOMPurify)

---

*Last Updated: November 2024* 