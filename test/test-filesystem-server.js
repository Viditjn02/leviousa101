/**
 * Filesystem MCP Server Test
 * Tests MCPAdapter with the official filesystem MCP server
 */

const path = require('path');
const fs = require('fs').promises;
const MCPAdapter = require('../src/features/invisibility/mcp/MCPAdapter');

async function testFilesystemServer() {
    console.log('=== Filesystem MCP Server Test ===\n');
    
    try {
        // Create a test directory with some files
        const testDir = path.join(__dirname, 'test-filesystem');
        await fs.mkdir(testDir, { recursive: true });
        await fs.writeFile(path.join(testDir, 'test.txt'), 'Hello from test file!');
        await fs.writeFile(path.join(testDir, 'data.json'), JSON.stringify({ test: true, value: 42 }, null, 2));

        // Create adapter and connect to filesystem server
        console.log('Connecting to filesystem MCP server...');
        const adapter = new MCPAdapter({
            name: 'test-client',
            version: '1.0.0'
        });

        // Try to use the filesystem server via npx
        await adapter.connectToServer('npx', [
            '-y',
            '@modelcontextprotocol/server-filesystem',
            testDir
        ], { stderr: 'inherit' });

        console.log('✓ Connected successfully');

        // Wait for discovery
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test tool discovery
        const tools = adapter.getTools();
        console.log(`\n✓ Discovered ${tools.length} tools:`, tools.map(t => t.name));

        // Test reading a file
        if (adapter.hasTool('read_file')) {
            console.log('\nReading test.txt...');
            const result = await adapter.callTool('read_file', {
                path: path.join(testDir, 'test.txt')
            });
            console.log('✓ File content:', result.content[0].text);
        }

        // Test listing directory
        if (adapter.hasTool('list_directory')) {
            console.log('\nListing directory...');
            const result = await adapter.callTool('list_directory', {
                path: testDir
            });
            console.log('✓ Directory listing:', result.content[0].text);
        }

        // Test resources
        const resources = adapter.getResources();
        console.log(`\n✓ Discovered ${resources.length} resources`);

        // Disconnect
        await adapter.disconnect();
        console.log('\n✓ Disconnected successfully');

        // Cleanup
        await fs.unlink(path.join(testDir, 'test.txt'));
        await fs.unlink(path.join(testDir, 'data.json'));
        await fs.rmdir(testDir);
        
        console.log('\n✅ Filesystem server test passed!');
        return true;

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        
        // Cleanup on error
        try {
            const testDir = path.join(__dirname, 'test-filesystem');
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (e) {
            // Ignore cleanup errors
        }
        
        return false;
    }
}

// Run the test
if (require.main === module) {
    testFilesystemServer().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { testFilesystemServer }; 