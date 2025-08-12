
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

const server = new Server({
    name: 'pool-test-server',
    version: '1.0.0'
}, {
    capabilities: {
        tools: {}
    }
});

server.setRequestHandler({
    method: 'tools/list',
    handler: async () => ({ tools: [] })
});

const transport = new StdioServerTransport();
server.connect(transport);

console.error('Pool test server started successfully');
