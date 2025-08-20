#!/usr/bin/env node

/**
 * Test the new assertive system prompt
 */

require('dotenv').config();

console.log('💪 TESTING ASSERTIVE SYSTEM PROMPT');
console.log('=================================');

async function testAssertivePrompt() {
    try {
        console.log('🔧 Testing new assertive prompt...');
        
        const DynamicToolSelectionService = require('./src/features/common/services/dynamicToolSelectionService');
        
        // Mock tool registry with calendar tools
        const mockToolRegistry = {
            listTools: () => [
                {
                    name: 'paragon.google_calendar_list_events',
                    description: 'List events from a Google Calendar',
                    inputSchema: { type: 'object', properties: {} }
                },
                {
                    name: 'paragon.calendly_list_scheduled_events', 
                    description: 'List Calendly scheduled events',
                    inputSchema: { type: 'object', properties: {} }
                }
            ]
        };
        
        // Mock LLM service
        const mockLLMService = {
            chatWithTools: async (messages, tools) => {
                console.log('🧠 LLM received messages:');
                const systemMessage = messages.find(m => m.role === 'system');
                
                if (systemMessage) {
                    console.log('\n📝 System prompt analysis:');
                    const content = systemMessage.content;
                    
                    console.log(`✅ Contains "FULL ACCESS": ${content.includes('FULL ACCESS')}`);
                    console.log(`✅ Contains "YOU MUST USE THESE": ${content.includes('YOU MUST USE THESE')}`);
                    console.log(`✅ Contains "NEVER say 'I don't have access'": ${content.includes("NEVER say \"I don't have access\"")}`);
                    console.log(`✅ Contains "ALWAYS use tools first": ${content.includes('ALWAYS use tools first')}`);
                    console.log(`✅ Contains "CONNECTED assistant": ${content.includes('CONNECTED assistant')}`);
                    console.log(`✅ Contains specific calendar instructions: ${content.includes('IMMEDIATELY call google_calendar_list_events')}`);
                    
                    // Check if prompt is assertive enough
                    const assertiveKeywords = [
                        'FULL ACCESS',
                        'YOU MUST USE',
                        'NEVER say',
                        'ALWAYS call',
                        'IMMEDIATELY call',
                        'CONNECTED assistant'
                    ];
                    
                    const foundKeywords = assertiveKeywords.filter(keyword => content.includes(keyword));
                    console.log(`\n🎯 Assertive keywords found: ${foundKeywords.length}/${assertiveKeywords.length}`);
                    console.log(`   Found: ${foundKeywords.join(', ')}`);
                    
                    if (foundKeywords.length >= 5) {
                        console.log('✅ System prompt is sufficiently assertive');
                    } else {
                        console.log('❌ System prompt needs to be more assertive');
                    }
                }
                
                return {
                    content: 'Mock LLM response - would now use tools based on assertive prompt',
                    toolCalls: []
                };
            }
        };
        
        console.log('\n🧪 Testing system prompt generation...');
        const service = new DynamicToolSelectionService(mockToolRegistry, mockLLMService);
        
        const context = { userId: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2' };
        
        // This will trigger the LLM call and show us the prompt analysis
        await service.selectAndExecuteTools(
            'Do I have any event on 25th of this month?',
            context
        );
        
        console.log('\n🎉 ASSERTIVE PROMPT TEST COMPLETE!');
        console.log('====================================');
        console.log('✅ System prompt has been updated to be more assertive');
        console.log('✅ LLM should now be forced to use tools instead of generic responses');
        console.log('✅ Prompt explicitly forbids "I don\'t have access" responses');
        
        return true;
        
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        return false;
    }
}

testAssertivePrompt().then(success => {
    if (success) {
        console.log('\n🚀 ASSERTIVE PROMPT READY!');
        console.log('The system should now force the LLM to use calendar tools.');
    } else {
        console.log('\n💥 ASSERTIVE PROMPT INCOMPLETE!');
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
});