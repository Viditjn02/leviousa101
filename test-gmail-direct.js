#!/usr/bin/env node

/**
 * Direct Gmail Test - Check actual response format
 */

const MCPClient = require('./src/features/invisibility/mcp/MCPClient');

async function testGmailDirect() {
    console.log('🧪 DIRECT GMAIL TEST');
    console.log('===================\n');
    
    let mcpClient;
    const testUserId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
    
    try {
        console.log('🚀 Initializing MCP Client...');
        mcpClient = new MCPClient();
        await mcpClient.initialize();
        console.log('✅ MCP Client initialized\n');
        
        console.log(`👤 Testing with User ID: ${testUserId}\n`);
        
        // Test Gmail Get Emails
        console.log('📧 Gmail - Get Emails (Raw Response)');
        console.log('=====================================');
        try {
            const emailsResult = await mcpClient.invokeTool('gmail_get_emails', {
                user_id: testUserId,
                maxResults: 3
            });
            
            if (emailsResult.content && emailsResult.content[0]) {
                const response = JSON.parse(emailsResult.content[0].text);
                console.log('📧 Raw Gmail Response:');
                console.log(JSON.stringify(response, null, 2));
                
                // Check various response formats
                if (response.success === true) {
                    console.log('✅ SUCCESS: Gmail is working with new format');
                    if (response.emails) {
                        console.log(`📬 Found ${response.emails.length} emails`);
                    } else if (response.total_results !== undefined) {
                        console.log(`📬 Total results: ${response.total_results}`);
                    }
                } else if (response.status === 200 && response.output) {
                    console.log('✅ SUCCESS: Gmail is working with status/output format');
                    if (response.output.messages) {
                        console.log(`📬 Found ${response.output.messages.length} messages`);
                    }
                } else {
                    console.log('❌ Unexpected Gmail response format');
                }
            }
        } catch (error) {
            console.log(`❌ Gmail test failed: ${error.message}`);
        }
        console.log('');
        
        // Test Gmail Send Email
        console.log('📨 Gmail - Send Email Test');
        console.log('==========================');
        try {
            const sendResult = await mcpClient.invokeTool('gmail_send_email', {
                user_id: testUserId,
                to: ['test@example.com'],
                subject: 'Test Email from Fixed Paragon MCP 🚀',
                body: 'This email confirms that Gmail integration is working correctly!'
            });
            
            if (sendResult.content && sendResult.content[0]) {
                const response = JSON.parse(sendResult.content[0].text);
                console.log('📨 Gmail Send Response:');
                console.log(JSON.stringify(response, null, 2));
                
                if (response.success === true) {
                    console.log('✅ SUCCESS: Gmail send is working!');
                } else {
                    console.log('❌ Gmail send failed');
                }
            }
        } catch (error) {
            console.log(`❌ Gmail send test failed: ${error.message}`);
        }
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
    } finally {
        if (mcpClient) {
            await mcpClient.shutdown();
        }
    }
}

// Run the test
testGmailDirect().catch(console.error);