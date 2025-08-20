#!/usr/bin/env node

/**
 * Test Gmail Send Email with Debug Logging
 * Tests the gmail_send_email tool with detailed logging to identify JWT/pattern issues
 */

const MCPClient = require('./src/features/invisibility/mcp/MCPClient');
const winston = require('winston');

// Configure detailed logger
const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? '\n' + JSON.stringify(meta, null, 2) : '';
            return `[${timestamp}] ${level}: ${message}${metaStr}`;
        })
    ),
    transports: [new winston.transports.Console()]
});

class EmailSendTester {
    constructor() {
        this.mcpClient = null;
    }

    async initialize() {
        logger.info('🚀 Initializing MCP Client for email send test...');
        
        try {
            this.mcpClient = new MCPClient();
            await this.mcpClient.initialize();
            
            logger.info('✅ MCP Client initialized successfully');
            
            // List available tools
            const tools = await this.mcpClient.getAvailableTools();
            const gmailTools = tools.filter(t => t.name.includes('gmail'));
            
            logger.info(`📧 Gmail tools available: ${gmailTools.length}`, {
                tools: gmailTools.map(t => ({
                    name: t.name,
                    description: t.description?.substring(0, 100)
                }))
            });
            
            return true;
        } catch (error) {
            logger.error('❌ Failed to initialize MCP Client', {
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    }

    async testSendEmail() {
        logger.info('\n========================================');
        logger.info('📧 TESTING GMAIL SEND EMAIL');
        logger.info('========================================\n');

        const testEmail = {
            to: 'test@example.com',
            subject: 'Test Email - Debug JWT/Pattern Issues',
            body: 'This is a test email to debug JWT token generation and API pattern issues.\n\nSent from Leviousa test script.',
            user_id: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2' // Default test user ID
        };

        try {
            logger.info('📤 Attempting to send email...', {
                to: testEmail.to,
                subject: testEmail.subject,
                userId: testEmail.user_id
            });

            // Hook into console output to capture JWT generation logs
            const originalLog = console.log;
            const originalError = console.error;
            const logs = [];
            
            console.log = (...args) => {
                logs.push({ type: 'log', message: args.join(' ') });
                originalLog.apply(console, args);
            };
            
            console.error = (...args) => {
                logs.push({ type: 'error', message: args.join(' ') });
                originalError.apply(console, args);
            };

            // Attempt to send email
            const startTime = Date.now();
            const result = await this.mcpClient.invokeTool('gmail_send_email', testEmail);
            const duration = Date.now() - startTime;

            // Restore console
            console.log = originalLog;
            console.error = originalError;

            // Log captured output
            if (logs.length > 0) {
                logger.debug('📝 Captured console output during email send:', {
                    logs: logs
                });
            }

            logger.info(`✅ Email send completed in ${duration}ms`, {
                success: result.success || result.isError === false,
                result: result
            });

            // Parse result
            if (result.content && Array.isArray(result.content)) {
                const content = result.content[0];
                if (content.type === 'text') {
                    try {
                        const parsed = JSON.parse(content.text);
                        logger.info('📧 Email send result:', {
                            success: parsed.success,
                            messageId: parsed.messageId,
                            error: parsed.error,
                            details: parsed
                        });

                        if (parsed.error) {
                            logger.error('❌ Email send failed with error:', {
                                error: parsed.error,
                                errorCode: parsed.errorCode,
                                fullResponse: parsed
                            });

                            // Check for JWT/auth issues
                            if (parsed.error.includes('402') || parsed.error.includes('ActionKit')) {
                                logger.warn('⚠️ ActionKit 402 error detected - trial plan limitation');
                                logger.info('💡 Suggestion: The tool should use Proxy API instead of ActionKit for trial accounts');
                            }
                            
                            if (parsed.error.includes('JWT') || parsed.error.includes('token')) {
                                logger.error('🔑 JWT Token issue detected!', {
                                    error: parsed.error,
                                    suggestion: 'Check JWT token generation in generateUserToken() method'
                                });
                            }

                            if (parsed.error.includes('401') || parsed.error.includes('Unauthorized')) {
                                logger.error('🔐 Authentication issue detected!', {
                                    error: parsed.error,
                                    suggestion: 'Check Paragon authentication and user token'
                                });
                            }
                        }
                    } catch (parseError) {
                        logger.warn('Could not parse result as JSON:', content.text);
                    }
                }
            }

            return result;
        } catch (error) {
            logger.error('❌ Email send test failed', {
                error: error.message,
                stack: error.stack,
                type: error.constructor.name
            });

            // Analyze error for specific issues
            const errorMsg = error.message || '';
            
            if (errorMsg.includes('402')) {
                logger.error('💰 402 Payment Required - ActionKit not available on trial plan', {
                    solution: 'Need to use Proxy API instead of ActionKit for gmail_send_email'
                });
            }
            
            if (errorMsg.includes('JWT') || errorMsg.includes('token')) {
                logger.error('🔑 JWT/Token generation issue', {
                    solution: 'Check generateUserToken() method in Paragon MCP server'
                });
            }

            if (errorMsg.includes('not found') || errorMsg.includes('undefined')) {
                logger.error('🔍 Tool not found or undefined', {
                    solution: 'Check if gmail_send_email tool is properly registered'
                });
            }

            throw error;
        }
    }

    async analyzeJWTGeneration() {
        logger.info('\n========================================');
        logger.info('🔑 ANALYZING JWT TOKEN GENERATION');
        logger.info('========================================\n');

        try {
            // Try to trigger JWT generation by calling a Paragon tool
            const testUserId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
            
            logger.info('🔍 Testing JWT generation for user:', testUserId);

            // Call a simple tool that requires auth to see JWT generation
            const result = await this.mcpClient.invokeTool('get_authenticated_services', {
                user_id: testUserId
            });

            logger.info('📊 Integration list result (tests JWT):', {
                success: !result.isError,
                integrations: result.content ? JSON.parse(result.content[0].text) : null
            });

            return result;
        } catch (error) {
            logger.error('❌ JWT analysis failed', {
                error: error.message,
                hint: 'This might indicate JWT generation issues'
            });
        }
    }

    async checkProxyAPIAvailability() {
        logger.info('\n========================================');
        logger.info('🔄 CHECKING PROXY API AVAILABILITY');
        logger.info('========================================\n');

        try {
            // Check if Proxy API tools are available
            const tools = await this.mcpClient.getAvailableTools();
            
            const proxyTools = tools.filter(t => 
                t.description?.includes('Proxy') || 
                t.name.includes('proxy')
            );

            const actionKitTools = tools.filter(t => 
                t.description?.includes('ActionKit') || 
                t.name.includes('actionkit')
            );

            logger.info('📊 Tool distribution:', {
                totalTools: tools.length,
                proxyTools: proxyTools.length,
                actionKitTools: actionKitTools.length,
                gmailTools: tools.filter(t => t.name.includes('gmail')).length
            });

            // Check specific Gmail tools
            const gmailSend = tools.find(t => t.name === 'gmail_send_email');
            const gmailGet = tools.find(t => t.name === 'gmail_get_emails');
            const gmailSearch = tools.find(t => t.name === 'gmail_search_emails');

            logger.info('📧 Gmail tool implementation:', {
                send: gmailSend ? 'Available' : 'Not found',
                sendDescription: gmailSend?.description?.substring(0, 100),
                get: gmailGet ? 'Available' : 'Not found',
                search: gmailSearch ? 'Available' : 'Not found'
            });

            if (gmailSend && gmailSend.description?.includes('ActionKit')) {
                logger.warn('⚠️ gmail_send_email uses ActionKit - will fail on trial plan!');
                logger.info('💡 Solution: Modify to use Proxy API like gmail_get_emails does');
            }

            return { proxyTools, actionKitTools };
        } catch (error) {
            logger.error('❌ Failed to check Proxy API availability', {
                error: error.message
            });
        }
    }

    async run() {
        try {
            // Initialize
            const initialized = await this.initialize();
            if (!initialized) {
                logger.error('❌ Failed to initialize, exiting...');
                process.exit(1);
            }

            // Check Proxy API availability first
            await this.checkProxyAPIAvailability();

            // Analyze JWT generation
            await this.analyzeJWTGeneration();

            // Test sending email (restricted to 1)
            await this.testSendEmail();

            logger.info('\n========================================');
            logger.info('✅ TEST COMPLETED');
            logger.info('========================================\n');

            logger.info('📋 Summary:');
            logger.info('1. Check the logs above for JWT token issues');
            logger.info('2. Look for 402 ActionKit errors');
            logger.info('3. Verify if Proxy API is available as fallback');
            logger.info('4. The solution is likely to modify gmail_send_email to use Proxy API');

        } catch (error) {
            logger.error('❌ Test suite failed', {
                error: error.message,
                stack: error.stack
            });
        } finally {
            // Cleanup
            if (this.mcpClient) {
                await this.mcpClient.disconnect();
            }
            
            // Give time for logs to flush
            setTimeout(() => process.exit(0), 1000);
        }
    }
}

// Run the test
const tester = new EmailSendTester();
tester.run().catch(error => {
    logger.error('❌ Unhandled error:', error);
    process.exit(1);
});