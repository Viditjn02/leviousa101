#!/usr/bin/env node

/**
 * Test Gmail Get Emails to see if the working method actually works
 */

const MCPClient = require('./src/features/invisibility/mcp/MCPClient');

async function testGmailGetEmails() {
    console.log('📧 TESTING GMAIL GET EMAILS');
    console.log('============================\n');
    
    let mcpClient;
    
    try {
        // Initialize MCP client
        console.log('🚀 Initializing MCP Client...');
        mcpClient = new MCPClient();
        await mcpClient.initialize();
        console.log('✅ MCP Client initialized\n');
        
        // Test Gmail get emails
        const emailData = {
            user_id: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2',
            maxResults: 5
        };
        
        console.log('📤 Getting emails...', { userId: emailData.user_id, maxResults: emailData.maxResults });
        
        const startTime = Date.now();
        const result = await mcpClient.invokeTool('gmail_get_emails', emailData);
        const duration = Date.now() - startTime;
        
        console.log(`⏱️ Request completed in ${duration}ms\n`);
        
        if (result.content && result.content[0]) {
            const response = JSON.parse(result.content[0].text);
            
            console.log('📬 RESULT:');
            console.log('==========');
            
            if (response.error) {
                console.log('❌ Get emails failed:', response.error);
                
                // Check what type of error
                if (response.error.includes('403') || response.error.includes('Delegation denied')) {
                    console.log('🟡 Authentication issue: User not authenticated with Gmail');
                } else if (response.error.includes('401')) {
                    console.log('🟡 401 Unauthorized');
                } else {
                    console.log('🔴 Other error');
                }
            } else if (response.messages || response.success) {
                console.log('✅ Get emails successful!');
                console.log('📊 Response:', JSON.stringify(response, null, 2));
            } else {
                console.log('⚠️ Unclear result:', response);
            }
        } else {
            console.log('❓ No response content received');
        }
        
        console.log('');
        console.log('========================');
        console.log('🏁 TEST COMPLETED');
        console.log('========================');
        
    } catch (error) {
        console.log('❌ TEST FAILED:', error.message);
    } finally {
        if (mcpClient) {
            await mcpClient.shutdown();
        }
        process.exit(0);
    }
}

// Run test
testGmailGetEmails();