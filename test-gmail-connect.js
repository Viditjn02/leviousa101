#!/usr/bin/env node

/**
 * Generate Gmail Connection URL
 * Create authentication URL for user to connect Gmail
 */

const MCPClient = require('./src/features/invisibility/mcp/MCPClient');

async function connectGmail() {
    console.log('🔗 GMAIL CONNECTION SETUP');
    console.log('=========================\n');
    
    let mcpClient;
    
    try {
        // Initialize MCP client
        console.log('🚀 Initializing MCP Client...');
        mcpClient = new MCPClient();
        await mcpClient.initialize();
        console.log('✅ MCP Client initialized\n');
        
        const testUserId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
        
        console.log('🔗 Generating Gmail connection URL...');
        console.log(`👤 User ID: ${testUserId}`);
        console.log('');
        
        // Generate connection URL for Gmail
        const connectResult = await mcpClient.invokeTool('connect_service', {
            service: 'gmail',
            user_id: testUserId,
            redirectUrl: 'http://localhost:3000/auth/success' // Optional redirect
        });
        
        console.log('📊 Connection Result:');
        console.log('=====================');
        
        if (connectResult.content && connectResult.content[0]) {
            const response = JSON.parse(connectResult.content[0].text);
            
            if (response.error) {
                console.log('❌ Error generating connection URL:', response.error);
                
                if (response.error.includes('401')) {
                    console.log('🔴 JWT Token Issue: Paragon rejects our authentication');
                    console.log('💡 Check: Project ID, signing key, public key in Paragon dashboard');
                } else if (response.error.includes('404')) {
                    console.log('🔴 Service Issue: Gmail integration not available');
                }
            } else if (response.authUrl || response.auth_url || response.url) {
                const authUrl = response.authUrl || response.auth_url || response.url;
                console.log('✅ Gmail connection URL generated successfully!');
                console.log('');
                console.log('🔗 AUTHENTICATION URL:');
                console.log('======================');
                console.log(authUrl);
                console.log('');
                console.log('📋 INSTRUCTIONS:');
                console.log('1. Open the URL above in a web browser');
                console.log('2. Sign in with the Gmail account you want to connect');
                console.log('3. Grant permissions to access Gmail');
                console.log('4. After successful authentication, Gmail tools will be available');
                console.log('');
                console.log('⚠️  IMPORTANT: The user MUST complete this OAuth flow');
                console.log('   before Gmail send/get emails will work!');
                console.log('');
                console.log('🔄 After authentication, re-run email tests to verify');
                
            } else {
                console.log('⚠️  Unexpected response format');
                console.log('📋 Full response:', JSON.stringify(response, null, 2));
            }
        } else {
            console.log('❓ No response content received');
        }
        
    } catch (error) {
        console.log('❌ CONNECT FAILED:', error.message);
        
        if (error.message.includes('401')) {
            console.log('🔴 JWT Authentication Issue: Paragon rejects our tokens');
            console.log('💡 Check: Project ID, signing key, public key in Paragon dashboard');
        }
    } finally {
        if (mcpClient) {
            await mcpClient.shutdown();
        }
        console.log('');
        console.log('🏁 Gmail connection setup completed');
    }
}

// Run connection setup
connectGmail();