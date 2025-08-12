
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

const server = new Server({
    name: 'test-echo-server',
    version: '1.0.0'
}, {
    capabilities: {
        tools: {}
    }
});

// Register request handlers
server.setRequestHandler({
    method: 'tools/list',
    handler: async () => ({
        tools: [{
            name: 'echo',
            description: 'Echoes the input',
            inputSchema: {
                type: 'object',
                properties: {
                    message: { type: 'string' }
                },
                required: ['message']
            }
        }]
    })
});

server.setRequestHandler({
    method: 'tools/call',
    handler: async (request) => {
        if (request.params.name === 'echo') {
            return {
                content: [{
                    type: 'text',
                    text: 'Echo: ' + request.params.arguments.message
                }]
            };
        }
        throw new Error('Tool not found');
    }
});

const transport = new StdioServerTransport();
server.connect(transport);

console.error('Echo server started successfully');
