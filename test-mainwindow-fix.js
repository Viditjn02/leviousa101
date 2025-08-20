#!/usr/bin/env node

/**
 * Test that mainWindow fix works
 */

require('dotenv').config();

console.log('🪟 TESTING MAINWINDOW FIX');
console.log('========================');

async function testMainWindowFix() {
    try {
        console.log('🔧 Testing code references...');
        
        // Read the askService file to verify the fix
        const fs = require('fs');
        const askServiceContent = fs.readFileSync('./src/features/ask/askService.js', 'utf8');
        
        // Check that mainWindow reference is removed
        const hasMainWindowError = askServiceContent.includes('mainWindow.webContents.send');
        const hasCorrectWindowReference = askServiceContent.includes('getWindowPool()?.get(\'ask\')');
        
        console.log(`❌ Has problematic mainWindow reference: ${hasMainWindowError}`);
        console.log(`✅ Has correct window pool reference: ${hasCorrectWindowReference}`);
        
        if (hasMainWindowError) {
            throw new Error('Still has mainWindow references that could cause errors');
        }
        
        if (!hasCorrectWindowReference) {
            throw new Error('Missing proper window pool references');
        }
        
        // Check the specific fixed lines
        const lines = askServiceContent.split('\n');
        const dynamicToolSection = lines.slice(700, 720).join('\n');
        
        console.log('\n🔍 Dynamic tool response section:');
        console.log('Lines around the fix:');
        lines.slice(700, 715).forEach((line, i) => {
            const lineNum = 701 + i;
            console.log(`   ${lineNum}: ${line.trim()}`);
        });
        
        const hasProperErrorHandling = dynamicToolSection.includes('if (askWin && !askWin.isDestroyed())');
        const hasCorrectSend = dynamicToolSection.includes('askWin.webContents.send');
        
        console.log(`\n✅ Has proper error handling: ${hasProperErrorHandling}`);
        console.log(`✅ Uses correct window reference: ${hasCorrectSend}`);
        
        if (!hasProperErrorHandling || !hasCorrectSend) {
            throw new Error('Fix not properly applied');
        }
        
        console.log('\n🎉 MAINWINDOW FIX VERIFIED!');
        console.log('=====================================');
        console.log('✅ Removed problematic mainWindow references');
        console.log('✅ Added proper window pool usage');
        console.log('✅ Added proper error handling for destroyed windows');
        console.log('✅ Dynamic tool responses should now work in UI');
        
        return true;
        
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        return false;
    }
}

testMainWindowFix().then(success => {
    if (success) {
        console.log('\n🚀 MAINWINDOW FIX READY!');
        console.log('The system should now properly send dynamic tool responses to the UI.');
    } else {
        console.log('\n💥 MAINWINDOW FIX INCOMPLETE!');
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
});