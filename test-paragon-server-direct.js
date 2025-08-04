// Start Paragon MCP server directly and call it to see logs
const { spawn } = require('child_process');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

async function testParagonServerDirect() {
    console.log('🧪 Starting fresh Paragon MCP server to see actual API logs...');
    
    try {
        // Start the MCP server process
        const serverProcess = spawn('node', [
            '/Applications/XAMPP/xamppfiles/htdocs/Leviousa101/services/paragon-mcp/dist/index.mjs'
        ], {
            cwd: '/Applications/XAMPP/xamppfiles/htdocs/Leviousa101/services/paragon-mcp',
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                PROJECT_ID: 'db5e019e-0558-4378-93de-f212a73e0606',
                SIGNING_KEY: process.env.SIGNING_KEY || `-----BEGIN PRIVATE KEY-----\nMIIJQwIBADANBgkqhkiG9w0BAQEFAASCCS0wggkpAgEAAoICAQC8UHdr\nb5v9DG9A\nPtdVvpSM37NHyTu7axlAalF51WXTxl4/wWbiS/mBDOsOrbfcuDZFXqsCBxmY2sGH\nrUqT/ocG4urq6GyTj/uGIW\ncg1Xu/9yJDfTEoBWGQoHc9IBnaZvzvc3aC/jgIXf4/\nzZeqYilW/gtl/u6OrAVmoPWoXppYPI4dkkLnx4VamutZWJupaG+j3O\ndzUzNr1Ese\nId673XBnYA60HbM8ibQlXqn4mWnV/tueQmHbX8R7haL+liS47kXBIMuDjSFM6Tej\n7TJQaFSkmbayU8tL7ekI\nTaybInXHc0WprEKy+VLt3lCBB0De2WuUFzV/CdjxAiqE\npwybJF7xbOUffimkG3dVqeLlCdxK8EFxGLYG4MC0j2ACbvQ8w0Y5\nFyd6lWSgw5i4\nkBV4+3LsFyK8XLr7BhkAFEf/Ogd91wC31IWHLh/aqZeXOk7cOmczObptBKKrIoYN\nroRG3es3OM9AwHEXEO\nEgxUh7nmSORRX2LP27nSi7VkdwEnKktw24q0IFzFjDpxzw\nuJVPEI6QJiMe/KJoXN+w02ET7WiMjHdfnL81zxvHfKJPWK5gN0\nybABgPdh70vFyh\nFq3gdxBAlGzmWR4T87OwwDbPw0o/QiGRHCm0oHKdLHEuqA1U/maG889EAg0nrLox\nvOfS/GFxdCS7hRcV\nHpJP/XiF6RBsuwIDAQABAoICAFxFr2ZAz3XMUHzx7dCRbDek\n6zNrGq4oebyS++5PTrBYvFjQGuoaoRyHaGwOWg+4YbtW+kMp\nmHTKB9dD5c2jg6Uv\nrj1BeuZJQE1Gc8JmaNc0sKDSKLJ8BIT548NbRd+65Agukuz3xRvwdoLr6ftuUuRR\n4eLt6hWVm6Xgi8\n6e4FEJBvfdcZQhsymkzFpArTFyv3VS6kQbihA1e0M+BGYYSJoW\nus2t2eP5c4B2JKHwBih500H2M/3qrJt77VSC3GaTNjG+MI\np6rk0B36YetS8qGAN5\nYEh7/5rqbeuIJ+HyHjUHOiS8CAirW2O7scWveK1ZarmrL6bae+cIES5jri0cwroA\nekvKr/YyqJvM\nl+NniUQfOm6Mt9j/OwvCCXGxFqbfeJHpLDrBuvI133gKCA1p/7by\nf1zuXzmrSw4pdQvAaUZ9qzbvB4ICfVgKj0onTH+N71EF\nnfnlLn34p4H8O/T6Ahpu\niXChKk07G5uShfnh0TuE0gb1eDkm8GrV4kXXtXdixrIL1a++WbsRrUNkqmqNEqjx\nWHWJ28f0jo\n8CBhIUgPVpslJTgUYu6S2bh0ttblSTXhw+PmKPd40jxt74viUTJFce\nIVQXQ+XJVAE20GRuLBbcPTMDpGsWznK+rH8NFRrf6a\n1JRDY4tqjZ95u/NoUQiR8W\nbbMwH625HLzTLVjpfQx1AoIBAQDwdyttZDynTIo9XePXeAM3GLyoOLb0vTIGWNYY\nWlKenfti\n/ObZCK8hOpcA92jbJ97aTzW7Bp5Roee9aUmBHAzsghrpeUm2MyawduYU\nY6C3KQhd5I7DIVTnjTspm+EqXe2KY0qkpCGBFihc\ndgYtEp3CGlFqdy/OsnsGefM5\nw6NoycWBIlVwavR4QAKQH+BTEl8nkdOyysIKBVio1Q1mf5qnCsv3xbJdgnBirmFs\ncHsGXU\nC2PIjbo7ObN7muN9+wjfs8GGFwmeejBA0S1SQ0OrE16CCoPhH5dFSc9L8I\nxc+sI7RT2cIpnzgBpZPV+OZLbQ1sT/UzU6J13p\ncNhtTCO2UdAoIBAQDIetFoUTq9\n9AwkjA1KekkZNn+FL4EHVlnLOMDIvb+7N2H7d250hadaU9kS6dGwcgLcQmBztoWv\nSiQ3\nrIlc1dBbXjzq7sR1OSl3AarXcg9EzKWYhB+b3lIai874PyyslGxXpNH0cYuh\nfe6G86im+4VHvCL55b8Xx5RADqMHQOAh5ZIy\nfAojoIiboEBGH7ttOcC5nWBlTJ62\nMg874641edYQliV7KjNmUNXCKYqP9Ma6iahGhzhBjZ75EadUE2AO4xitpYpiXzsG\nkX\n4133Eo3SfiYQasiLF/klOZx6tzgxJfkNrWH+X1Q9f6gnX+7UOiFNoE9oLanpEX\n+qlZSM4WV6m3AoIBAQCRRd2Fm/4MsG//vP\n5OCSIgIiCvnHvjhX14WikV01OAoj7i\nQZmRWu66q3PY0J+XbxHyX9I9KDVzadXgF4ChsHmaVMu/a1f97A8eouZDQSEyJmb4\n\nmoEpH7T0ot0wOQ0iFFbSuUO6DbJ0ExfVLDR0/H80acPwBwtp22f5tKkdp7TMNMHO\nTxjA7sy87SbfPXK/nSTBehckN9xcQ3iZ\nnwUWfFbJPfuVt+kXFxugcmtHIPkiEipr\nLk0cLFzwlAzoVLceKdizKKONbF2FnYfsbboOl7rBr3gzTDR9uSr5G99hhGf/Ph7O\nXYswrBEg5ZBXv6QZw0tNuUyQcqF+hjhJosBci5d9AoIBACIP9Ap0WrWxhGqlPRDd\nbBQTlWEMrDCR9Fm5/89bpfrqMwSlyy\neTGdcYDfbPsWf4RxIjWP3wEhCxWSv4bbJP\nRcJwZYtJHCoKl0f4CY3nfD6lQrGCKVizUmHeRUEagr2jzjCp+V49+Ipsuh1Fwu\n70\nJzYD+jFZXrlsmHy1v+9Yj3xS5B8dwh9BhFRkyubfN1ociOlAmwM7HHA6WypCyfOe\nCsfwqtedWPRWYatGoZtJ7IX/I48w\nJFfG9y68WCDJ1fVRknzWdoe2RHIeQEJo/3IA\n+WjWMWsZIodZVkj3iuLqbzG7i+L7sneUmlqe1euFZotgXZagR6Vbca2QUjuw\nSguz\nw0sCggEBAMKV+D6Ip268SXHm+ji837XVAX0S5uyvvor2nOtsp8abi85t7ZzGZO5z\ndN8VCIVMo9eve5Xext6AT41SY9\nILMQh9OyuJipq3nHfNxfi4ILIetJKihZGCmxVo\nqVmEPRzi5459nq0Kph+5fU4+6pTaBECwfJDKmOO8xM9AlUDi2tC6GwcqZw\nDAWO7N\ncRzAZRJnAGwIvjRQ5WpZRtL1N4zSapjSJ7m8+J5PmVyxk1wQVTZy6rj1eCdbQ2zc\nvxWsy1pTeK+HJEruidGGU48F\nRUKjYTZRpv9UCq2D0CLKtYLPZrFanXhQseunnyhq\nlDOjSu784ghgLa/KBzi0j50qZJLg47o=\n-----END PRIVATE KEY---\n`
            }
        });
        
        // Capture server logs
        serverProcess.stderr.on('data', (data) => {
            console.log(`[SERVER LOG] ${data.toString()}`);
        });
        
        serverProcess.stdout.on('data', (data) => {
            console.log(`[SERVER OUT] ${data.toString()}`);
        });
        
        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('📡 Server started, connecting MCP client...');
        
        // Create MCP client
        const transport = new StdioClientTransport({
            command: 'node',
            args: ['/Applications/XAMPP/xamppfiles/htdocs/Leviousa101/services/paragon-mcp/dist/index.mjs'],
            env: {
                ...process.env,
                PROJECT_ID: 'db5e019e-0558-4378-93de-f212a73e0606',
                SIGNING_KEY: process.env.SIGNING_KEY || `-----BEGIN PRIVATE KEY-----\nMIIJQwIBADANBgkqhkiG9w0BAQEFAASCCS0wggkpAgEAAoICAQC8UHdr\nb5v9DG9A\nPtdVvpSM37NHyTu7axlAalF51WXTxl4/wWbiS/mBDOsOrbfcuDZFXqsCBxmY2sGH\nrUqT/ocG4urq6GyTj/uGIW\ncg1Xu/9yJDfTEoBWGQoHc9IBnaZvzvc3aC/jgIXf4/\nzZeqYilW/gtl/u6OrAVmoPWoXppYPI4dkkLnx4VamutZWJupaG+j3O\ndzUzNr1Ese\nId673XBnYA60HbM8ibQlXqn4mWnV/tueQmHbX8R7haL+liS47kXBIMuDjSFM6Tej\n7TJQaFSkmbayU8tL7ekI\nTaybInXHc0WprEKy+VLt3lCBB0De2WuUFzV/CdjxAiqE\npwybJF7xbOUffimkG3dVqeLlCdxK8EFxGLYG4MC0j2ACbvQ8w0Y5\nFyd6lWSgw5i4\nkBV4+3LsFyK8XLr7BhkAFEf/Ogd91wC31IWHLh/aqZeXOk7cOmczObptBKKrIoYN\nroRG3es3OM9AwHEXEO\nEgxUh7nmSORRX2LP27nSi7VkdwEnKktw24q0IFzFjDpxzw\nuJVPEI6QJiMe/KJoXN+w02ET7WiMjHdfnL81zxvHfKJPWK5gN0\nybABgPdh70vFyh\nFq3gdxBAlGzmWR4T87OwwDbPw0o/QiGRHCm0oHKdLHEuqA1U/maG889EAg0nrLox\nvOfS/GFxdCS7hRcV\nHpJP/XiF6RBsuwIDAQABAoICAFxFr2ZAz3XMUHzx7dCRbDek\n6zNrGq4oebyS++5PTrBYvFjQGuoaoRyHaGwOWg+4YbtW+kMp\nmHTKB9dD5c2jg6Uv\nrj1BeuZJQE1Gc8JmaNc0sKDSKLJ8BIT548NbRd+65Agukuz3xRvwdoLr6ftuUuRR\n4eLt6hWVm6Xgi8\n6e4FEJBvfdcZQhsymkzFpArTFyv3VS6kQbihA1e0M+BGYYSJoW\nus2t2eP5c4B2JKHwBih500H2M/3qrJt77VSC3GaTNjG+MI\np6rk0B36YetS8qGAN5\nYEh7/5rqbeuIJ+HyHjUHOiS8CAirW2O7scWveK1ZarmrL6bae+cIES5jri0cwroA\nekvKr/YyqJvM\nl+NniUQfOm6Mt9j/OwvCCXGxFqbfeJHpLDrBuvI133gKCA1p/7by\nf1zuXzmrSw4pdQvAaUZ9qzbvB4ICfVgKj0onTH+N71EF\nnfnlLn34p4H8O/T6Ahpu\niXChKk07G5uShfnh0TuE0gb1eDkm8GrV4kXXtXdixrIL1a++WbsRrUNkqmqNEqjx\nWHWJ28f0jo\n8CBhIUgPVpslJTgUYu6S2bh0ttblSTXhw+PmKPd40jxt74viUTJFce\nIVQXQ+XJVAE20GRuLBbcPTMDpGsWznK+rH8NFRrf6a\n1JRDY4tqjZ95u/NoUQiR8W\nbbMwH625HLzTLVjpfQx1AoIBAQDwdyttZDynTIo9XePXeAM3GLyoOLb0vTIGWNYY\nWlKenfti\n/ObZCK8hOpcA92jbJ97aTzW7Bp5Roee9aUmBHAzsghrpeUm2MyawduYU\nY6C3KQhd5I7DIVTnjTspm+EqXe2KY0qkpCGBFihc\ndgYtEp3CGlFqdy/OsnsGefM5\nw6NoycWBIlVwavR4QAKQH+BTEl8nkdOyysIKBVio1Q1mf5qnCsv3xbJdgnBirmFs\ncHsGXU\nC2PIjbo7ObN7muN9+wjfs8GGFwmeejBA0S1SQ0OrE16CCoPhH5dFSc9L8I\nxc+sI7RT2cIpnzgBpZPV+OZLbQ1sT/UzU6J13p\ncNhtTCO2UdAoIBAQDIetFoUTq9\n9AwkjA1KekkZNn+FL4EHVlnLOMDIvb+7N2H7d250hadaU9kS6dGwcgLcQmBztoWv\nSiQ3\nrIlc1dBbXjzq7sR1OSl3AarXcg9EzKWYhB+b3lIai874PyyslGxXpNH0cYuh\nfe6G86im+4VHvCL55b8Xx5RADqMHQOAh5ZIy\nfAojoIiboEBGH7ttOcC5nWBlTJ62\nMg874641edYQliV7KjNmUNXCKYqP9Ma6iahGhzhBjZ75EadUE2AO4xitpYpiXzsG\nkX\n4133Eo3SfiYQasiLF/klOZx6tzgxJfkNrWH+X1Q9f6gnX+7UOiFNoE9oLanpEX\n+qlZSM4WV6m3AoIBAQCRRd2Fm/4MsG//vP\n5OCSIgIiCvnHvjhX14WikV01OAoj7i\nQZmRWu66q3PY0J+XbxHyX9I9KDVzadXgF4ChsHmaVMu/a1f97A8eouZDQSEyJmb4\n\nmoEpH7T0ot0wOQ0iFFbSuUO6DbJ0ExfVLDR0/H80acPwBwtp22f5tKkdp7TMNMHO\nTxjA7sy87SbfPXK/nSTBehckN9xcQ3iZ\nnwUWfFbJPfuVt+kXFxugcmtHIPkiEipr\nLk0cLFzwlAzoVLceKdizKKONbF2FnYfsbboOl7rBr3gzTDR9uSr5G99hhGf/Ph7O\nXYswrBEg5ZBXv6QZw0tNuUyQcqF+hjhJosBci5d9AoIBACIP9Ap0WrWxhGqlPRDd\nbBQTlWEMrDCR9Fm5/89bpfrqMwSlyy\neTGdcYDfbPsWf4RxIjWP3wEhCxWSv4bbJP\nRcJwZYtJHCoKl0f4CY3nfD6lQrGCKVizUmHeRUEagr2jzjCp+V49+Ipsuh1Fwu\n70\nJzYD+jFZXrlsmHy1v+9Yj3xS5B8dwh9BhFRkyubfN1ociOlAmwM7HHA6WypCyfOe\nCsfwqtedWPRWYatGoZtJ7IX/I48w\nJFfG9y68WCDJ1fVRknzWdoe2RHIeQEJo/3IA\n+WjWMWsZIodZVkj3iuLqbzG7i+L7sneUmlqe1euFZotgXZagR6Vbca2QUjuw\nSguz\nw0sCggEBAMKV+D6Ip268SXHm+ji837XVAX0S5uyvvor2nOtsp8abi85t7ZzGZO5z\ndN8VCIVMo9eve5Xext6AT41SY9\nILMQh9OyuJipq3nHfNxfi4ILIetJKihZGCmxVo\nqVmEPRzi5459nq0Kph+5fU4+6pTaBECwfJDKmOO8xM9AlUDi2tC6GwcqZw\nDAWO7N\ncRzAZRJnAGwIvjRQ5WpZRtL1N4zSapjSJ7m8+J5PmVyxk1wQVTZy6rj1eCdbQ2zc\nvxWsy1pTeK+HJEruidGGU48F\nRUKjYTZRpv9UCq2D0CLKtYLPZrFanXhQseunnyhq\nlDOjSu784ghgLa/KBzi0j50qZJLg47o=\n-----END PRIVATE KEY---\n`
            }
        });
        
        const client = new Client(
            {
                name: 'test-client',
                version: '1.0.0',
            },
            {
                capabilities: {},
            }
        );
        
        await client.connect(transport);
        console.log('✅ MCP client connected');
        
        console.log('📡 Calling get_authenticated_services...');
        const result = await client.callTool({
            name: 'get_authenticated_services',
            arguments: {
                user_id: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2'
            }
        });
        
        console.log('📊 MCP Result:', JSON.stringify(result, null, 2));
        
        // Clean up
        serverProcess.kill();
        client.close();
        
        console.log('✅ Test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
    
    process.exit(0);
}

testParagonServerDirect();