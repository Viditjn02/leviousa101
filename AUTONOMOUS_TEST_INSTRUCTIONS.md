
# 🤖 AUTONOMOUS INTEGRATION TEST INSTRUCTIONS

## REAL API TESTING WITH USER ID: vqLrzGnqajPGlX9Wzq89SgqVPsN2

### METHOD 1: ELECTRON DEVTOOLS CONSOLE

1. Open your running Electron app
2. Open DevTools (Cmd+Option+I on macOS, F12 on others)
3. Go to Console tab
4. Paste and run this code:

```javascript
// Real MCP integration test
async function testAllIntegrations() {
    const REAL_USER_ID = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
    
    console.log('🚀 Starting real integration tests...');
    
    // Test Notion
    try {
        const notion = await window.api.mcp.callTool('notion_list_databases', { user_id: REAL_USER_ID });
        console.log('✅ Notion:', notion);
    } catch (e) { console.log('❌ Notion:', e.message); }
    
    // Test LinkedIn
    try {
        const linkedin = await window.api.mcp.callTool('linkedin_get_profile', { user_id: REAL_USER_ID, profile_id: 'me' });
        console.log('✅ LinkedIn:', linkedin);
    } catch (e) { console.log('❌ LinkedIn:', e.message); }
    
    // Test Google Calendar
    try {
        const cal = await window.api.mcp.callTool('google_calendar_list_events', { user_id: REAL_USER_ID, calendar_id: 'primary', max_results: 3 });
        console.log('✅ Calendar:', cal);
    } catch (e) { console.log('❌ Calendar:', e.message); }
    
    // Test Calendly
    try {
        const calendly = await window.api.mcp.callTool('calendly_list_event_types', { user_id: REAL_USER_ID });
        console.log('✅ Calendly:', calendly);
    } catch (e) { console.log('❌ Calendly:', e.message); }
    
    // Test Gmail
    try {
        const gmail = await window.api.mcp.callTool('GMAIL_SEND_EMAIL', {
            user_id: REAL_USER_ID,
            toRecipients: [{ emailAddress: { address: 'test@example.com' } }],
            messageContent: {
                subject: 'Real Test - ' + new Date().toLocaleString(),
                body: { content: 'Real integration test success!', contentType: 'text' }
            }
        });
        console.log('✅ Gmail:', gmail);
    } catch (e) { console.log('❌ Gmail:', e.message); }
    
    console.log('🏁 All integration tests completed!');
}

testAllIntegrations();
```

### METHOD 2: USE EXISTING APP INTERFACE

1. Open the app's MCP Settings or Integration panel
2. Find the tool testing section
3. Test each integration manually with the real user ID

### EXPECTED RESULTS

- ✅ **Notion**: Should use Proxy API with Notion-Version header
- ✅ **LinkedIn**: Should use Zeus workflows (713b7427, 05f302b6)  
- ✅ **Google Calendar**: Should use Zeus workflows with system timezone
- ✅ **Calendly**: Should use new Zeus workflows (443a169a, etc.)
- ✅ **Gmail**: Should continue working (already implemented)

### TROUBLESHOOTING

If any integration fails:
1. Check console for specific error messages
2. Verify user authentication for that service
3. Confirm the MCP server is running properly
4. Check network connectivity to Paragon APIs

---
Generated: 2025-09-04T20:04:46.343Z
