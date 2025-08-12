// Test MCP server directly to see Paragon API response
const InvisibilityService = require('./src/features/invisibility/invisibilityService');

async function testDirectMCPCall() {
    console.log('🧪 Testing direct MCP call to see Paragon API response...');
    
    try {
        const service = new InvisibilityService();
        await service.initialize();
        console.log('✅ Service initialized');
        
        if (!service.mcpClient) {
            console.log('❌ MCP client not available');
            return;
        }
        
        console.log('\n📡 Calling get_authenticated_services...');
        const userIdForCheck = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2'; // Your actual user ID
        
        try {
            const result = await service.mcpClient.callTool('get_authenticated_services', { user_id: userIdForCheck });
            console.log('📊 Raw MCP result:', JSON.stringify(result, null, 2));
            
            if (result && result.content && result.content[0] && result.content[0].text) {
                let parsedData;
                try {
                    const textContent = result.content[0].text;
                    console.log('📝 Text content:', textContent);
                    
                    // Handle double-nested JSON if needed
                    const firstParse = JSON.parse(textContent);
                    if (firstParse.content && Array.isArray(firstParse.content) && firstParse.content[0] && firstParse.content[0].text) {
                        console.log('🔍 Found double-nested structure, extracting...');
                        parsedData = JSON.parse(firstParse.content[0].text);
                    } else {
                        parsedData = firstParse;
                    }
                    
                    console.log('📊 Final parsed data:', JSON.stringify(parsedData, null, 2));
                    
                    if (parsedData.authenticated_services) {
                        console.log(`✅ Found ${parsedData.authenticated_services.length} authenticated services`);
                        console.log(`📋 Services: ${parsedData.authenticated_services.join(', ')}`);
                    } else {
                        console.log('⚠️  No authenticated_services in response');
                    }
                } catch (parseError) {
                    console.error('❌ Error parsing response:', parseError);
                }
            }
        } catch (error) {
            console.error('❌ Error calling MCP tool:', error);
        }
        
        console.log('\n📡 Now calling list_tools...');
        try {
            const toolsResult = await service.mcpClient.callTool('list_tools', {});
            console.log('🔧 Tools result:', JSON.stringify(toolsResult, null, 2));
            
            if (toolsResult && toolsResult.content && toolsResult.content[0] && toolsResult.content[0].text) {
                try {
                    const toolsData = JSON.parse(toolsResult.content[0].text);
                    console.log(`🔧 Found ${toolsData.tools ? toolsData.tools.length : 0} tools`);
                    
                    if (toolsData.tools && toolsData.tools.length > 0) {
                        const gmailTools = toolsData.tools.filter(t => t.name.toLowerCase().includes('gmail'));
                        console.log(`📧 Gmail tools: ${gmailTools.length}`);
                        if (gmailTools.length > 0) {
                            console.log(`📋 Gmail tools: ${gmailTools.map(t => t.name).join(', ')}`);
                        }
                    }
                } catch (parseError) {
                    console.error('❌ Error parsing tools response:', parseError);
                }
            }
        } catch (error) {
            console.error('❌ Error calling list_tools:', error);
        }
        
        console.log('\n✅ Direct MCP test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
    
    process.exit(0);
}

testDirectMCPCall();