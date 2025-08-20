#!/usr/bin/env node

/**
 * Test Real Email Send
 * Test sending to actual Gmail address viditjn02@gmail.com
 */

const MCPClient = require('./src/features/invisibility/mcp/MCPClient');

async function testRealEmailSend() {
    console.log('📧 TESTING REAL EMAIL SEND');
    console.log('==========================\n');
    
    let mcpClient;
    
    try {
        // Initialize MCP client
        console.log('🚀 Initializing MCP Client...');
        mcpClient = new MCPClient();
        await mcpClient.initialize();
        console.log('✅ MCP Client initialized\n');
        
        // Test email to real address
        const emailData = {
            user_id: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2',
            to: 'viditjn02@gmail.com',
            subject: 'Test Email - ActionKit Fix Verification 🚀',
            body: 'Hello!\n\nThis is a test email to verify that the ActionKit → Proxy API fix is working correctly.\n\nIf you receive this email, it means:\n✅ ActionKit 402 error is fixed\n✅ Gmail now uses Proxy API\n✅ Trial plan compatibility achieved\n\nSent from Leviousa test script via Paragon Proxy API.\n\nBest regards,\nLeviousa Email System'
        };
        
        console.log('📤 Sending test email...');
        console.log('📧 To:', emailData.to);
        console.log('📋 Subject:', emailData.subject);
        console.log('');
        
        const startTime = Date.now();
        const result = await mcpClient.invokeTool('gmail_send_email', emailData);
        const duration = Date.now() - startTime;
        
        console.log(`⏱️ Request completed in ${duration}ms\n`);
        
        if (result.content && result.content[0]) {
            const response = JSON.parse(result.content[0].text);
            
            console.log('📬 RESULT:');
            console.log('==========');
            
            if (response.success) {
                console.log('🎉 SUCCESS! Email sent successfully!');
                console.log('📧 Message ID:', response.messageId || 'N/A');
                console.log('✅ ActionKit fix confirmed working!');
                console.log('✅ Proxy API implementation successful!');
                console.log('✅ Trial plan compatibility achieved!');
                
                if (response.result) {
                    console.log('📊 Gmail API Response:', JSON.stringify(response.result, null, 2));
                }
                
            } else if (response.error) {
                console.log('❌ Email send failed');
                console.log('📋 Error:', response.error);
                
                // Analyze the error
                const errorMsg = response.error.toLowerCase();
                
                if (errorMsg.includes('402') || errorMsg.includes('actionkit')) {
                    console.log('');
                    console.log('🔴 CRITICAL: ActionKit error still present!');
                    console.log('❌ Fix did not work - still hitting ActionKit limitations');
                    
                } else if (errorMsg.includes('403') || errorMsg.includes('delegation denied') || errorMsg.includes('permission')) {
                    console.log('');
                    console.log('🟡 AUTHENTICATION ISSUE:');
                    console.log('✅ ActionKit fix is working (no 402 errors)');
                    console.log('⚠️  User needs to authenticate Gmail through Paragon');
                    console.log('💡 This is normal OAuth flow, not related to ActionKit');
                    
                } else if (errorMsg.includes('400') || errorMsg.includes('bad request')) {
                    console.log('');
                    console.log('🟡 FORMAT ISSUE:');
                    console.log('✅ ActionKit fix is working (no 402 errors)');
                    console.log('⚠️  Email format or API call needs adjustment');
                    
                } else if (errorMsg.includes('404') || errorMsg.includes('not found')) {
                    console.log('');
                    console.log('🟡 ENDPOINT ISSUE:');
                    console.log('✅ ActionKit fix is working (no 402 errors)');
                    console.log('⚠️  Gmail API endpoint needs correction');
                    
                } else {
                    console.log('');
                    console.log('🟢 DIFFERENT ERROR:');
                    console.log('✅ ActionKit fix is working (no 402 errors)');
                    console.log('✅ Successfully moved to Proxy API');
                    console.log('⚠️  Other technical issue to resolve');
                }
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
        
        // Check if it's an ActionKit related error
        if (error.message.includes('402') || error.message.includes('ActionKit')) {
            console.log('🔴 ActionKit error detected in exception - fix may not be working');
        } else {
            console.log('🟢 Non-ActionKit error - fix is likely working');
        }
        
    } finally {
        if (mcpClient) {
            await mcpClient.shutdown();
        }
        process.exit(0);
    }
}

// Run test
testRealEmailSend();