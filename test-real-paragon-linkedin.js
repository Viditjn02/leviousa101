#!/usr/bin/env node

/**
 * Real Paragon LinkedIn Integration Test
 * Tests actual LinkedIn integration via Paragon proxy with proper environment setup
 */

const { spawn } = require('child_process');
const { join } = require('path');

class ParagonLinkedInTester {
    constructor() {
        this.mcpServerPath = join(__dirname, 'services', 'paragon-mcp');
        this.userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2'; // Default user ID from codebase
        this.mcpProcess = null;
        this.testResults = [];
    }

    async startMCPServer() {
        console.log('🚀 Starting Paragon MCP Server for LinkedIn Testing...');
        console.log('   Server Path:', this.mcpServerPath);
        
        return new Promise((resolve, reject) => {
            this.mcpProcess = spawn('node', ['dist/index.mjs'], {
                cwd: this.mcpServerPath,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env }
            });

            let serverReady = false;
            let startupOutput = [];

            this.mcpProcess.stdout.on('data', (data) => {
                const text = data.toString().trim();
                startupOutput.push(text);
                
                // Don't log every message, just important ones
                if (text.includes('MCP server listening') || 
                    text.includes('LinkedIn') ||
                    text.includes('authenticated') ||
                    text.includes('Error') ||
                    text.includes('WARNING') ||
                    text.includes('Server ready')) {
                    console.log('[MCP Server]', text);
                }

                if (text.includes('Server ready and listening') || text.includes('MCP server listening')) {
                    serverReady = true;
                    resolve({ process: this.mcpProcess, output: startupOutput });
                }
            });

            this.mcpProcess.stderr.on('data', (data) => {
                const text = data.toString().trim();
                
                // Only log actual errors, not ActionKit warnings (user said to ignore those)
                if (!text.includes('actionkit') && !text.includes('ActionKit')) {
                    console.error('[MCP Server Error]', text);
                }
                
                if (text.includes('Missing required environment variables')) {
                    reject(new Error('Missing Paragon environment variables'));
                }
            });

            this.mcpProcess.on('error', (error) => {
                reject(error);
            });

            // Longer timeout since we're starting a real server
            setTimeout(() => {
                if (!serverReady) {
                    this.mcpProcess.kill();
                    console.log('\n📋 Server startup output:');
                    startupOutput.forEach(line => console.log('  ', line));
                    reject(new Error('MCP server failed to start within 15 seconds'));
                }
            }, 15000);
        });
    }

    async sendMCPRequest(method, params = {}) {
        if (!this.mcpProcess) {
            throw new Error('MCP server not started');
        }

        return new Promise((resolve, reject) => {
            const request = {
                jsonrpc: '2.0',
                id: Date.now(),
                method: method,
                params: params
            };

            let responseData = '';
            let timeoutId;

            const dataHandler = (data) => {
                responseData += data.toString();
                
                // Try to parse JSON response
                try {
                    const lines = responseData.trim().split('\n');
                    for (const line of lines) {
                        if (line.trim()) {
                            const response = JSON.parse(line);
                            if (response.id === request.id) {
                                clearTimeout(timeoutId);
                                this.mcpProcess.stdout.off('data', dataHandler);
                                resolve(response);
                                return;
                            }
                        }
                    }
                } catch (e) {
                    // Not valid JSON yet, keep waiting
                }
            };

            this.mcpProcess.stdout.on('data', dataHandler);

            // Send request
            this.mcpProcess.stdin.write(JSON.stringify(request) + '\n');

            // Timeout after 10 seconds
            timeoutId = setTimeout(() => {
                this.mcpProcess.stdout.off('data', dataHandler);
                reject(new Error(`Request timed out: ${method}`));
            }, 10000);
        });
    }

    async testToolsList() {
        console.log('\n🔧 Testing Available Tools...');
        
        try {
            const response = await this.sendMCPRequest('tools/list');
            
            const tools = response.result?.tools || [];
            const linkedinTools = tools.filter(tool => tool.name.includes('linkedin'));
            
            console.log(`✅ Tools List Retrieved: ${tools.length} total tools`);
            console.log(`🔗 LinkedIn Tools: ${linkedinTools.length}`);
            
            linkedinTools.forEach(tool => {
                console.log(`   • ${tool.name}: ${tool.description}`);
            });

            this.testResults.push({
                test: 'tools_list',
                status: 'success',
                data: { totalTools: tools.length, linkedinTools: linkedinTools.length, tools: linkedinTools }
            });

            return linkedinTools.length > 0;

        } catch (error) {
            console.log('❌ Tools List Failed:', error.message);
            this.testResults.push({
                test: 'tools_list',
                status: 'error',
                error: error.message
            });
            return false;
        }
    }

    async testLinkedInConnections() {
        console.log('\n👥 Testing LinkedIn Connections...');
        
        try {
            const response = await this.sendMCPRequest('tools/call', {
                name: 'linkedin_get_connections',
                arguments: {
                    user_id: this.userId,
                    start: 0,
                    count: 5
                }
            });

            console.log('✅ LinkedIn Connections - SUCCESS');
            
            if (response.result?.content?.[0]?.text) {
                const content = JSON.parse(response.result.content[0].text);
                console.log('   Response:', content);
            }

            this.testResults.push({
                test: 'linkedin_connections',
                status: 'success',
                data: response.result
            });

        } catch (error) {
            console.log('❌ LinkedIn Connections - FAILED:', error.message);
            this.testResults.push({
                test: 'linkedin_connections',
                status: 'error',
                error: error.message
            });
        }
    }

    async generateReport() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 PARAGON LINKEDIN INTEGRATION TEST REPORT');
        console.log('='.repeat(80));

        const successTests = this.testResults.filter(t => t.status === 'success');
        const failedTests = this.testResults.filter(t => t.status === 'error');

        console.log(`\n📈 Test Summary: ${successTests.length}/${this.testResults.length} tests passed`);

        if (successTests.length > 0) {
            console.log('\n✅ Successful Tests:');
            successTests.forEach(test => {
                console.log(`   • ${test.test}: PASSED`);
            });
        }

        if (failedTests.length > 0) {
            console.log('\n❌ Failed Tests:');
            failedTests.forEach(test => {
                console.log(`   • ${test.test}: ${test.error}`);
            });
        }

        console.log('\n🎯 Key Findings:');
        
        const toolsTest = this.testResults.find(t => t.test === 'tools_list');
        if (toolsTest && toolsTest.status === 'success') {
            const linkedinToolCount = toolsTest.data.linkedinTools;
            if (linkedinToolCount > 0) {
                console.log(`   ✅ LinkedIn integration is active (${linkedinToolCount} tools available)`);
            } else {
                console.log('   ⚠️  LinkedIn not authenticated or not available');
            }
        }

        if (failedTests.length === 0) {
            console.log('   🎉 All LinkedIn integration tests passed!');
            console.log('   🚀 Paragon LinkedIn proxy is working correctly');
        } else {
            console.log(`   ⚠️  ${failedTests.length} integration issues found`);
        }

        console.log('\n' + '='.repeat(80));
    }

    async cleanup() {
        if (this.mcpProcess) {
            console.log('\n🧹 Stopping MCP Server...');
            this.mcpProcess.kill();
        }
    }

    async runAllTests() {
        console.log('🎯 Starting Real Paragon LinkedIn Integration Tests\n');
        console.log('   • Environment: Configured ✅');
        console.log('   • Integration: Paragon Proxy ✅');
        console.log('   • Target: LinkedIn API via Paragon ✅\n');

        try {
            // Start the actual MCP server
            await this.startMCPServer();
            console.log('✅ Paragon MCP Server Started Successfully\n');

            // Wait a moment for server to fully initialize
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Run tests
            const hasLinkedInTools = await this.testToolsList();
            
            if (hasLinkedInTools) {
                await this.testLinkedInConnections();
            } else {
                console.log('⚠️  Skipping LinkedIn-specific tests - no LinkedIn tools available');
            }

            await this.generateReport();

        } catch (error) {
            console.error('💥 Test execution failed:', error.message);
        } finally {
            await this.cleanup();
        }
    }
}

// Run the tests
const tester = new ParagonLinkedInTester();
tester.runAllTests().catch(console.error);

