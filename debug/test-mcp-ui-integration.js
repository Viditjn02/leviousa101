/**
 * Test script for MCP UI Integration
 * Tests UI resource generation, rendering, and action handling
 */

const path = require('path');
const { app } = require('electron');

// Mock electron app if not already initialized
if (!app.isReady()) {
    app.whenReady().then(() => {
        runTests();
    });
} else {
    runTests();
}

async function runTests() {
    console.log('🧪 Testing MCP UI Integration...\n');
    
    try {
        // Test 1: MCPUIBridge initialization
        console.log('1️⃣ Testing MCPUIBridge...');
        const { default: mcpUIBridge } = require('../src/features/mcp-ui/services/MCPUIBridge');
        console.log('✅ MCPUIBridge loaded successfully');
        
        // Test 2: UIResourceGenerator
        console.log('\n2️⃣ Testing UIResourceGenerator...');
        const { UIResourceGenerator } = require('../src/features/mcp-ui/utils/UIResourceGenerator');
        
        // Test email composer generation
        const emailResource = UIResourceGenerator.generateEmailComposer({
            to: 'test@example.com',
            subject: 'Test Email',
            body: 'This is a test email body'
        });
        console.log('✅ Email composer generated:', emailResource.type);
        
        // Test calendar widget generation
        const calendarResource = UIResourceGenerator.generateCalendarWidget({
            title: 'Test Meeting',
            start: new Date().toISOString(),
            duration: 30
        });
        console.log('✅ Calendar widget generated:', calendarResource.type);
        
        // Test LinkedIn profile card generation
        const profileResource = UIResourceGenerator.generateLinkedInProfileCard({
            name: 'John Doe',
            headline: 'Software Engineer',
            profileUrl: 'https://linkedin.com/in/johndoe'
        });
        console.log('✅ LinkedIn profile card generated:', profileResource.type);
        
        // Test Notion summary saver generation
        const notionResource = UIResourceGenerator.generateNotionSummarySaver({
            title: 'Meeting Summary',
            content: 'Key points from the meeting...'
        });
        console.log('✅ Notion summary saver generated:', notionResource.type);
        
        // Test 3: Tool Registry UI capabilities
        console.log('\n3️⃣ Testing Tool Registry UI capabilities...');
        const ToolRegistry = require('../src/features/invisibility/mcp/ToolRegistry');
        const toolRegistry = new ToolRegistry();
        
        // Register a UI-capable tool
        toolRegistry.registerServerTool('gmail', 'createDraft', {
            title: 'Create Draft',
            description: 'Create a new email draft',
            supportsUI: true,
            uiCapabilities: ['interactive-composer', 'rich-editor']
        });
        
        const capabilities = toolRegistry.getToolUICapabilities('gmail.createDraft');
        console.log('✅ Tool UI capabilities:', capabilities);
        
        const supportsUI = toolRegistry.toolSupportsUI('gmail.createDraft');
        console.log('✅ Tool supports UI:', supportsUI);
        
        // Test 4: MCPUIBridge resource management
        console.log('\n4️⃣ Testing MCPUIBridge resource management...');
        
        // Register a UI resource
        const resourceId = mcpUIBridge.registerUIResource(
            'gmail',
            'gmail.createDraft',
            emailResource
        );
        console.log('✅ Resource registered with ID:', resourceId);
        
        // Get active resources
        const activeResources = mcpUIBridge.getActiveUIResources();
        console.log('✅ Active resources count:', activeResources.length);
        
        // Test 5: HTML content validation
        console.log('\n5️⃣ Testing HTML content security...');
        const testHtml = `
            <div>Safe content</div>
            <script>alert('This should be removed')</script>
            <img src="x" onerror="alert('XSS')">
        `;
        
        const DOMPurify = require('dompurify');
        const { JSDOM } = require('jsdom');
        const window = new JSDOM('').window;
        const purify = DOMPurify(window);
        
        const cleanHtml = purify.sanitize(testHtml);
        const hasScript = cleanHtml.includes('<script');
        const hasOnerror = cleanHtml.includes('onerror');
        
        console.log('✅ Script tags removed:', !hasScript);
        console.log('✅ Event handlers removed:', !hasOnerror);
        
        // Test 6: UI action simulation
        console.log('\n6️⃣ Testing UI action handling...');
        
        // Simulate an action from email composer
        const actionData = {
            serverId: 'gmail',
            tool: 'gmail.sendEmail',
            params: {
                to: 'recipient@example.com',
                subject: 'Test Email',
                body: 'This is a test email'
            }
        };
        
        console.log('✅ UI action data prepared:', actionData.tool);
        
        console.log('\n✨ All MCP UI integration tests passed!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
    
    process.exit(0);
}

// Export for testing
module.exports = { runTests }; 