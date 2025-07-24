const { EventEmitter } = require('events');
const { execSync } = require('child_process');

class ActionExecutor extends EventEmitter {
    constructor() {
        super();
        this.isInitialized = false;
        this.isExecuting = false;
        this.executionHistory = [];
        
        // Action mappings
        this.actionMappings = {
            click: { 
                patterns: [/click\s+(.+)/i, /press\s+(.+)/i, /tap\s+(.+)/i],
                handler: 'executeClick'
            },
            type: {
                patterns: [/type\s+(.+)/i, /enter\s+(.+)/i, /input\s+(.+)/i, /write\s+(.+)/i],
                handler: 'executeType'
            },
            scroll: {
                patterns: [/scroll\s+(up|down|left|right)/i, /scroll\s+(.+)/i],
                handler: 'executeScroll'
            },
            select: {
                patterns: [/select\s+(.+)/i, /choose\s+(.+)/i, /pick\s+(.+)/i],
                handler: 'executeSelect'
            },
            open: {
                patterns: [/open\s+(.+)/i, /launch\s+(.+)/i, /start\s+(.+)/i],
                handler: 'executeOpen'
            },
            close: {
                patterns: [/close\s+(.+)/i, /quit\s+(.+)/i, /exit\s+(.+)/i],
                handler: 'executeClose'
            },
            navigate: {
                patterns: [/go\s+to\s+(.+)/i, /navigate\s+to\s+(.+)/i, /visit\s+(.+)/i],
                handler: 'executeNavigate'
            },
            search: {
                patterns: [/search\s+for\s+(.+)/i, /find\s+(.+)/i, /look\s+for\s+(.+)/i],
                handler: 'executeSearch'
            },
            wait: {
                patterns: [/wait\s+(\d+)\s*seconds?/i, /pause\s+(\d+)/i, /delay\s+(\d+)/i],
                handler: 'executeWait'
            },
            keypress: {
                patterns: [/press\s+(enter|return|escape|tab|space|delete|backspace)/i, /hit\s+(.+)/i],
                handler: 'executeKeypress'
            },
            invisibility: {
                patterns: [
                    /detect.*questions?.*answer/i,
                    /answer.*questions?.*screen/i,
                    /find.*questions?.*type.*answers?/i,
                    /auto.*answer/i,
                    /help.*with.*questions?/i,
                    /answer.*this.*question/i,
                    /solve.*this.*problem/i
                ],
                handler: 'executeInvisibilityCommand'
            }
        };
        
        // Common UI selectors and strategies
        this.selectionStrategies = {
            byText: { priority: 9, method: 'findByText' },
            byPosition: { priority: 7, method: 'findByPosition' },
            byType: { priority: 8, method: 'findByType' },
            byAccessibility: { priority: 8, method: 'findByAccessibility' },
            byIndex: { priority: 5, method: 'findByIndex' }
        };
        
        this.config = {
            retryAttempts: 3,
            retryDelay: 1000,
            clickDelay: 100,
            typeDelay: 50,
            scrollDelay: 200,
            confirmActions: false,
            fallbackToManualSelection: true,
            useSmartWaiting: true,
            maxActionTimeout: 30000
        };
        
        console.log('[ActionExecutor] Initialized');
    }

    async initialize() {
        if (this.isInitialized) {
            console.log('[ActionExecutor] Already initialized');
            return { success: true };
        }

        try {
            console.log('[ActionExecutor] Initializing action executor...');
            
            // Verify accessibility permissions
            await this.checkActionPermissions();
            
            this.isInitialized = true;
            console.log('[ActionExecutor] ✅ Action executor initialized');
            
            return { success: true };
            
        } catch (error) {
            console.error('[ActionExecutor] ❌ Failed to initialize:', error);
            return { success: false, error: error.message };
        }
    }

    async checkActionPermissions() {
        try {
            const script = `
                tell application "System Events"
                    try
                        set frontApp to name of first application process whose frontmost is true
                        return "granted"
                    on error
                        return "denied"
                    end try
                end tell
            `;
            
            const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' }).trim();
            
            if (result === 'denied') {
                throw new Error('Accessibility permissions required for UI automation');
            }
            
            console.log('[ActionExecutor] ✅ Action permissions verified');
            
        } catch (error) {
            console.error('[ActionExecutor] Permission check failed:', error);
            throw error;
        }
    }

    async executeCommand(commandAnalysis, screenAnalysis) {
        if (this.isExecuting) {
            return { success: false, error: 'Another action is currently executing' };
        }

        try {
            this.isExecuting = true;
            
            console.log('[ActionExecutor] 🎯 Executing command:', commandAnalysis.originalText);
            
            // Determine the action type and parameters
            const actionPlan = await this.planAction(commandAnalysis, screenAnalysis);
            
            if (!actionPlan.actionType) {
                return { success: false, error: 'Could not determine action type' };
            }
            
            // Execute the action with retries
            const result = await this.executeWithRetries(actionPlan);
            
            // Record execution
            this.recordExecution(commandAnalysis, actionPlan, result);
            
            this.emit('action-completed', result);
            return result;
            
        } catch (error) {
            console.error('[ActionExecutor] Action execution failed:', error);
            const errorResult = { success: false, error: error.message };
            this.emit('action-failed', errorResult);
            return errorResult;
            
        } finally {
            this.isExecuting = false;
        }
    }

    async planAction(commandAnalysis, screenAnalysis) {
        const text = commandAnalysis.originalText.toLowerCase();
        
        // Find matching action pattern
        let actionType = null;
        let extractedParams = null;
        
        for (const [action, config] of Object.entries(this.actionMappings)) {
            for (const pattern of config.patterns) {
                const match = text.match(pattern);
                if (match) {
                    actionType = action;
                    extractedParams = match.slice(1); // Extract captured groups
                    break;
                }
            }
            if (actionType) break;
        }
        
        // Find target elements if needed
        let targetElements = [];
        if (extractedParams && extractedParams.length > 0) {
            const searchTerm = extractedParams[0];
            targetElements = await this.findTargetElements(searchTerm, screenAnalysis, actionType);
        }
        
        return {
            actionType,
            parameters: extractedParams,
            targetElements,
            searchTerm: extractedParams ? extractedParams[0] : null,
            screenContext: screenAnalysis,
            originalCommand: commandAnalysis
        };
    }

    async findTargetElements(searchTerm, screenAnalysis, actionType) {
        if (!screenAnalysis || !screenAnalysis.elements) {
            console.log('[ActionExecutor] No screen analysis available');
            return [];
        }
        
        const candidates = [];
        
        // Try different finding strategies
        for (const [strategy, config] of Object.entries(this.selectionStrategies)) {
            try {
                const found = await this[config.method](searchTerm, screenAnalysis.elements, actionType);
                found.forEach(element => {
                    element.findingStrategy = strategy;
                    element.strategyPriority = config.priority;
                    candidates.push(element);
                });
            } catch (error) {
                console.error(`[ActionExecutor] Strategy ${strategy} failed:`, error);
            }
        }
        
        // Sort by relevance and priority
        return this.rankTargetElements(candidates, searchTerm, actionType);
    }

    findByText(searchTerm, elements, actionType) {
        const searchLower = searchTerm.toLowerCase();
        
        return elements.filter(element => {
            const text = (element.text || '').toLowerCase();
            const title = (element.title || '').toLowerCase();
            const value = (element.value || '').toLowerCase();
            
            return text.includes(searchLower) || 
                   title.includes(searchLower) || 
                   value.includes(searchLower);
        }).map(element => ({
            ...element,
            relevanceScore: this.calculateTextRelevance(element, searchTerm)
        }));
    }

    findByType(searchTerm, elements, actionType) {
        // Find elements that match the expected type for the action
        const expectedTypes = this.getExpectedTypesForAction(actionType);
        
        return elements.filter(element => 
            expectedTypes.includes(element.type)
        ).map(element => ({
            ...element,
            relevanceScore: this.calculateTypeRelevance(element, actionType)
        }));
    }

    findByPosition(searchTerm, elements, actionType) {
        // Find elements by position keywords
        const positionKeywords = {
            top: (el) => el.position.y < 200,
            bottom: (el) => el.position.y > 400,
            left: (el) => el.position.x < 300,
            right: (el) => el.position.x > 500,
            center: (el) => el.position.x > 300 && el.position.x < 500,
            middle: (el) => el.position.y > 200 && el.position.y < 400
        };
        
        const positionMatch = Object.keys(positionKeywords).find(pos => 
            searchTerm.toLowerCase().includes(pos)
        );
        
        if (!positionMatch) return [];
        
        return elements.filter(positionKeywords[positionMatch]).map(element => ({
            ...element,
            relevanceScore: 0.8
        }));
    }

    findByAccessibility(searchTerm, elements, actionType) {
        // Find elements using accessibility properties
        return elements.filter(element => {
            const description = (element.metadata?.description || '').toLowerCase();
            const searchLower = searchTerm.toLowerCase();
            
            return description.includes(searchLower);
        }).map(element => ({
            ...element,
            relevanceScore: 0.9
        }));
    }

    findByIndex(searchTerm, elements, actionType) {
        // Find elements by ordinal position (first, second, last, etc.)
        const ordinals = {
            'first': 0,
            'second': 1,
            'third': 2,
            'last': -1
        };
        
        const ordinalMatch = Object.keys(ordinals).find(ord => 
            searchTerm.toLowerCase().includes(ord)
        );
        
        if (!ordinalMatch) return [];
        
        const filteredElements = elements.filter(el => 
            this.getExpectedTypesForAction(actionType).includes(el.type)
        );
        
        const index = ordinals[ordinalMatch];
        const targetIndex = index === -1 ? filteredElements.length - 1 : index;
        
        if (targetIndex >= 0 && targetIndex < filteredElements.length) {
            return [{
                ...filteredElements[targetIndex],
                relevanceScore: 0.85
            }];
        }
        
        return [];
    }

    rankTargetElements(candidates, searchTerm, actionType) {
        // Remove duplicates and rank by relevance
        const uniqueCandidates = this.deduplicateElements(candidates);
        
        return uniqueCandidates.sort((a, b) => {
            // Primary: strategy priority
            if (a.strategyPriority !== b.strategyPriority) {
                return b.strategyPriority - a.strategyPriority;
            }
            
            // Secondary: relevance score
            if (a.relevanceScore !== b.relevanceScore) {
                return b.relevanceScore - a.relevanceScore;
            }
            
            // Tertiary: element confidence
            return (b.confidence || 0) - (a.confidence || 0);
        }).slice(0, 5); // Top 5 candidates
    }

    deduplicateElements(elements) {
        const seen = new Set();
        return elements.filter(element => {
            const signature = `${element.type}:${element.position?.x}:${element.position?.y}:${element.text}`;
            if (seen.has(signature)) return false;
            seen.add(signature);
            return true;
        });
    }

    getExpectedTypesForAction(actionType) {
        const typeMap = {
            click: ['button', 'link', 'checkbox', 'radioButton', 'tab'],
            type: ['textField'],
            select: ['dropdown', 'menu', 'radioButton', 'checkbox'],
            scroll: ['scrollbar', 'table', 'list'],
            open: ['button', 'link', 'menu'],
            close: ['button'],
            search: ['textField'],
            keypress: ['*'] // Any element can receive key presses
        };
        
        return typeMap[actionType] || ['button', 'textField', 'link'];
    }

    calculateTextRelevance(element, searchTerm) {
        const text = (element.text || '').toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        
        if (text === searchLower) return 1.0;
        if (text.includes(searchLower)) return 0.9;
        if (text.includes(searchLower.split(' ')[0])) return 0.7;
        
        return 0.5;
    }

    calculateTypeRelevance(element, actionType) {
        const expectedTypes = this.getExpectedTypesForAction(actionType);
        const typeIndex = expectedTypes.indexOf(element.type);
        
        return typeIndex >= 0 ? 1.0 - (typeIndex * 0.1) : 0.5;
    }

    async executeWithRetries(actionPlan) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                console.log(`[ActionExecutor] Attempt ${attempt}/${this.config.retryAttempts}`);
                
                const result = await this.executeAction(actionPlan);
                
                if (result.success) {
                    return result;
                }
                
                lastError = result.error;
                
                // Wait before retry
                if (attempt < this.config.retryAttempts) {
                    await this.delay(this.config.retryDelay);
                }
                
            } catch (error) {
                lastError = error.message;
                
                if (attempt < this.config.retryAttempts) {
                    await this.delay(this.config.retryDelay);
                }
            }
        }
        
        return {
            success: false,
            error: `Action failed after ${this.config.retryAttempts} attempts: ${lastError}`,
            attempts: this.config.retryAttempts
        };
    }

    async executeAction(actionPlan) {
        const { actionType, targetElements, parameters } = actionPlan;
        const handlerName = this.actionMappings[actionType]?.handler;
        
        if (!handlerName || !this[handlerName]) {
            throw new Error(`Unknown action handler: ${handlerName}`);
        }
        
        return await this[handlerName](targetElements, parameters, actionPlan);
    }

    async executeClick(targetElements, parameters, actionPlan) {
        if (!targetElements || targetElements.length === 0) {
            return { success: false, error: 'No clickable element found' };
        }
        
        const element = targetElements[0];
        
        try {
            console.log('[ActionExecutor] 🖱️ Clicking element:', element.text || element.type);
            
            const script = `
                tell application "System Events"
                    try
                        set frontApp to first application process whose frontmost is true
                        
                        -- Try clicking by position
                        click at {${element.position.x}, ${element.position.y}}
                        
                        return "success"
                    on error errMsg
                        return "error: " & errMsg
                    end try
                end tell
            `;
            
            const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' }).trim();
            
            if (result === 'success') {
                await this.delay(this.config.clickDelay);
                return {
                    success: true,
                    feedback: `Clicked on ${element.text || element.type}`,
                    element: element
                };
            } else {
                return { success: false, error: result };
            }
            
        } catch (error) {
            console.error('[ActionExecutor] Click failed:', error);
            return { success: false, error: error.message };
        }
    }

    async executeType(targetElements, parameters, actionPlan) {
        const textToType = parameters[0];
        
        if (!textToType) {
            return { success: false, error: 'No text specified to type' };
        }
        
        try {
            console.log('[ActionExecutor] ⌨️ Typing text:', textToType);
            
            let targetElement = null;
            
            // If we have a specific text field, click it first
            if (targetElements && targetElements.length > 0) {
                targetElement = targetElements.find(el => el.type === 'textField') || targetElements[0];
                
                // Click the text field first
                await this.executeClick([targetElement], [], actionPlan);
                await this.delay(200);
            }
            
            // Type the text
            const script = `
                tell application "System Events"
                    try
                        keystroke "${this.escapeText(textToType)}"
                        return "success"
                    on error errMsg
                        return "error: " & errMsg
                    end try
                end tell
            `;
            
            const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' }).trim();
            
            if (result === 'success') {
                return {
                    success: true,
                    feedback: `Typed: ${textToType}`,
                    text: textToType,
                    element: targetElement
                };
            } else {
                return { success: false, error: result };
            }
            
        } catch (error) {
            console.error('[ActionExecutor] Type failed:', error);
            return { success: false, error: error.message };
        }
    }

    async executeScroll(targetElements, parameters, actionPlan) {
        const direction = parameters[0]?.toLowerCase() || 'down';
        
        try {
            console.log('[ActionExecutor] 📜 Scrolling:', direction);
            
            let scrollKey;
            switch (direction) {
                case 'up': scrollKey = 'up arrow'; break;
                case 'down': scrollKey = 'down arrow'; break;
                case 'left': scrollKey = 'left arrow'; break;
                case 'right': scrollKey = 'right arrow'; break;
                default: scrollKey = 'down arrow';
            }
            
            const script = `
                tell application "System Events"
                    try
                        key code 125 -- down arrow key code
                        return "success"
                    on error errMsg
                        return "error: " & errMsg
                    end try
                end tell
            `;
            
            const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' }).trim();
            
            if (result === 'success') {
                return {
                    success: true,
                    feedback: `Scrolled ${direction}`,
                    direction: direction
                };
            } else {
                return { success: false, error: result };
            }
            
        } catch (error) {
            console.error('[ActionExecutor] Scroll failed:', error);
            return { success: false, error: error.message };
        }
    }

    async executeKeypress(targetElements, parameters, actionPlan) {
        const key = parameters[0]?.toLowerCase();
        
        if (!key) {
            return { success: false, error: 'No key specified' };
        }
        
        try {
            console.log('[ActionExecutor] ⌨️ Pressing key:', key);
            
            const keyMap = {
                'enter': 'return',
                'return': 'return',
                'escape': 'escape',
                'tab': 'tab',
                'space': 'space',
                'delete': 'delete',
                'backspace': 'delete'
            };
            
            const appleScriptKey = keyMap[key] || key;
            
            const script = `
                tell application "System Events"
                    try
                        key code 36 -- return key
                        return "success"
                    on error errMsg
                        return "error: " & errMsg
                    end try
                end tell
            `;
            
            const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' }).trim();
            
            if (result === 'success') {
                return {
                    success: true,
                    feedback: `Pressed ${key}`,
                    key: key
                };
            } else {
                return { success: false, error: result };
            }
            
        } catch (error) {
            console.error('[ActionExecutor] Keypress failed:', error);
            return { success: false, error: error.message };
        }
    }

    async executeOpen(targetElements, parameters, actionPlan) {
        const target = parameters[0];
        
        try {
            console.log('[ActionExecutor] 🚀 Opening:', target);
            
            // Try to open as application first
            const script = `
                tell application "System Events"
                    try
                        tell application "${target}" to activate
                        return "success"
                    on error
                        try
                            -- Try opening by path or URL
                            open location "${target}"
                            return "success"
                        on error errMsg
                            return "error: " & errMsg
                        end try
                    end try
                end tell
            `;
            
            const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' }).trim();
            
            if (result === 'success') {
                return {
                    success: true,
                    feedback: `Opened ${target}`,
                    target: target
                };
            } else {
                return { success: false, error: result };
            }
            
        } catch (error) {
            console.error('[ActionExecutor] Open failed:', error);
            return { success: false, error: error.message };
        }
    }

    async executeInvisibilityCommand(targetElements, parameters, actionPlan) {
        try {
            console.log('[ActionExecutor] 🕵️ Executing invisibility command...');
            
            // Access the global invisibility service
            if (!global.invisibilityService) {
                return { 
                    success: false, 
                    error: 'Invisibility service not available' 
                };
            }
            
            // Trigger question detection and auto-answering (voice-triggered)
            await global.invisibilityService.processQuestionAndAnswerVoiceTriggered();
            
            return {
                success: true,
                feedback: "I've detected questions on screen and typed the answers automatically.",
                action: 'invisibility'
            };
            
        } catch (error) {
            console.error('[ActionExecutor] Invisibility command failed:', error);
            return { 
                success: false, 
                error: `Failed to process questions: ${error.message}` 
            };
        }
    }

    async executeWait(targetElements, parameters, actionPlan) {
        const seconds = parseInt(parameters[0]) || 1;
        
        try {
            console.log('[ActionExecutor] ⏰ Waiting:', seconds, 'seconds');
            
            await this.delay(seconds * 1000);
            
            return {
                success: true,
                feedback: `Waited ${seconds} seconds`,
                duration: seconds
            };
            
        } catch (error) {
            console.error('[ActionExecutor] Wait failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Utility methods
    escapeText(text) {
        return text.replace(/"/g, '\\"').replace(/\\/g, '\\\\');
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    recordExecution(command, actionPlan, result) {
        this.executionHistory.push({
            timestamp: Date.now(),
            command: command.originalText,
            actionType: actionPlan.actionType,
            success: result.success,
            feedback: result.feedback,
            error: result.error
        });
        
        // Keep only last 100 executions
        if (this.executionHistory.length > 100) {
            this.executionHistory = this.executionHistory.slice(-100);
        }
    }

    // Configuration and status
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('[ActionExecutor] Configuration updated:', this.config);
    }

    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isExecuting: this.isExecuting,
            config: this.config,
            executionHistory: this.executionHistory.slice(-10), // Last 10 executions
            actionTypes: Object.keys(this.actionMappings)
        };
    }

    // Testing methods
    async test() {
        console.log('[ActionExecutor] 🧪 Running action executor test...');
        
        try {
            // Test basic action planning
            const testCommand = {
                originalText: 'click the button',
                intent: 'click',
                isActionable: true
            };
            
            const testScreen = {
                elements: [
                    {
                        type: 'button',
                        text: 'OK',
                        position: { x: 100, y: 100 },
                        enabled: true
                    }
                ]
            };
            
            const actionPlan = await this.planAction(testCommand, testScreen);
            
            const testResults = {
                success: true,
                actionPlanning: !!actionPlan.actionType,
                targetElements: actionPlan.targetElements.length,
                actionType: actionPlan.actionType,
                availableActions: Object.keys(this.actionMappings).length
            };
            
            console.log('[ActionExecutor] Test results:', testResults);
            return testResults;
            
        } catch (error) {
            console.error('[ActionExecutor] Test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = ActionExecutor; 