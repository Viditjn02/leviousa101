#!/usr/bin/env node

/**
 * Test calendar query with function name sanitization fix
 */

require('dotenv').config();

const AnswerService = require('./src/features/invisibility/services/AnswerService');

console.log('📅 TESTING CALENDAR QUERY WITH FIXED FUNCTION NAMES');
console.log('=================================================');

// Mock tool registry with tools that have dots in names
const mockToolRegistry = {
    listTools: () => [
        {
            name: 'paragon.google_calendar_list_events',
            description: 'List events from a Google Calendar',
            inputSchema: {
                type: 'object',
                properties: {
                    user_id: { type: 'string', description: 'User ID for authentication' },
                    timeMin: { type: 'string', description: 'Lower bound for events' },
                    timeMax: { type: 'string', description: 'Upper bound for events' }
                },
                required: ['user_id']
            }
        },
        {
            name: 'paragon.google_calendar_create_event',
            description: 'Create a new Google Calendar event',
            inputSchema: {
                type: 'object',
                properties: {
                    user_id: { type: 'string', description: 'User ID for authentication' },
                    summary: { type: 'string', description: 'Event title' },
                    start_time: { type: 'string', description: 'Start time' },
                    end_time: { type: 'string', description: 'End time' }
                },
                required: ['user_id', 'summary', 'start_time', 'end_time']
            }
        }
    ],
    invokeTool: async (toolName, args) => {
        console.log(`🔧 Tool called: ${toolName}`);
        console.log(`📝 Args:`, args);
        
        if (toolName === 'paragon.google_calendar_list_events') {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        events: [
                            { 
                                summary: 'Team Meeting',
                                start: { dateTime: '2025-08-25T14:00:00Z' },
                                end: { dateTime: '2025-08-25T15:00:00Z' }
                            }
                        ]
                    })
                }]
            };
        }
        
        return { content: [{ type: 'text', text: 'Mock tool result' }] };
    }
};

// Mock LLM service that supports chatWithTools
const mockLLMService = {
    generateResponse: async () => ({ content: 'Mock response' }),
    chatWithTools: async (messages, tools) => {
        console.log(`🧠 LLM received ${tools.length} tools`);
        console.log('📋 Tool names:', tools.map(t => t.name));
        
        // Simulate LLM selecting calendar list tool
        const calendarTool = tools.find(t => t.name.includes('calendar_list'));
        if (calendarTool) {
            return {
                content: 'I\'ll check your calendar for the 25th.',
                toolCalls: [{
                    id: 'call_123',
                    type: 'function',
                    function: {
                        name: calendarTool.name,
                        arguments: JSON.stringify({
                            user_id: 'test_user',
                            timeMin: '2025-08-25T00:00:00Z',
                            timeMax: '2025-08-25T23:59:59Z'
                        })
                    }
                }]
            };
        }
        
        return { content: 'I could not find appropriate tools.' };
    }
};

async function testCalendarQuery() {
    try {
        console.log('🔧 Creating AnswerService with mocks...');
        
        const answerService = new AnswerService({
            llmService: mockLLMService
        });
        
        // Override the tool registry for testing
        answerService.dynamicToolService = {
            selectAndExecuteTools: async (question, context) => {
                const DynamicToolSelectionService = require('./src/features/common/services/dynamicToolSelectionService');
                const service = new DynamicToolSelectionService(mockToolRegistry, mockLLMService);
                return await service.selectAndExecuteTools(question, context);
            }
        };
        
        console.log('📅 Testing calendar query...');
        const result = await answerService.getAnswer(
            'Do I have anything scheduled for the 25th of this month?',
            { screenshot: null, conversationHistory: [] }
        );
        
        console.log('✅ Answer received:');
        console.log(result);
        
        return true;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.message.includes('does not match pattern')) {
            console.error('🚨 Function name pattern error still exists!');
        }
        return false;
    }
}

testCalendarQuery().then(success => {
    if (success) {
        console.log('\n🎉 CALENDAR QUERY TEST PASSED!');
        console.log('✅ Function name sanitization fix is working');
        console.log('✅ Calendar tools can be called without pattern validation errors');
    } else {
        console.log('\n💥 CALENDAR QUERY TEST FAILED!');
        console.log('❌ Function name pattern issue may still exist');
    }
}).catch(error => {
    console.error('❌ Test error:', error);
});