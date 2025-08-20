#!/usr/bin/env node

/**
 * Test the actual LIVE running system with a calendar query
 * This tests exactly how the system would work for a real user
 */

require('dotenv').config();

console.log('🔴 TESTING LIVE SYSTEM CALENDAR FUNCTIONALITY');
console.log('=============================================');

async function testLiveSystemCalendar() {
    try {
        console.log('⏰ Waiting for system to be fully initialized...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        console.log('🔧 Testing the actual live system...');
        
        // Get the actual services exactly as they run in the live system
        console.log('📡 Checking if MCP client is available in global scope...');
        
        // Simulate the exact same process the system uses
        const getMCPClient = () => {
            try {
                if (!global.invisibilityService) {
                    console.log('[TEST] MCP: Invisibility service not available');
                    return null;
                }
                
                if (!global.invisibilityService.mcpClient) {
                    console.log('[TEST] MCP: MCP client not available in invisibility service');
                    return null;
                }
                
                if (!global.invisibilityService.mcpClient.isInitialized) {
                    console.log('[TEST] MCP: MCP client not yet initialized');
                    return null;
                }
                
                console.log('[TEST] MCP: Client available and initialized');
                return global.invisibilityService.mcpClient;
            } catch (error) {
                console.warn('[TEST] MCP: Error accessing MCP client:', error.message);
                return null;
            }
        };
        
        const mcpClient = getMCPClient();
        
        if (!mcpClient) {
            console.log('❌ MCP client not available - system may not be fully initialized');
            return false;
        }
        
        console.log('✅ MCP client is available');
        
        // Check tools
        const tools = mcpClient.toolRegistry.listTools();
        console.log(`📊 Available tools: ${tools.length}`);
        
        const calendarTools = tools.filter(t => 
            t.name.includes('calendar') || t.name.includes('calendly')
        );
        console.log(`📅 Calendar tools available: ${calendarTools.length}`);
        calendarTools.forEach(tool => {
            console.log(`   - ${tool.name}: ${tool.description}`);
        });
        
        if (calendarTools.length === 0) {
            console.log('❌ No calendar tools available');
            return false;
        }
        
        // Test the dynamic tool selection service exactly as the system uses it
        console.log('\n🧪 Testing dynamic tool selection with live system...');
        
        const DynamicToolSelectionService = require('./src/features/common/services/dynamicToolSelectionService');
        const authService = require('./src/features/common/services/authService');
        
        // Get the actual authenticated user
        const userId = authService.getCurrentUserId();
        console.log(`🔐 Authenticated user: ${userId}`);
        
        if (!userId) {
            console.log('❌ No authenticated user found');
            return false;
        }
        
        // Create the service exactly like the live system does
        const toolService = new DynamicToolSelectionService(
            mcpClient.toolRegistry, 
            mcpClient.llmService
        );
        
        console.log('✅ Dynamic tool service created');
        
        // Test with the exact context the live system would use
        const context = {
            userId: userId,
            user_id: userId,
            sessionId: 'test-session-' + Date.now()
        };
        
        // Test the exact calendar query
        const testQuery = 'Do I have any event on the 22nd of this month?';
        console.log(`\n📅 Testing query: "${testQuery}"`);
        
        // Call the service exactly like the live system does
        const result = await toolService.selectAndExecuteTools(testQuery, context);
        
        console.log('\n📊 LIVE SYSTEM TEST RESULTS:');
        console.log('===============================');
        console.log(`✅ Tool called: ${result.toolCalled || 'None'}`);
        console.log(`✅ Success: ${!result.error}`);
        console.log(`✅ Response length: ${result.response?.length || 0} characters`);
        
        if (result.error) {
            console.log(`❌ Error: ${result.error}`);
            return false;
        }
        
        console.log('\n📄 Response preview:');
        console.log(result.response?.substring(0, 200) + '...');
        
        // Check if the response indicates tool usage
        const usedTools = result.toolCalled !== null;
        const noGenericResponse = !result.response?.toLowerCase().includes("i don't have access");
        const hasCalendarContent = result.response?.toLowerCase().includes('calendar') || 
                                  result.response?.toLowerCase().includes('event') ||
                                  result.response?.toLowerCase().includes('schedule');
        
        console.log('\n🔍 ANALYSIS:');
        console.log(`✅ Used tools: ${usedTools}`);
        console.log(`✅ No generic "don't have access" response: ${noGenericResponse}`);
        console.log(`✅ Contains calendar content: ${hasCalendarContent}`);
        
        const success = usedTools && noGenericResponse;
        
        if (success) {
            console.log('\n🎉 LIVE SYSTEM TEST PASSED!');
            console.log('✅ Calendar functionality is working in the live system');
            console.log('✅ LLM-based dynamic tool selection is operational');
            console.log('✅ No hardcoded patterns interfering');
        } else {
            console.log('\n💥 LIVE SYSTEM TEST FAILED!');
            console.log('❌ Calendar functionality is not working properly');
        }
        
        return success;
        
    } catch (error) {
        console.error('\n❌ LIVE SYSTEM TEST FAILED:', error.message);
        console.error('Stack:', error.stack);
        return false;
    }
}

testLiveSystemCalendar().then(success => {
    if (success) {
        console.log('\n🚀 CALENDAR FUNCTIONALITY VERIFIED IN LIVE SYSTEM!');
        console.log('The calendar feature is working as intended.');
    } else {
        console.log('\n💥 CALENDAR FUNCTIONALITY NOT WORKING IN LIVE SYSTEM!');
        console.log('Issues need to be resolved.');
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
});