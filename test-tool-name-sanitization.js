#!/usr/bin/env node

/**
 * Test tool name sanitization for function calling
 */

require('dotenv').config();

console.log('🧪 TESTING TOOL NAME SANITIZATION');
console.log('=================================');

// Import the dynamic tool selection service
const DynamicToolSelectionService = require('./src/features/common/services/dynamicToolSelectionService');

// Mock tool registry
const mockToolRegistry = {
    listTools: () => [
        {
            name: 'paragon.gmail_send_email',
            description: 'Send an email via Gmail',
            inputSchema: { type: 'object', properties: {} }
        },
        {
            name: 'paragon.google_calendar_create_event', 
            description: 'Create a Google Calendar event',
            inputSchema: { type: 'object', properties: {} }
        },
        {
            name: 'paragon.linkedin_get_profile',
            description: 'Get LinkedIn profile',
            inputSchema: { type: 'object', properties: {} }
        }
    ]
};

// Mock LLM provider
const mockLLMProvider = {
    chatWithTools: async (messages, tools) => {
        console.log('📋 Tools passed to LLM:');
        tools.forEach((tool, i) => {
            console.log(`   ${i + 1}. ${tool.name} - ${tool.description}`);
        });
        
        // Verify all tool names are valid for function calling
        const invalidNames = tools.filter(tool => !/^[a-zA-Z0-9_-]+$/.test(tool.name));
        if (invalidNames.length > 0) {
            console.log('❌ Invalid tool names found:', invalidNames.map(t => t.name));
            return { error: 'Invalid function names' };
        } else {
            console.log('✅ All tool names are valid for function calling');
        }
        
        return {
            content: 'Mock response',
            toolCalls: []
        };
    }
};

// Test the sanitization
async function testSanitization() {
    console.log('🔧 Creating DynamicToolSelectionService...');
    const service = new DynamicToolSelectionService(mockToolRegistry, mockLLMProvider);
    
    console.log('📝 Original tools from registry:');
    const originalTools = mockToolRegistry.listTools();
    originalTools.forEach((tool, i) => {
        console.log(`   ${i + 1}. ${tool.name} - ${tool.description}`);
    });
    
    console.log('\n🔄 Testing sanitization method...');
    const { sanitizedTools, toolNameMapping } = service.sanitizeToolsForFunctionCalling(originalTools);
    
    console.log('✨ Sanitized tools:');
    sanitizedTools.forEach((tool, i) => {
        console.log(`   ${i + 1}. ${tool.name} - ${tool.description}`);
    });
    
    console.log('\n🗺️ Tool name mapping:');
    for (const [sanitized, original] of toolNameMapping.entries()) {
        console.log(`   ${sanitized} → ${original}`);
    }
    
    console.log('\n🧪 Testing complete integration...');
    try {
        await service.selectAndExecuteTools('Test message', { screenData: 'mock' });
        console.log('✅ Integration test passed');
    } catch (error) {
        console.log('❌ Integration test failed:', error.message);
    }
}

testSanitization().then(() => {
    console.log('\n🎉 TOOL NAME SANITIZATION TEST COMPLETE!');
    console.log('The fix should resolve the function name pattern validation error.');
}).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});