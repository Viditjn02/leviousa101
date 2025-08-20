#!/usr/bin/env node

/**
 * Generate Authentication URLs for All Paragon Services
 * This will show the user what services need authentication
 */

const MCPClient = require('./src/features/invisibility/mcp/MCPClient');

async function generateAuthUrls() {
    console.log('🔐 PARAGON AUTHENTICATION STATUS CHECK');
    console.log('=====================================\n');
    
    let mcpClient;
    const testUserId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
    const services = ['gmail', 'linkedin', 'googlecalendar', 'calendly'];
    
    try {
        console.log('🚀 Initializing MCP Client...');
        mcpClient = new MCPClient();
        await mcpClient.initialize();
        console.log('✅ MCP Client initialized\n');
        
        console.log(`👤 User ID: ${testUserId}\n`);
        
        // First check authenticated services
        console.log('🔍 Checking currently authenticated services...');
        try {
            const authResult = await mcpClient.invokeTool('get_authenticated_services', {
                user_id: testUserId
            });
            
            if (authResult.content && authResult.content[0]) {
                const response = JSON.parse(authResult.content[0].text);
                console.log('📊 Current Authentication Status:');
                console.log(JSON.stringify(response, null, 2));
                console.log('');
            }
        } catch (error) {
            console.log('❌ Could not check authenticated services:', error.message);
            console.log('');
        }
        
        // Generate auth URLs for each service
        console.log('🔗 Generating authentication URLs for all services...\n');
        
        for (const service of services) {
            console.log(`🔹 ${service.toUpperCase()}`);
            console.log('='.repeat(service.length + 3));
            
            try {
                const connectResult = await mcpClient.invokeTool('connect_service', {
                    service: service,
                    user_id: testUserId,
                    redirectUrl: `http://localhost:3001/integrations?userId=${testUserId}`
                });
                
                if (connectResult.content && connectResult.content[0]) {
                    const response = JSON.parse(connectResult.content[0].text);
                    
                    if (response.success && response.authUrl) {
                        console.log(`✅ Auth URL generated: ${response.authUrl}`);
                    } else if (response.error) {
                        console.log(`❌ Error: ${response.error}`);
                    } else {
                        console.log(`⚠️ Unexpected response:`, response);
                    }
                } else {
                    console.log('❌ No response content');
                }
                
            } catch (error) {
                console.log(`❌ Failed to generate URL: ${error.message}`);
            }
            
            console.log('');
        }
        
        console.log('📋 SUMMARY');
        console.log('==========');
        console.log('1. Visit each authentication URL above');
        console.log('2. Complete the OAuth flow for each service');
        console.log('3. You will be redirected back to the integrations page');
        console.log('4. Once authenticated, the services will work in your app');
        console.log('');
        console.log('🌐 You can also use the web interface:');
        console.log(`   http://localhost:3001/integrations?userId=${testUserId}`);
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
    } finally {
        if (mcpClient) {
            await mcpClient.shutdown();
        }
    }
}

// Run the test
generateAuthUrls().catch(console.error);