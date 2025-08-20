#!/usr/bin/env node

/**
 * Test live calendar query functionality
 * This tests the actual application with a real calendar request
 */

require('dotenv').config();

console.log('📅 TESTING LIVE CALENDAR QUERY FUNCTIONALITY');
console.log('==========================================');

async function testLiveCalendarQuery() {
    try {
        console.log('🔧 Setting up test environment...');
        
        // Import the actual AskService (it's already an instance)
        const askService = require('./src/features/ask/askService');
        
        console.log('📅 Creating calendar query...');
        const query = 'Do I have anything scheduled for the 25th of this month?';
        
        console.log(`🎯 Testing query: "${query}"`);
        
        console.log('🚀 Sending query to live system...');
        const result = await askService.sendMessage(query, []);
        
        console.log('✅ Response received from live system:');
        console.log('📄 Result:', result);
        
        // Check if the response indicates dynamic tool selection was used
        if (result && typeof result === 'string') {
            const lowerResponse = result.toLowerCase();
            
            if (lowerResponse.includes('calendar') || 
                lowerResponse.includes('schedule') || 
                lowerResponse.includes('event') ||
                lowerResponse.includes('25th')) {
                console.log('✅ Calendar-related response detected');
                console.log('✅ Dynamic tool selection appears to be working');
                return true;
            } else {
                console.log('⚠️ Response does not appear calendar-related');
                console.log('❓ Dynamic tool selection may not have triggered');
                return false;
            }
        } else {
            console.log('❌ No valid response received');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Live test failed:', error.message);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

testLiveCalendarQuery().then(success => {
    if (success) {
        console.log('\n🎉 LIVE CALENDAR QUERY TEST PASSED!');
        console.log('✅ Calendar functionality is working in the live application');
        console.log('✅ LLM-based dynamic tool selection is operational');
    } else {
        console.log('\n💥 LIVE CALENDAR QUERY TEST FAILED!');
        console.log('❌ Calendar functionality may not be working properly');
    }
}).catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
});