// Tutorial flows for the desktop Leviousa app

// Welcome tutorial for first-time users - proper guided tour
export const welcomeTutorial = {
    id: 'welcome',
    name: 'Welcome to Leviousa',
    description: 'Learn the basics of your AI assistant',
    priority: 1,
    triggers: {
        onFirstTime: true,
        onAppStart: true,
    },
    steps: [
        {
            id: 'welcome-1',
            target: 'body',
            title: 'Welcome to Leviousa! 🚀',
            content: 'Your personal AI assistant is ready to help! Let\'s take a quick tour to show you the powerful features. We\'ll guide you through different parts of the app.',
            position: 'center',
            showPrevious: false,
        },
        {
            id: 'welcome-2',
            target: 'body',
            title: 'Ask Mode - AI Chat',
            content: 'Click the "Ask" button in the header to chat with your AI assistant. Type any question or request, and get intelligent responses with actionable suggestions.',
            position: 'center',
        },
        {
            id: 'welcome-3',
            target: 'body',
            title: 'Keyboard Shortcuts',
            content: 'Use keyboard shortcuts for quick access: Cmd+L for instant help, Cmd+I for invisibility, and F1 to open this tutorial menu anytime.',
            position: 'center',
        },
        {
            id: 'welcome-4',
            target: 'body',
            title: 'Listen Mode - Voice Conversations',
            content: 'Click "Listen" in the header for voice conversations. Speak naturally and get AI responses back. Perfect for hands-free interaction while working.',
            position: 'center',
        },
        {
            id: 'welcome-5',
            target: 'body',
            title: 'Invisibility Mode',
            content: 'Click "Invisibility" to hide Leviousa during screen sharing or when you need privacy. Use Cmd+I to toggle invisibility quickly.',
            position: 'center',
        },
        {
            id: 'welcome-6',
            target: 'body',
            title: 'Settings & Customization',
            content: 'Hover over the three dots (⋮) to access settings. Here you can add API keys, create conversation presets, and connect external services like Gmail and Calendar.',
            position: 'center',
        },
        {
            id: 'welcome-7',
            target: 'body',
            title: 'You\'re All Set! 🎉',
            content: 'That\'s the complete tour! Your AI assistant is ready to help with questions, tasks, and automation. You can access help anytime by pressing F1 or clicking the help button.',
            position: 'center',
        },
    ],
};

// Ask view tutorial
export const askTutorial = {
    id: 'ask-features',
    name: 'AI Chat Features',
    description: 'Master the AI conversation interface',
    priority: 2,
    triggers: {
        manual: true,
        onView: 'ask',
    },
    steps: [
        {
            id: 'ask-1',
            target: '[data-tutorial="text-input-container"]',
            title: 'Smart Text Input',
            content: 'Type naturally - your AI understands context, previous conversations, and can suggest relevant actions based on what you\'re discussing.',
            position: 'top',
        },
        {
            id: 'ask-2',
            target: '[data-tutorial="response-container"]',
            title: 'Interactive Responses',
            content: 'Responses are more than just text. Look for action buttons that let you send emails, save notes, or schedule meetings directly from the conversation.',
            position: 'top',
        },
        {
            id: 'ask-3',
            target: '[data-tutorial="mcp-action-bar"]',
            title: 'Smart Actions',
            content: 'These action buttons appear automatically based on your conversation. They connect to your integrated services like Gmail, Calendar, and Notion.',
            position: 'top',
            waitForElement: true,
        },
        {
            id: 'ask-4',
            target: '[data-tutorial="conversation-history"]',
            title: 'Conversation Memory',
            content: 'Your AI remembers the conversation context. You can refer to previous topics, and it will understand what you\'re talking about.',
            position: 'right',
            waitForElement: true,
        },
    ],
};

// Listen view tutorial  
export const listenTutorial = {
    id: 'voice-features',
    name: 'Voice Conversations',
    description: 'Learn how to have natural voice chats with AI',
    priority: 3,
    triggers: {
        manual: true,
        onView: 'listen',
    },
    steps: [
        {
            id: 'listen-1',
            target: '.listen-container',
            title: 'Voice Interface',
            content: 'This is your voice conversation interface. Have natural, flowing conversations with your AI assistant using your voice.',
            position: 'top',
        },
        {
            id: 'listen-2',
            target: '.recording-controls',
            title: 'Recording Controls',
            content: 'Use these controls to start/stop recording, or use keyboard shortcuts. The AI can hear and understand natural speech patterns.',
            position: 'bottom',
            waitForElement: true,
        },
        {
            id: 'listen-3',
            target: '.transcript-display',
            title: 'Live Transcription',
            content: 'Watch your words appear in real-time as you speak. The transcription is highly accurate and understands different accents and speaking styles.',
            position: 'left',
            waitForElement: true,
        },
        {
            id: 'listen-4',
            target: '.summary-section',
            title: 'Intelligent Summaries',
            content: 'After conversations, get AI-generated summaries with key points, action items, and suggested follow-ups.',
            position: 'top',
            waitForElement: true,
        },
    ],
};

// Settings tutorial
export const settingsTutorial = {
    id: 'settings-customization',
    name: 'Customizing Leviousa',
    description: 'Personalize your AI assistant for better results',
    priority: 4,
    triggers: {
        manual: true,
        onView: 'settings',
    },
    steps: [
        {
            id: 'settings-1',
            target: '.settings-container',
            title: 'Settings Overview',
            content: 'Customize Leviousa to work perfectly for your needs. Set up API keys, adjust behavior, and connect your preferred services.',
            position: 'right',
        },
        {
            id: 'settings-2',
            target: '.api-key-section',
            title: 'AI Provider Setup',
            content: 'Add your API keys for different AI providers like OpenAI, Anthropic, or use local models. This determines which AI powers your conversations.',
            position: 'right',
            waitForElement: true,
        },
        {
            id: 'settings-3',
            target: '.preset-list',
            title: 'Conversation Presets',
            content: 'Create and manage conversation presets for different contexts - work, personal, creative projects. Each preset can have different AI behavior and instructions.',
            position: 'right',
            waitForElement: true,
        },
        {
            id: 'settings-4',
            target: '.invisibility-settings',
            title: 'Privacy & Invisibility',
            content: 'Control how Leviousa interacts with your system. Enable invisibility mode for completely private interactions that don\'t interfere with other apps.',
            position: 'right',
            waitForElement: true,
        },
        {
            id: 'settings-5',
            target: '.mcp-settings',
            title: 'Service Integrations',
            content: 'Connect external services like Gmail, Calendar, Notion, and more. This enables your AI to perform actions across your digital workspace.',
            position: 'right',
            waitForElement: true,
        },
    ],
};

// Advanced features tutorial
export const advancedTutorial = {
    id: 'advanced-features',
    name: 'Advanced AI Features',
    description: 'Unlock the full power of your AI assistant',
    priority: 5,
    triggers: {
        manual: true,
    },
    steps: [
        {
            id: 'advanced-1',
            target: 'body',
            title: 'Screen Understanding',
            content: 'Your AI can analyze what\'s on your screen to provide contextual help. It can read text, understand interfaces, and suggest relevant actions.',
            position: 'center',
        },
        {
            id: 'advanced-2',
            target: 'body',
            title: 'Keyboard Shortcuts',
            content: 'Use keyboard shortcuts for lightning-fast access. Set up global hotkeys to summon your assistant from anywhere on your computer.',
            position: 'center',
        },
        {
            id: 'advanced-3',
            target: 'body',
            title: 'Automation Workflows',
            content: 'Chain actions together for powerful automation. Your AI can send an email, schedule a meeting, and save notes to Notion in one conversation.',
            position: 'center',
        },
        {
            id: 'advanced-4',
            target: 'body',
            title: 'Privacy & Security',
            content: 'All conversations can be kept completely private. Use local AI models or configure your own API keys for maximum control over your data.',
            position: 'center',
        },
    ],
};

// Quick tips for different contexts
export const quickTips = {
    id: 'quick-tips',
    name: 'Quick Tips',
    description: 'Bite-sized tips to improve your workflow',
    priority: 6,
    triggers: {
        manual: true,
    },
    steps: [
        {
            id: 'tip-1',
            target: 'body',
            title: '💡 Natural Language',
            content: 'Talk to your AI naturally. Instead of "search calendar", try "Do I have any meetings this afternoon?" for better results.',
            position: 'center',
        },
        {
            id: 'tip-2',
            target: 'body',
            title: '💡 Context Matters',
            content: 'Your AI remembers the conversation. You can say "schedule a follow-up about that" and it will understand what "that" refers to.',
            position: 'center',
        },
        {
            id: 'tip-3',
            target: 'body',
            title: '💡 Action Chaining',
            content: 'Ask for multiple things at once: "Draft an email to John about tomorrow\'s meeting and add it to my calendar." Your AI can handle complex requests.',
            position: 'center',
        },
        {
            id: 'tip-4',
            target: 'body',
            title: '💡 Voice Commands',
            content: 'Use voice for hands-free operation. Great for when you\'re driving, cooking, or have your hands full.',
            position: 'center',
        },
    ],
};

// Export all flows
export const allTutorialFlows = [
    welcomeTutorial,
    askTutorial,
    listenTutorial,
    settingsTutorial,
    advancedTutorial,
    quickTips,
];

// Helper function to get tutorial by ID
export function getTutorialById(id) {
    return allTutorialFlows.find(flow => flow.id === id);
}

// Helper function to register all flows with the tutorial service
export function registerAllFlows(tutorialService) {
    allTutorialFlows.forEach(flow => {
        tutorialService.registerFlow(flow);
    });
    console.log('[TutorialFlows] Registered', allTutorialFlows.length, 'tutorial flows');
}
