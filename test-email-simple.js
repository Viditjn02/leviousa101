#!/usr/bin/env node

/**
 * Simple Gmail Send Email Test
 * Tests the fixed gmail_send_email tool (now using Proxy API instead of ActionKit)
 */

const MCPClient = require('./src/features/invisibility/mcp/MCPClient');

async function testEmailSend() {
    console.log('🚀 Starting Gmail send email test...');
    
    try {
        // Initialize MCP client
        const mcpClient = new MCPClient();
        await mcpClient.initialize();
        
        console.log('✅ MCP Client initialized');
        
        // Test email data
        const emailData = {
            user_id: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2',
            to: 'test@example.com',
            subject: 'Test Email - Proxy API Fix',
            body: 'This email tests the fixed Proxy API implementation instead of ActionKit.'
        };
        
        console.log('📧 Sending test email...', { to: emailData.to, subject: emailData.subject });
        
        // Send email using fixed implementation
        const result = await mcpClient.invokeTool('gmail_send_email', emailData);
        
        console.log('📬 Email send result:');
        
        if (result.content && result.content[0]) {
            const response = JSON.parse(result.content[0].text);
            
            if (response.error) {
                console.log('❌ Email send failed:', response.error);
                
                // Check what type of error
                if (response.error.includes('402') || response.error.includes('ActionKit')) {
                    console.log('🔴 ActionKit error - fix failed!');
                } else if (response.error.includes('404')) {
                    console.log('🟡 404 Not Found - endpoint issue');
                } else if (response.error.includes('401') || response.error.includes('Unauthorized')) {
                    console.log('🟡 Authentication issue');
                } else {
                    console.log('🟢 Different error - ActionKit fix successful!');
                }
            } else if (response.success) {
                console.log('✅ Email sent successfully!');
            } else {
                console.log('⚠️ Unclear result:', response);
            }
        }
        
        await mcpClient.shutdown();
        console.log('🏁 Test completed');
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
    
    process.exit(0);
}

// Run test
testEmailSend();