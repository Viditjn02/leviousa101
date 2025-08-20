#!/usr/bin/env node

/**
 * Test that hardcoded patterns are disabled and LLM takes priority
 */

require('dotenv').config();

console.log('🚫 TESTING HARDCODED PATTERNS DISABLED');
console.log('====================================');

async function testHardcodedPatternsDisabled() {
    try {
        console.log('🔧 Checking that hardcoded patterns are disabled...');
        
        // Read the MCPUIIntegrationService to verify changes
        const fs = require('fs');
        const serviceContent = fs.readFileSync('./src/features/mcp-integration/MCPUIIntegrationService.js', 'utf8');
        
        console.log('\n📝 Checking for disabled patterns:');
        
        // Check that hardcoded calendar pattern is disabled
        const hasDisabledCalendarPattern = serviceContent.includes('// DISABLED: Simple keyword matching for calendar');
        console.log(`✅ Calendar keyword matching disabled: ${hasDisabledCalendarPattern}`);
        
        // Check that auto-trigger is disabled
        const hasDisabledAutoTrigger = serviceContent.includes('// DISABLED: Auto-execute high-confidence UI actions');
        console.log(`✅ Auto-trigger mechanism disabled: ${hasDisabledAutoTrigger}`);
        
        // Check that LLM message is present
        const hasLLMMessage = serviceContent.includes('letting LLM dynamic tool selection handle requests');
        console.log(`✅ LLM priority message present: ${hasLLMMessage}`);
        
        // Check that confidence filter is disabled
        const noAutoTriggerFilter = !serviceContent.includes('action.confidence > 0.8 && action.autoTrigger') || 
                                   serviceContent.includes('// const autoActions = actions.filter');
        console.log(`✅ Auto-trigger filter disabled: ${noAutoTriggerFilter}`);
        
        // Check that hardcoded calendar keywords are commented out
        const calendarKeywordsDisabled = serviceContent.includes('//   context.message.toLowerCase().includes(\'calendar\')');
        console.log(`✅ Calendar keywords commented out: ${calendarKeywordsDisabled}`);
        
        // Verify no remaining hardcoded calendar triggers
        const lines = serviceContent.split('\n');
        const activeCalendarTriggers = lines.filter(line => 
            !line.trim().startsWith('//') && 
            !line.includes('DISABLED') &&
            (line.includes("'calendar.") || line.includes('"calendar.') ||
             line.includes("'meeting.") || line.includes('"meeting.'))
        );
        
        console.log(`\n🔍 Active calendar triggers found: ${activeCalendarTriggers.length}`);
        if (activeCalendarTriggers.length > 0) {
            console.log('❌ WARNING: Found active calendar triggers:');
            activeCalendarTriggers.forEach((line, i) => {
                console.log(`   ${i + 1}: ${line.trim()}`);
            });
        } else {
            console.log('✅ No active hardcoded calendar triggers found');
        }
        
        console.log('\n🎉 HARDCODED PATTERN CHECK COMPLETE!');
        console.log('=======================================');
        
        const allDisabled = hasDisabledCalendarPattern && 
                           hasDisabledAutoTrigger && 
                           hasLLMMessage && 
                           noAutoTriggerFilter && 
                           calendarKeywordsDisabled &&
                           activeCalendarTriggers.length === 0;
        
        if (allDisabled) {
            console.log('✅ All hardcoded patterns successfully disabled');
            console.log('✅ LLM-based dynamic tool selection now has priority');
            console.log('✅ No interference from keyword matching');
            console.log('✅ Auto-trigger mechanism disabled');
        } else {
            console.log('❌ Some hardcoded patterns may still be active');
        }
        
        return allDisabled;
        
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        return false;
    }
}

testHardcodedPatternsDisabled().then(success => {
    if (success) {
        console.log('\n🚀 HARDCODED PATTERNS SUCCESSFULLY DISABLED!');
        console.log('The system will now use LLM intelligence instead of keyword matching.');
        console.log('Calendar requests should go through dynamic tool selection.');
    } else {
        console.log('\n💥 HARDCODED PATTERNS NOT FULLY DISABLED!');
        console.log('Some interference may still exist.');
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
});