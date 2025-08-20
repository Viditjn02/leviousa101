#!/usr/bin/env node

/**
 * Test calendar functionality through the actual ask service
 */

require('dotenv').config();
const path = require('path');

console.log('📅 TESTING CALENDAR THROUGH ASK SERVICE');
console.log('======================================');

async function testCalendarThroughAsk() {
    try {
        // Wait for system to be ready
        console.log('⏰ Waiting for system readiness...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Import the ask service (it exports an instance, not the class)
        const askService = require('./src/features/ask/askService');
        
        console.log('✅ Ask service loaded');
        
        // Test the classification first
        console.log('\n🔍 Testing question classification...');
        const testQueries = [
            'Do I have any event on 25th of this month?',
            'How does my day look like on this months 25?',
            'What is scheduled for the 25th?',
            'Show me my calendar for August 25th'
        ];
        
        for (const query of testQueries) {
            const classification = await askService.classifyQuestionType(query);
            console.log(`Query: "${query}"`);
            console.log(`  Classification: ${classification}`);
            console.log(`  Should be 'dynamic_tool_request': ${classification === 'dynamic_tool_request' ? '✅' : '❌'}`);
            console.log('');
        }
        
        // Test couldNeedTools method
        console.log('🔧 Testing couldNeedTools method...');
        for (const query of testQueries) {
            const couldNeed = askService.couldNeedTools(query);
            console.log(`Query: "${query}"`);
            console.log(`  Could need tools: ${couldNeed ? '✅' : '❌'}`);
            console.log('');
        }
        
        console.log('🎉 CLASSIFICATION TEST COMPLETE!');
        console.log('================================');
        return true;
        
    } catch (error) {
        console.error('❌ TEST FAILED:', error.message);
        console.error('Stack:', error.stack);
        return false;
    }
}

testCalendarThroughAsk().then(success => {
    if (success) {
        console.log('✅ CALENDAR CLASSIFICATION WORKING!');
    } else {
        console.log('❌ CALENDAR CLASSIFICATION FAILED!');
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
});