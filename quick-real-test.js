#!/usr/bin/env node

/**
 * QUICK REAL TEST - Foreground testing to see exact errors
 */

const REAL_USER_ID = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';

console.log('🔥 QUICK REAL TEST - FOREGROUND');
console.log('==============================');
console.log(`📋 Real User ID: ${REAL_USER_ID}`);
console.log();

async function quickTest() {
    try {
        console.log('📦 Loading MCP client...');
        const MCPClient = require('./src/features/invisibility/mcp/MCPClient');
        const mcpClient = new MCPClient();
        
        console.log('🚀 Initializing...');
        await mcpClient.initialize();
        
        console.log('⏳ Waiting 3 seconds for full startup...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('✅ Ready! Testing integrations...');
        console.log();
        
        // Test 1: Notion (should be fixed now)
        console.log('📝 1. TESTING NOTION (Fixed parameter order)...');
        try {
            const notionResult = await mcpClient.invokeTool('notion_list_databases', {
                user_id: REAL_USER_ID
            });
            console.log('✅ Notion: SUCCESS');
            console.log('📊 Result preview:', JSON.stringify(notionResult).substring(0, 200));
        } catch (error) {
            console.log('❌ Notion: FAILED -', error.message.substring(0, 300));
        }
        console.log();
        
        // Test 2: LinkedIn  
        console.log('🔗 2. TESTING LINKEDIN...');
        try {
            const linkedinResult = await mcpClient.invokeTool('linkedin_get_profile', {
                user_id: REAL_USER_ID,
                profile_id: 'me'
            });
            console.log('✅ LinkedIn: SUCCESS');
            console.log('📊 Result preview:', JSON.stringify(linkedinResult).substring(0, 200));
        } catch (error) {
            console.log('❌ LinkedIn: FAILED -', error.message.substring(0, 300));
        }
        console.log();
        
        // Test 3: Calendly
        console.log('🗓️ 3. TESTING CALENDLY (Fixed org URI)...');
        try {
            const calendlyResult = await mcpClient.invokeTool('calendly_list_event_types', {
                user_id: REAL_USER_ID
            });
            console.log('✅ Calendly: SUCCESS');
            console.log('📊 Result preview:', JSON.stringify(calendlyResult).substring(0, 200));
        } catch (error) {
            console.log('❌ Calendly: FAILED -', error.message.substring(0, 300));
        }
        console.log();
        
        console.log('🎯 QUICK TEST COMPLETED');
        process.exit(0);
        
    } catch (error) {
        console.error('💥 Quick test failed:', error.message);
        process.exit(1);
    }
}

quickTest();


