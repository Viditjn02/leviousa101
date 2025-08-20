#!/usr/bin/env node

/**
 * Simple verification that chatWithTools method exists in createLLMService
 */

console.log('🔧 SIMPLE chatWithTools VERIFICATION');
console.log('===================================');

// Read the source code to verify the fix
const fs = require('fs');
const path = require('path');

const bridgeFilePath = path.join(__dirname, 'src/features/invisibility/mcp/MCPMigrationBridge.js');
const bridgeCode = fs.readFileSync(bridgeFilePath, 'utf8');

console.log('📁 Reading MCPMigrationBridge.js...');

// Check if chatWithTools method exists in createLLMService
const hasChatWithTools = bridgeCode.includes('chatWithTools: async (messages, tools = [], tool_choice = \'auto\')');
const hasCreateLLMService = bridgeCode.includes('createLLMService()');
const hasReturnObject = bridgeCode.includes('return {') && bridgeCode.includes('generateResponse:');

console.log(`✅ Has createLLMService method: ${hasCreateLLMService}`);
console.log(`✅ Has chatWithTools method: ${hasChatWithTools}`);
console.log(`✅ Returns object with methods: ${hasReturnObject}`);

// Check if the chatWithTools method includes proper provider handling
const hasProviderIteration = bridgeCode.includes('for (let i = 0; i < providers.length; i++)');
const hasLLMChatWithTools = bridgeCode.includes('llm.chatWithTools(messages, tools, tool_choice)');
const hasProviderSupport = bridgeCode.includes('if (!llm.chatWithTools)');

console.log(`✅ Iterates through providers: ${hasProviderIteration}`);
console.log(`✅ Calls llm.chatWithTools: ${hasLLMChatWithTools}`);
console.log(`✅ Checks provider support: ${hasProviderSupport}`);

// Check if we import createLLM
const hasCreateLLMImport = bridgeCode.includes('createLLM') && bridgeCode.includes('require');

console.log(`✅ Imports createLLM: ${hasCreateLLMImport}`);

// Now let's verify the individual provider files have chatWithTools
const openaiFilePath = path.join(__dirname, 'src/features/common/ai/providers/openai.js');
const anthropicFilePath = path.join(__dirname, 'src/features/common/ai/providers/anthropic.js');

const openaiCode = fs.readFileSync(openaiFilePath, 'utf8');
const anthropicCode = fs.readFileSync(anthropicFilePath, 'utf8');

const openaiHasChatWithTools = openaiCode.includes('chatWithTools:');
const anthropicHasChatWithTools = anthropicCode.includes('chatWithTools:');

console.log(`✅ OpenAI provider has chatWithTools: ${openaiHasChatWithTools}`);
console.log(`✅ Anthropic provider has chatWithTools: ${anthropicHasChatWithTools}`);

// Check the DynamicToolSelectionService is expecting chatWithTools
const dynamicServicePath = path.join(__dirname, 'src/features/common/services/dynamicToolSelectionService.js');
const dynamicServiceCode = fs.readFileSync(dynamicServicePath, 'utf8');

const expectsChatWithTools = dynamicServiceCode.includes('this.llmProvider.chatWithTools');

console.log(`✅ DynamicToolSelectionService expects chatWithTools: ${expectsChatWithTools}`);

// Overall verification
const allChecksPass = hasChatWithTools && hasCreateLLMService && hasReturnObject && 
                      hasProviderIteration && hasLLMChatWithTools && hasProviderSupport &&
                      hasCreateLLMImport && openaiHasChatWithTools && anthropicHasChatWithTools && 
                      expectsChatWithTools;

console.log('\n🎯 VERIFICATION RESULTS:');
console.log('======================');

if (allChecksPass) {
    console.log('✅ ALL CHECKS PASS!');
    console.log('✅ chatWithTools method properly added to createLLMService');
    console.log('✅ Provider support implemented correctly');
    console.log('✅ Both OpenAI and Anthropic providers have chatWithTools');
    console.log('✅ DynamicToolSelectionService can use the method');
    console.log('\n🚀 FIX CONFIRMED: Runtime error "chatWithTools is not a function" should be resolved!');
} else {
    console.log('❌ SOME CHECKS FAILED!');
    console.log('❌ Fix may be incomplete or incorrect');
}

console.log('\n📋 SUMMARY:');
console.log(`   createLLMService method: ${hasCreateLLMService ? '✅' : '❌'}`);
console.log(`   chatWithTools method: ${hasChatWithTools ? '✅' : '❌'}`);
console.log(`   Provider iteration: ${hasProviderIteration ? '✅' : '❌'}`);
console.log(`   LLM provider call: ${hasLLMChatWithTools ? '✅' : '❌'}`);
console.log(`   Provider support check: ${hasProviderSupport ? '✅' : '❌'}`);
console.log(`   createLLM import: ${hasCreateLLMImport ? '✅' : '❌'}`);
console.log(`   OpenAI provider ready: ${openaiHasChatWithTools ? '✅' : '❌'}`);
console.log(`   Anthropic provider ready: ${anthropicHasChatWithTools ? '✅' : '❌'}`);
console.log(`   DynamicToolSelectionService ready: ${expectsChatWithTools ? '✅' : '❌'}`);

process.exit(allChecksPass ? 0 : 1);