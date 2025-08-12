#!/usr/bin/env node

/**
 * Notion MCP Debug Tool
 * Tests the complete flow from question detection to MCP tool calling
 */

const path = require('path');

// Set up paths for require
const srcPath = path.join(__dirname, '..', 'src');
process.chdir(path.join(__dirname, '..'));

async function debugNotionMCP() {
    console.log('🔍 Debugging Notion MCP Flow...\n');
    
    try {
        // Step 1: Test Question Classification
        console.log('=== Step 1: Question Classification Test ===');
        const AskService = require(path.join(srcPath, 'features/ask/askService'));
        const askService = new AskService();
        
        const testQuestions = [
            "What do you see in my notion?",
            "Show me my notion pages",
            "What's in my notion workspace?",
            "List my notion databases",
            "What notion content do I have?",
            "Check my notion data"
        ];
        
        console.log('Testing question classification:');
        testQuestions.forEach(question => {
            const type = askService.classifyQuestionType(question);
            console.log(`  "${question}" → ${type}`);
        });
        console.log();
        
        // Step 2: Test MCP Client Access
        console.log('=== Step 2: MCP Client Access Test ===');
        
        // Simulate global invisibility service (as it would exist in real app)
        if (!global.invisibilityService) {
            console.log('❌ Global invisibility service not found (expected in test)');
            console.log('   This would be initialized in the main app');
        } else {
            console.log('✅ Global invisibility service found');
            
            if (global.invisibilityService.mcpClient) {
                console.log('✅ MCP client exists in invisibility service');
                console.log(`   Initialized: ${global.invisibilityService.mcpClient.isInitialized}`);
                
                if (global.invisibilityService.mcpClient.isInitialized) {
                    const serverStatus = global.invisibilityService.mcpClient.getServerStatus();
                    console.log(`   Connected servers: ${Object.keys(serverStatus.servers).length}`);
                    console.log(`   Available tools: ${global.invisibilityService.mcpClient.externalTools.length}`);
                    
                    // Check Notion specifically
                    const notionServer = serverStatus.servers.notion;
                    if (notionServer) {
                        console.log(`   Notion status: authenticated=${notionServer.authenticated}, connected=${notionServer.connected}`);
                        console.log(`   Notion tools: ${notionServer.tools ? notionServer.tools.length : 0}`);
                    } else {
                        console.log('   ❌ Notion server not found in server status');
                    }
                }
            } else {
                console.log('❌ MCP client not found in invisibility service');
            }
        }
        console.log();
        
        // Step 3: Test MCP Config
        console.log('=== Step 3: MCP Configuration Test ===');
        const MCPConfigManager = require(path.join(srcPath, 'config/mcpConfig'));
        const configManager = new MCPConfigManager();
        
        try {
            await configManager.initialize();
            console.log('✅ MCP Config Manager initialized');
            
            // Check Notion credentials
            const hasNotionCredentials = configManager.hasOAuthClientCredentials('notion');
            console.log(`   Notion OAuth credentials: ${hasNotionCredentials ? '✅ Present' : '❌ Missing'}`);
            
            const hasNotionToken = await configManager.getValidAccessToken('notion', 'read');
            console.log(`   Notion access token: ${hasNotionToken ? '✅ Valid' : '❌ Missing/Invalid'}`);
            
        } catch (error) {
            console.log('❌ MCP Config Manager failed to initialize:', error.message);
        }
        console.log();
        
        // Step 4: Test MCP Server Manager
        console.log('=== Step 4: MCP Server Manager Test ===');
        const MCPServerManager = require(path.join(srcPath, 'features/invisibility/mcpServerManager'));
        const serverManager = new MCPServerManager();
        
        const availableServers = serverManager.getAllAvailableServers();
        console.log(`   Available server configs: ${availableServers.length}`);
        
        const notionConfig = serverManager.availableServers.notion;
        if (notionConfig) {
            console.log('✅ Notion server configuration found:');
            console.log(`   Command: ${notionConfig.command}`);
            console.log(`   Args: ${notionConfig.args.join(' ')}`);
            console.log(`   Tools: ${notionConfig.tools.join(', ')}`);
        } else {
            console.log('❌ Notion server configuration not found');
        }
        console.log();
        
        // Step 5: Recommendations
        console.log('=== Step 5: Recommendations ===');
        console.log('Based on the test results:');
        
        // Check what needs to be fixed
        if (!global.invisibilityService) {
            console.log('🔧 Start the main application to initialize the invisibility service');
        } else if (!global.invisibilityService.mcpClient?.isInitialized) {
            console.log('🔧 MCP client needs to be initialized in the invisibility service');
        } else {
            const mcpClient = global.invisibilityService.mcpClient;
            const serverStatus = mcpClient.getServerStatus();
            const notionServer = serverStatus.servers.notion;
            
            if (!notionServer) {
                console.log('🔧 Notion server not configured - check OAuth setup in .env file');
                console.log('   Required: NOTION_CLIENT_ID and NOTION_CLIENT_SECRET');
            } else if (!notionServer.authenticated) {
                console.log('🔧 Notion not authenticated - complete OAuth flow in settings');
            } else if (!notionServer.connected) {
                console.log('🔧 Notion MCP server not running - try restarting the connection');
            } else if (!notionServer.tools || notionServer.tools.length === 0) {
                console.log('🔧 Notion MCP server has no tools - check server startup logs');
            } else {
                console.log('✅ Everything looks good! Try a Notion question in the ask bar');
                console.log('   Example: "What do you see in my notion?"');
            }
        }
        
    } catch (error) {
        console.error('❌ Debug script failed:', error);
        console.error(error.stack);
    }
}

// Step 6: Interactive Test Function
async function testNotionMCPFlow() {
    console.log('\n=== Step 6: Interactive Notion MCP Test ===');
    
    if (!global.invisibilityService?.mcpClient?.isInitialized) {
        console.log('❌ Cannot run interactive test - MCP client not available');
        return;
    }
    
    const mcpClient = global.invisibilityService.mcpClient;
    
    try {
        console.log('Testing MCP debug functionality...');
        const debugInfo = await mcpClient.performMCPDebugTest();
        console.log('Debug test results:', debugInfo.substring(0, 500) + '...');
        
        console.log('\nTesting Notion data access...');
        const testQuestion = {
            text: "What do you see in my notion?",
            type: "notion_data_access",
            confidence: 90
        };
        
        const serviceData = await mcpClient.accessServiceData(testQuestion);
        if (serviceData) {
            console.log('✅ Notion data access successful:', serviceData.substring(0, 200) + '...');
        } else {
            console.log('❌ Notion data access failed - no data returned');
        }
        
    } catch (error) {
        console.error('❌ Interactive test failed:', error.message);
    }
}

// Export for use in main app or run standalone
if (require.main === module) {
    debugNotionMCP().then(() => {
        console.log('\n🔍 Debug complete! Run this script from the main app for full testing.');
    });
} else {
    module.exports = { debugNotionMCP, testNotionMCPFlow };
} 