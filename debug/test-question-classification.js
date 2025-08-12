#!/usr/bin/env node

/**
 * Simple test for Notion question classification
 */

function classifyQuestionType(userPrompt) {
    const lowerPrompt = userPrompt.toLowerCase();
    
    // Enhanced debugging for Notion questions specifically
    const isNotionRelated = lowerPrompt.includes('notion') || 
                           lowerPrompt.match(/\b(pages?|databases?|workspace|content|notes?|documents?)\b.*\b(notion|my workspace)\b/) ||
                           lowerPrompt.match(/\b(what|see|view|show|find|look|check)\b.*\b(in|on|at)\b.*\b(my\s+)?notion\b/);
    
    if (isNotionRelated) {
        console.log(`🔍 NOTION QUESTION DETECTED: "${userPrompt}"`);
        console.log(`🔍 Question contains: ${lowerPrompt.match(/\b(notion|pages?|databases?|workspace|content|notes?|documents?)\b/g)?.join(', ')}`);
    }
    
    // MCP debug and testing questions
    if (lowerPrompt.match(/\b(debug|test|check)\b.*\b(mcp|tools|connections?|integrations?)\b/) ||
        lowerPrompt.match(/\b(mcp|tools)\b.*\b(working|available|status|debug|test)\b/) ||
        lowerPrompt.includes('mcp debug') || lowerPrompt.includes('test mcp') || 
        lowerPrompt.includes('mcp status') || lowerPrompt.includes('check tools')) {
        return 'mcp_debug';
    }
    
    // MCP DATA access questions - these should use MCP tools to access real service data
    // GitHub data access
    if (lowerPrompt.match(/\b(what|list|show|find|get|access)\b.*\b(repos?|repositories|issues?|pull requests?|commits?|branches?|code)\b.*\b(github|my github|git)\b/) ||
        lowerPrompt.match(/\b(github|my github|git)\b.*\b(repos?|repositories|issues?|pull requests?|commits?|branches?|code)\b/) ||
        lowerPrompt.match(/\b(repos?|repositories|issues?|commits?)\b.*\b(in|from|on)\b.*\b(github|git)\b/) ||
        lowerPrompt.includes('my github') && lowerPrompt.match(/\b(repos?|repositories|issues?|pull requests?|commits?|branches?|code)\b/)) {
        return 'github_data_access';
    }
    
    // Notion data access - ENHANCED DETECTION
    if (lowerPrompt.match(/\b(what|list|show|find|get|access|see|view)\b.*\b(pages?|databases?|workspace|content|notes?|documents?)\b.*\b(notion|my workspace)\b/) ||
        lowerPrompt.match(/\b(notion|my workspace)\b.*\b(pages?|databases?|content|notes?|documents?)\b/) ||
        lowerPrompt.match(/\b(pages?|databases?)\b.*\b(in|from|on)\b.*\b(notion|my workspace)\b/) ||
        lowerPrompt.includes('my notion') && lowerPrompt.match(/\b(pages?|databases?|content|workspace|notes?|documents?)\b/) ||
        lowerPrompt.match(/\b(what|see|view|show|find|look|check)\b.*\b(in|on|at)\b.*\b(my\s+)?notion\b/) ||
        lowerPrompt.match(/\b(my\s+)?notion\b.*\b(data|content|info|information|workspace)\b/) ||
        lowerPrompt.includes('notion workspace') || lowerPrompt.includes('notion data')) {
        
        console.log(`✅ CLASSIFIED AS NOTION_DATA_ACCESS: "${userPrompt}"`);
        return 'notion_data_access';
    }
    
    // Log if Notion-related but not classified as notion_data_access
    if (isNotionRelated) {
        console.log(`⚠️ NOTION QUESTION NOT CLASSIFIED AS notion_data_access, continuing with other checks...`);
    }
    
    // Slack data access
    if (lowerPrompt.match(/\b(what|list|show|find|get|access)\b.*\b(messages?|channels?|conversations?|users?|workspaces?)\b.*\b(slack|my slack)\b/) ||
        lowerPrompt.match(/\b(slack|my slack)\b.*\b(messages?|channels?|conversations?|users?|workspaces?)\b/) ||
        lowerPrompt.match(/\b(messages?|channels?)\b.*\b(in|from|on)\b.*\b(slack)\b/) ||
        lowerPrompt.includes('my slack') && lowerPrompt.match(/\b(messages?|channels?|conversations?|users?)\b/)) {
        return 'slack_data_access';
    }
    
    // Google Drive/Gmail data access
    if (lowerPrompt.match(/\b(what|list|show|find|get|access)\b.*\b(files?|docs?|emails?|drive|gmail|calendar)\b.*\b(google|my google|drive|gmail)\b/) ||
        lowerPrompt.match(/\b(google|my google|drive|gmail)\b.*\b(files?|docs?|emails?|calendar|documents?)\b/) ||
        lowerPrompt.match(/\b(files?|docs?|emails?)\b.*\b(in|from|on)\b.*\b(google|drive|gmail)\b/) ||
        lowerPrompt.includes('my google') && lowerPrompt.match(/\b(files?|docs?|emails?|drive|calendar)\b/)) {
        return 'google_data_access';
    }
    
    // Generic MCP service data access - catch-all for any connected service
    if (lowerPrompt.match(/\b(what|list|show|find|get|access)\b.*\b(my|from|in)\b.*\b(data|content|files?|information)\b/) ||
        lowerPrompt.match(/\b(what)\b.*\b(services?|integrations?|connections?)\b.*\b(do I have|are connected|can you access)\b/) ||
        lowerPrompt.match(/\b(access|connect to|use)\b.*\b(my|the)\b.*\b(account|workspace|data|service)\b/)) {
        return 'mcp_data_access';
    }
    
    // MCP capability questions - when user asks about what the system can do
    if (lowerPrompt.match(/\b(what can you do|capabilities|mcp|model context protocol|what do you do|what are you|features|integrations|tools available|what tools|connect to|integration)\b/) ||
        lowerPrompt.includes('can you') && lowerPrompt.match(/\b(notion|github|slack|database|api|file|search|browse)\b/)) {
        return 'mcp_capabilities';
    }
    
    // Service integration setup questions - about connecting or configuring any service
    if (lowerPrompt.match(/\b(notion|github|slack|google|drive|gmail|jira|linear)\b/) && 
        (lowerPrompt.includes('setup') || lowerPrompt.includes('connect') || lowerPrompt.includes('integrate') ||
         lowerPrompt.includes('configure') || lowerPrompt.includes('auth') || lowerPrompt.includes('login'))) {
        return 'service_integration';
    }

    // Screen context questions - about visible content
    if (lowerPrompt.match(/\b(what|describe|explain|see|view|screen|this|here|that|it)\b.*\b(on|in|at|see|screen|monitor|display)\b/) ||
        lowerPrompt.match(/\b(what|where|how|why)\b.*\b(this|that|it|here|there)\b/) ||
        lowerPrompt.includes('what is this') || lowerPrompt.includes('what does this') ||
        lowerPrompt.includes('explain this') || lowerPrompt.includes('what am i') ||
        lowerPrompt.includes('where am i') || lowerPrompt.includes('what\'s on')) {
        return 'screen_context';
    }

    // System status and configuration
    if (lowerPrompt.includes('status') || lowerPrompt.includes('config') || 
        lowerPrompt.includes('setting') || lowerPrompt.includes('setup') ||
        lowerPrompt.includes('auth') || lowerPrompt.includes('oauth') ||
        lowerPrompt.includes('connect') || lowerPrompt.includes('disconnect')) {
        return 'system_status';
    }

    // Programming/coding questions  
    if (lowerPrompt.match(/\b(code|function|class|method|algorithm|program|script|debug|error|bug|syntax)\b/) ||
        lowerPrompt.match(/\b(python|javascript|java|react|node|html|css|sql|database|api)\b/) ||
        lowerPrompt.includes('how to') && lowerPrompt.match(/\b(code|program|implement|build|create|make)\b/)) {
        return 'coding';
    }

    // Interview questions
    if (lowerPrompt.match(/\b(interview|tell me about|describe your|experience with|strength|weakness|why should we|why do you want)\b/) ||
        lowerPrompt.includes('can you walk me through') ||
        lowerPrompt.includes('what would you do if')) {
        return 'interview';
    }

    // Technical explanations
    if (lowerPrompt.match(/\b(how does|what is|explain|define|difference between|compare|technical)\b/) ||
        lowerPrompt.includes('how it works') || lowerPrompt.includes('what happens when')) {
        return 'technical';
    }

    // Math questions
    if (lowerPrompt.match(/\b(calculate|solve|equation|formula|math|mathematics|number|sum|average|percentage)\b/) ||
        lowerPrompt.match(/\b(\d+\s*[\+\-\*\/]\s*\d+)\b/) ||
        lowerPrompt.includes('what is') && lowerPrompt.match(/\b(\d+)\b/)) {
        return 'math';
    }

    // Help and conversation
    if (lowerPrompt.match(/\b(help|assist|support|question|ask|thanks|thank you|please|can you)\b/) ||
        lowerPrompt.includes('i need') || lowerPrompt.includes('can you help')) {
        return 'help_conversation';
    }

    return 'general';
}

console.log('🧪 Testing Notion Question Classification...\n');

const testQuestions = [
    "What do you see in my notion?",
    "Show me my notion pages", 
    "What's in my notion workspace?",
    "List my notion databases",
    "What notion content do I have?",
    "Check my notion data",
    "Find pages in notion",
    "Access my notion workspace",
    "What notion information is available?",
    "Look at my notion",
    "See what's in notion",
    "View my notion content",
    "notion workspace data",
    "my notion pages"
];

console.log('Testing each question:');
testQuestions.forEach((question, index) => {
    console.log(`\n${index + 1}. "${question}"`);
    const type = classifyQuestionType(question);
    console.log(`   → Classified as: ${type}`);
    
    if (type === 'notion_data_access') {
        console.log('   ✅ CORRECT: Should trigger Notion MCP');
    } else {
        console.log('   ❌ WRONG: Should have been notion_data_access');
    }
});

console.log('\n📊 Summary:');
console.log('All questions should be classified as "notion_data_access" to trigger MCP.');
console.log('If any are classified differently, the regex patterns need adjustment.'); 