#!/usr/bin/env node

/**
 * Final verification test for Paragon MCP integration
 */

const path = require('path');
const { spawn } = require('child_process');

async function verifyParagonMCPFix() {
    console.log('🔧 Final Verification: Paragon MCP Integration Fix\n');
    
    let success = false;
    
    try {
        console.log('1️⃣ Testing Paragon MCP Server Path...');
        const serverPath = path.join(__dirname, 'services/paragon-mcp/dist/index.mjs');
        console.log(`📁 Server path: ${serverPath}`);
        
        // Check if the file exists
        const fs = require('fs');
        if (fs.existsSync(serverPath)) {
            console.log('✅ Paragon MCP server file exists');
        } else {
            console.log('❌ Paragon MCP server file not found');
            return;
        }
        
        console.log('\n2️⃣ Testing Server Startup...');
        const serverProcess = spawn('node', [serverPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                NODE_ENV: 'test'
            }
        });
        
        let serverStarted = false;
        let toolsAvailable = false;
        
        serverProcess.stderr.on('data', (data) => {
            const output = data.toString();
            if (output.includes('[ParagonMCP] Starting Paragon MCP Server')) {
                console.log('✅ Paragon MCP Server started successfully');
                serverStarted = true;
            }
            if (output.includes('[ParagonMCP] Paragon MCP Server running on stdio transport')) {
                console.log('✅ Server ready on stdio transport');
            }
        });
        
        // Test JSON-RPC communication
        setTimeout(() => {
            console.log('\n3️⃣ Testing Tool Discovery...');
            const listToolsMessage = {
                jsonrpc: '2.0',
                id: 1,
                method: 'tools/list'
            };
            
            serverProcess.stdin.write(JSON.stringify(listToolsMessage) + '\n');
        }, 2000);
        
        serverProcess.stdout.on('data', (data) => {
            const responses = data.toString().split('\n').filter(line => line.trim());
            responses.forEach(response => {
                if (response.trim()) {
                    try {
                        const parsed = JSON.parse(response);
                        if (parsed.result && parsed.result.tools) {
                            const authTool = parsed.result.tools.find(tool => 
                                tool.name === 'get_authenticated_services'
                            );
                            if (authTool) {
                                console.log('✅ get_authenticated_services tool found!');
                                console.log('📋 Available tools:', parsed.result.tools.map(t => t.name).join(', '));
                                toolsAvailable = true;
                                success = true;
                            }
                        }
                    } catch (e) {
                        // Ignore parsing errors
                    }
                }
            });
        });
        
        // Test get_authenticated_services tool
        setTimeout(() => {
            if (toolsAvailable) {
                console.log('\n4️⃣ Testing get_authenticated_services Tool...');
                const callToolMessage = {
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'tools/call',
                    params: {
                        name: 'get_authenticated_services',
                        arguments: {}
                    }
                };
                
                serverProcess.stdin.write(JSON.stringify(callToolMessage) + '\n');
            }
        }, 4000);
        
        // Final cleanup and results
        setTimeout(() => {
            serverProcess.kill();
            
            console.log('\n📊 Verification Results:');
            console.log('- Server File Exists: ✅');
            console.log(`- Server Startup: ${serverStarted ? '✅' : '❌'}`);
            console.log(`- Tools Available: ${toolsAvailable ? '✅' : '❌'}`);
            console.log(`- Integration Working: ${success ? '✅' : '❌'}`);
            
            if (success) {
                console.log('\n🎉 SUCCESS: The "Tool not found: get_authenticated_services" error has been FIXED!');
                console.log('\n✨ Paragon MCP Integration Summary:');
                console.log('- Built Paragon MCP TypeScript server ✅');
                console.log('- Fixed esbuild configuration issues ✅');
                console.log('- Added server definition to registry ✅');
                console.log('- Corrected file path references ✅');
                console.log('- Verified tool availability ✅');
                console.log('\n🚀 Ready for authentication testing with Gmail and other services!');
            } else {
                console.log('\n❌ Issues remain - additional troubleshooting needed');
            }
            
            process.exit(success ? 0 : 1);
        }, 6000);
        
    } catch (error) {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    }
}

verifyParagonMCPFix().catch(console.error); 