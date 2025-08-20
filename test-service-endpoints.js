#!/usr/bin/env node

/**
 * Test script to verify all service endpoints work correctly with LLM
 * Tests LinkedIn, Notion, Calendly, and Google Calendar integrations
 */

const readline = require('readline');

// Test prompts for different services
const testCases = {
    linkedin: [
        "Show me my LinkedIn profile",
        "Get my LinkedIn connections", 
        "Create a LinkedIn post saying 'Testing my integration!'",
    ],
    notion: [
        "Search for pages in my Notion workspace",
        "Create a new page in Notion titled 'Test Page'",
    ],
    calendly: [
        "Show me my Calendly event types",
        "Get my scheduled Calendly events",
        "What are my available time slots this week?",
    ],
    googleCalendar: [
        "List my Google Calendar events for today",
        "Create a Google Calendar event for tomorrow at 3pm titled 'Test Meeting'",
        "Get details for my next calendar event",
    ]
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log('🧪 Service Endpoint Testing Script');
    console.log('=====================================\n');
    
    console.log('This script will help you test different service endpoints.');
    console.log('Make sure your Leviousa app is running and services are authenticated.\n');
    
    console.log('Available test cases:\n');
    
    Object.entries(testCases).forEach(([service, tests]) => {
        console.log(`📋 ${service.toUpperCase()}:`);
        tests.forEach((test, idx) => {
            console.log(`   ${idx + 1}. "${test}"`);
        });
        console.log('');
    });
    
    console.log('📝 Instructions:');
    console.log('1. Copy and paste these test prompts into your Leviousa ask bar');
    console.log('2. Observe the responses and check if they contain actual data');
    console.log('3. Look for these issues:');
    console.log('   - Generic "No events found" responses for non-calendar tools');
    console.log('   - Missing data formatting (raw JSON instead of readable text)');
    console.log('   - Tool execution failures or timeouts');
    console.log('   - Incorrect service identification\n');
    
    console.log('🔍 What to verify:');
    console.log('✅ LinkedIn: Should show actual profile data, connections, post confirmation');
    console.log('✅ Notion: Should show actual pages, create confirmation');
    console.log('✅ Calendly: Should show event types, scheduled events, availability');
    console.log('✅ Google Calendar: Should show events, create confirmation, event details\n');
    
    console.log('❌ Bad responses:');
    console.log('- "No events found for that date/time. Checked both Google Calendar and Calendly"');
    console.log('- "Tool execution completed" (without actual data)');
    console.log('- Raw JSON dumps without formatting');
    console.log('- Error messages about tool failures\n');
    
    rl.question('Press Enter when you\'re ready to start testing, or type "exit" to quit: ', (answer) => {
        if (answer.toLowerCase() === 'exit') {
            rl.close();
            return;
        }
        
        console.log('\n🚀 Start testing! Use the prompts above in your Leviousa app.');
        console.log('Report any issues you find.\n');
        rl.close();
    });
}

main().catch(console.error);

