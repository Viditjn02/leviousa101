#!/usr/bin/env node

/**
 * Debug the actual calendar flow to see why it's not working
 */

require('dotenv').config();

console.log('🔍 DEBUGGING CALENDAR FLOW');
console.log('==========================');

async function debugCalendarFlow() {
    try {
        console.log('🔧 Checking dynamic tool classification...');
        
        // Import the actual services
        const askService = require('./src/features/ask/askService');
        
        // Test the classification
        const testMessage = "Do I have any event on 25th of this month?";
        console.log(`📅 Testing message: "${testMessage}"`);
        
        // Check if isDynamicToolRequest returns true
        const isDynamicTool = await askService.isDynamicToolRequest(testMessage);
        console.log(`✅ isDynamicToolRequest result: ${isDynamicTool}`);
        
        if (!isDynamicTool) {
            console.log('❌ PROBLEM: Message not classified as dynamic tool request');
            return false;
        }
        
        // Check classification
        const questionType = await askService.classifyQuestionType(testMessage);
        console.log(`🎯 Question type: ${questionType}`);
        
        if (questionType !== 'dynamic_tool_request') {
            console.log('❌ PROBLEM: Message not classified correctly');
            return false;
        }
        
        // Check if dynamic tool service can be initialized
        const toolService = askService.initializeDynamicToolService();
        if (!toolService) {
            console.log('❌ PROBLEM: Dynamic tool service cannot be initialized');
            return false;
        }
        
        console.log('✅ Dynamic tool service initialized');
        
        // Check available tools
        const toolCount = toolService.getAvailableToolCount();
        console.log(`📊 Available tools: ${toolCount}`);
        
        if (toolCount === 0) {
            console.log('❌ PROBLEM: No tools available');
            return false;
        }
        
        console.log('\n🧪 Testing system prompt generation...');
        const DynamicToolSelectionService = require('./src/features/common/services/dynamicToolSelectionService');
        
        // Get MCP client
        const getMCPClient = () => {
            if (!global.invisibilityService?.mcpClient?.isInitialized) {
                return null;
            }
            return global.invisibilityService.mcpClient;
        };
        
        const mcpClient = getMCPClient();
        if (!mcpClient) {
            console.log('❌ PROBLEM: MCP client not available');
            return false;
        }
        
        const tools = mcpClient.toolRegistry.listTools();
        console.log(`🔧 MCP tools available: ${tools.length}`);
        
        // Test system prompt generation
        const testService = new DynamicToolSelectionService(mcpClient.toolRegistry, mcpClient.llmService);
        const context = { userId: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2' };
        const systemPrompt = testService.buildToolSelectionPrompt(tools, context);
        
        console.log('\n📝 System prompt (first 500 chars):');
        console.log(systemPrompt.substring(0, 500) + '...');
        
        // Check if system prompt mentions calendar tools
        const hasCalendarTools = systemPrompt.includes('google_calendar') || systemPrompt.includes('calendly');
        console.log(`✅ System prompt includes calendar tools: ${hasCalendarTools}`);
        
        // Check if system prompt has correct date
        const hasCorrectYear = systemPrompt.includes('2025');
        console.log(`✅ System prompt has correct year: ${hasCorrectYear}`);
        
        // Check if system prompt has user ID
        const hasUserId = systemPrompt.includes('vqLrzGnqajPGlX9Wzq89SgqVPsN2');
        console.log(`✅ System prompt has user ID: ${hasUserId}`);
        
        console.log('\n🎉 FLOW ANALYSIS COMPLETE');
        console.log('===========================');
        
        if (!hasCalendarTools || !hasCorrectYear || !hasUserId) {
            console.log('❌ ISSUE: System prompt is missing required information');
            return false;
        }
        
        console.log('✅ All components appear to be working correctly');
        console.log('🔍 The issue might be in the LLM response or tool execution');
        
        return true;
        
    } catch (error) {
        console.error('\n❌ DEBUG FAILED:', error.message);
        console.error('Stack:', error.stack);
        return false;
    }
}

// Wait a moment for the system to be fully initialized
setTimeout(() => {
    debugCalendarFlow().then(success => {
        if (success) {
            console.log('\n🚀 FLOW DEBUG COMPLETE!');
            console.log('The dynamic tool system appears to be set up correctly.');
            console.log('The issue might be in the LLM decision-making or tool execution phase.');
        } else {
            console.log('\n💥 FLOW DEBUG FOUND ISSUES!');
            console.log('There are problems in the dynamic tool flow that need to be fixed.');
        }
    }).catch(error => {
        console.error('❌ Debug error:', error);
    });
}, 3000); // Wait 3 seconds for system initialization