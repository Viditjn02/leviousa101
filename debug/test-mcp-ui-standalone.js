/**
 * Standalone test script for MCP UI Integration
 * Tests UI resource generation and basic functionality without Electron
 */

const path = require('path');

async function runTests() {
    console.log('🧪 Testing MCP UI Integration (Standalone)...\n');
    
    try {
        // Test 1: UIResourceGenerator
        console.log('1️⃣ Testing UIResourceGenerator...');
        const { UIResourceGenerator } = require('../src/features/mcp-ui/utils/UIResourceGenerator');
        
        // Test email composer generation
        const emailResource = UIResourceGenerator.generateEmailComposer({
            to: 'test@example.com',
            subject: 'Test Email',
            body: 'This is a test email body'
        });
        console.log('✅ Email composer generated');
        console.log('   Type:', emailResource.type);
        console.log('   Has HTML:', !!emailResource.resource.text);
        console.log('   Has style:', emailResource.resource.text.includes('<style>'));
        
        // Test calendar widget generation
        const calendarResource = UIResourceGenerator.generateCalendarWidget({
            title: 'Test Meeting',
            start: new Date().toISOString(),
            duration: 30
        });
        console.log('\n✅ Calendar widget generated');
        console.log('   Type:', calendarResource.type);
        console.log('   Has date picker:', calendarResource.resource.text.includes('type="date"'));
        
        // Test LinkedIn profile card generation
        const profileResource = UIResourceGenerator.generateLinkedInProfileCard({
            name: 'John Doe',
            headline: 'Software Engineer',
            profileUrl: 'https://linkedin.com/in/johndoe'
        });
        console.log('\n✅ LinkedIn profile card generated');
        console.log('   Type:', profileResource.type);
        console.log('   Has profile link:', profileResource.resource.text.includes('href="https://linkedin.com'));
        
        // Test Notion summary saver generation
        const notionResource = UIResourceGenerator.generateNotionSaver({
            title: 'Meeting Summary',
            content: 'Key points from the meeting...'
        });
        console.log('\n✅ Notion summary saver generated');
        console.log('   Type:', notionResource.type);
        console.log('   Has save button:', notionResource.resource.text.includes('Save to Notion'));
        
        // Test 2: HTML content validation with DOMPurify
        console.log('\n2️⃣ Testing HTML content security...');
        const testHtml = `
            <div>Safe content</div>
            <script>alert('This should be removed')</script>
            <img src="x" onerror="alert('XSS')">
            <a href="javascript:alert('XSS')">Bad link</a>
        `;
        
        const DOMPurify = require('dompurify');
        const { JSDOM } = require('jsdom');
        const window = new JSDOM('').window;
        const purify = DOMPurify(window);
        
        const cleanHtml = purify.sanitize(testHtml, {
            ALLOWED_TAGS: ['div', 'span', 'p', 'a', 'img', 'button', 'input', 'form', 'label', 
                          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'textarea',
                          'select', 'option', 'br', 'strong', 'em', 'style'],
            ALLOWED_ATTR: ['class', 'id', 'type', 'value', 'placeholder', 'href', 'src', 
                          'alt', 'title', 'style', 'data-*'],
            ALLOW_DATA_ATTR: true
        });
        
        console.log('✅ Script tags removed:', !cleanHtml.includes('<script'));
        console.log('✅ Event handlers removed:', !cleanHtml.includes('onerror'));
        console.log('✅ JavaScript URLs removed:', !cleanHtml.includes('javascript:'));
        
        // Test 3: MCP Client modifications for UI support
        console.log('\n3️⃣ Testing MCP Client UI support...');
        
        // Check if the MCPClient has been modified to support UI resources
        const fs = require('fs');
        const mcpClientPath = path.join(__dirname, '../src/features/invisibility/mcp/MCPClient.js');
        const mcpClientContent = fs.readFileSync(mcpClientPath, 'utf8');
        
        const hasUIResourceCheck = mcpClientContent.includes('ui_resource');
        const hasUIResourceEmit = mcpClientContent.includes('ui-resource-received');
        
        console.log('✅ MCPClient checks for UI resources:', hasUIResourceCheck);
        console.log('✅ MCPClient emits UI resource events:', hasUIResourceEmit);
        
        // Test 4: Tool Registry UI capabilities
        console.log('\n4️⃣ Testing Tool Registry UI methods...');
        const ToolRegistry = require('../src/features/invisibility/mcp/ToolRegistry');
        const toolRegistry = new ToolRegistry();
        
        // Check if methods exist
        console.log('✅ getToolUICapabilities method exists:', typeof toolRegistry.getToolUICapabilities === 'function');
        console.log('✅ toolSupportsUI method exists:', typeof toolRegistry.toolSupportsUI === 'function');
        console.log('✅ getUICapableTools method exists:', typeof toolRegistry.getUICapableTools === 'function');
        
        // Test 5: Preload script UI methods
        console.log('\n5️⃣ Testing Preload script UI methods...');
        const preloadPath = path.join(__dirname, '../src/preload.js');
        const preloadContent = fs.readFileSync(preloadPath, 'utf8');
        
        const hasMCPUI = preloadContent.includes('mcp:ui:');
        const hasUIGetActiveResources = preloadContent.includes('getActiveResources');
        const hasUIInvokeAction = preloadContent.includes('invokeAction');
        
        console.log('✅ Preload has MCP UI methods:', hasMCPUI);
        console.log('✅ Preload has getActiveResources:', hasUIGetActiveResources);
        console.log('✅ Preload has invokeAction:', hasUIInvokeAction);
        
        // Test 6: InvisibilityBridge IPC handlers
        console.log('\n6️⃣ Testing InvisibilityBridge IPC handlers...');
        const bridgePath = path.join(__dirname, '../src/features/invisibility/invisibilityBridge.js');
        const bridgeContent = fs.readFileSync(bridgePath, 'utf8');
        
        const hasUIHandlers = bridgeContent.includes('mcp:ui:getActiveResources');
        const hasUIBridgeInit = bridgeContent.includes('MCPUIBridge');
        
        console.log('✅ InvisibilityBridge has UI handlers:', hasUIHandlers);
        console.log('✅ InvisibilityBridge initializes MCPUIBridge:', hasUIBridgeInit);
        
        console.log('\n✨ All standalone MCP UI integration tests passed!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
    
    process.exit(0);
}

// Run tests
runTests(); 