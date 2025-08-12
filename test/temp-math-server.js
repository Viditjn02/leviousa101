
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

const server = new Server({
    name: 'math-server',
    version: '1.0.0'
}, {
    capabilities: {
        tools: {}
    }
});

server.setRequestHandler({
    method: 'tools/list',
    handler: async () => ({
        tools: [
            {
                name: 'add',
                description: 'Add two numbers',
                inputSchema: {
                    type: 'object',
                    properties: {
                        a: { type: 'number' },
                        b: { type: 'number' }
                    },
                    required: ['a', 'b']
                }
            },
            {
                name: 'multiply',
                description: 'Multiply two numbers',
                inputSchema: {
                    type: 'object',
                    properties: {
                        a: { type: 'number' },
                        b: { type: 'number' }
                    },
                    required: ['a', 'b']
                }
            }
        ]
    })
});

server.setRequestHandler({
    method: 'tools/call',
    handler: async (request) => {
        const { name, arguments: args } = request.params;
        let result;
        
        switch (name) {
            case 'add':
                result = args.a + args.b;
                break;
            case 'multiply':
                result = args.a * args.b;
                break;
            default:
                throw new Error('Tool not found');
        }
        
        return {
            content: [{
                type: 'text',
                text: String(result)
            }]
        };
    }
});

const transport = new StdioServerTransport();
server.connect(transport);

console.error('Math server started successfully');
