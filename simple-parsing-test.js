#!/usr/bin/env node

/**
 * Simple test for the parsing logic fix
 */

function testResponseParsing() {
    console.log('🧪 Testing Response Parsing Logic...\n');
    
    // Mock the exact response structure from the logs
    const statusResult = {
        content: [
            {
                type: 'text',
                text: '{"content":[{"type":"text","text":"[\\n  {\\n    \\"id\\": \\"gmail\\",\\n    \\"name\\": \\"Gmail\\",\\n    \\"status\\": \\"not_authenticated\\"\\n  },\\n  {\\n    \\"id\\": \\"slack\\",\\n    \\"name\\": \\"Slack\\",\\n    \\"status\\": \\"not_authenticated\\"\\n  }\\n]"}]}'
            }
        ]
    };
    
    console.log('1️⃣ Original response structure:');
    console.log(JSON.stringify(statusResult, null, 2));
    
    try {
        console.log('\\n2️⃣ Testing the new parsing logic...');
        
        // Apply the same parsing logic as in the fix
        if (statusResult && statusResult.content && statusResult.content[0] && statusResult.content[0].text) {
            let services;
            const responseText = statusResult.content[0].text;
            
            console.log('📝 Raw response text:', responseText);
            
            // Try to parse as nested MCP response first
            try {
                const mcpResponse = JSON.parse(responseText);
                console.log('📦 Parsed MCP response:', mcpResponse);
                
                if (mcpResponse.content && mcpResponse.content[0] && mcpResponse.content[0].text) {
                    services = JSON.parse(mcpResponse.content[0].text);
                    console.log('🎯 Extracted services:', services);
                } else {
                    // Fallback to direct parsing
                    services = mcpResponse;
                }
            } catch (e) {
                console.log('⚠️ Nested parsing failed, trying direct:', e.message);
                // Fallback to direct parsing
                services = JSON.parse(responseText);
            }
            
            console.log('\\n3️⃣ Final services array:', services);
            console.log('📊 Is array?', Array.isArray(services));
            
            if (Array.isArray(services)) {
                const targetService = services.find(s => s.id === 'gmail');
                console.log('🎯 Found Gmail service:', targetService);
                console.log('✅ SUCCESS: services.find() works correctly!');
            } else {
                console.log('❌ Services is not an array');
            }
        }
        
    } catch (error) {
        console.log('❌ FAILED:', error.message);
        if (error.message.includes('services.find is not a function')) {
            console.log('🚨 Still getting the original parsing error');
        }
    }
}

testResponseParsing();