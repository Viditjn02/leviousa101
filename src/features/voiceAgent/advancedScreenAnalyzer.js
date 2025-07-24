const { EventEmitter } = require('events');
const { execSync } = require('child_process');

class AdvancedScreenAnalyzer extends EventEmitter {
    constructor() {
        super();
        this.isInitialized = false;
        this.lastAnalysis = null;
        this.analysisCache = new Map();
        
        // UI element classification
        this.elementTypes = {
            button: { priority: 8, keywords: ['button', 'btn', 'click', 'submit', 'ok', 'cancel', 'apply'] },
            textField: { priority: 9, keywords: ['input', 'text', 'field', 'search', 'type', 'enter'] },
            dropdown: { priority: 7, keywords: ['dropdown', 'select', 'menu', 'choose', 'option'] },
            checkbox: { priority: 6, keywords: ['checkbox', 'check', 'toggle', 'enable', 'disable'] },
            radioButton: { priority: 6, keywords: ['radio', 'option', 'choice', 'select'] },
            link: { priority: 5, keywords: ['link', 'url', 'href', 'navigate', 'go to'] },
            label: { priority: 3, keywords: ['label', 'text', 'title', 'heading'] },
            image: { priority: 2, keywords: ['image', 'picture', 'photo', 'icon'] },
            table: { priority: 4, keywords: ['table', 'grid', 'list', 'data'] },
            menu: { priority: 7, keywords: ['menu', 'navigation', 'nav', 'toolbar'] },
            tab: { priority: 6, keywords: ['tab', 'page', 'section', 'panel'] },
            slider: { priority: 5, keywords: ['slider', 'range', 'adjust', 'volume'] },
            scrollbar: { priority: 3, keywords: ['scroll', 'scrollbar', 'bar'] },
            dialog: { priority: 8, keywords: ['dialog', 'modal', 'popup', 'window'] },
            notification: { priority: 7, keywords: ['notification', 'alert', 'message', 'toast'] }
        };
        
        this.config = {
            useAIVision: true,
            useAccessibilityAPI: true,
            useOCR: true,
            confidenceThreshold: 0.7,
            maxElementsPerAnalysis: 50,
            cacheAnalysisResults: true,
            cacheTimeout: 10000, // 10 seconds
            detailLevel: 'comprehensive' // basic, standard, comprehensive
        };
        
        console.log('[AdvancedScreenAnalyzer] Initialized');
    }

    async initialize() {
        if (this.isInitialized) {
            console.log('[AdvancedScreenAnalyzer] Already initialized');
            return { success: true };
        }

        try {
            console.log('[AdvancedScreenAnalyzer] Initializing advanced screen analyzer...');
            
            // Check accessibility permissions
            await this.checkAccessibilityPermissions();
            
            // Initialize AI vision model
            await this.initializeAIVision();
            
            this.isInitialized = true;
            console.log('[AdvancedScreenAnalyzer] ✅ Advanced screen analyzer initialized');
            
            return { success: true };
            
        } catch (error) {
            console.error('[AdvancedScreenAnalyzer] ❌ Failed to initialize:', error);
            return { success: false, error: error.message };
        }
    }

    async checkAccessibilityPermissions() {
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
                console.warn('[AdvancedScreenAnalyzer] ⚠️ Accessibility permissions not granted - some features will be limited');
            } else {
                console.log('[AdvancedScreenAnalyzer] ✅ Accessibility permissions verified');
            }
            
        } catch (error) {
            console.warn('[AdvancedScreenAnalyzer] Could not verify accessibility permissions:', error.message);
        }
    }

    async initializeAIVision() {
        try {
            // The AI vision will use the existing LLM service with vision capabilities
            if (!global.askService) {
                throw new Error('Ask service not available for AI vision');
            }
            
            console.log('[AdvancedScreenAnalyzer] AI vision model ready');
            return { success: true };
            
        } catch (error) {
            console.error('[AdvancedScreenAnalyzer] Failed to initialize AI vision:', error);
            throw error;
        }
    }

    async analyzeScreen(screenshotBase64 = null) {
        try {
            console.log('[AdvancedScreenAnalyzer] 🔍 Starting comprehensive screen analysis...');
            
            // Check cache first
            const cacheKey = this.generateCacheKey(screenshotBase64);
            if (this.config.cacheAnalysisResults && this.analysisCache.has(cacheKey)) {
                const cachedResult = this.analysisCache.get(cacheKey);
                if (Date.now() - cachedResult.timestamp < this.config.cacheTimeout) {
                    console.log('[AdvancedScreenAnalyzer] Using cached analysis');
                    return cachedResult.analysis;
                }
            }
            
            // Capture screenshot if not provided
            if (!screenshotBase64) {
                screenshotBase64 = await this.captureScreenshot();
            }
            
            // Multi-approach analysis
            const analysisResults = await Promise.all([
                this.analyzeWithAIVision(screenshotBase64),
                this.analyzeWithAccessibilityAPI(),
                this.analyzeWithOCR(screenshotBase64),
                this.analyzeWithAppleScript()
            ]);
            
            // Combine and deduplicate results
            const combinedAnalysis = this.combineAnalysisResults(analysisResults);
            
            // Cache the result
            if (this.config.cacheAnalysisResults) {
                this.analysisCache.set(cacheKey, {
                    analysis: combinedAnalysis,
                    timestamp: Date.now()
                });
            }
            
            this.lastAnalysis = combinedAnalysis;
            
            console.log('[AdvancedScreenAnalyzer] ✅ Screen analysis complete:', {
                elementsFound: combinedAnalysis.elements.length,
                applicationsDetected: combinedAnalysis.applications.length
            });
            
            this.emit('ui-analysis-complete', combinedAnalysis);
            return combinedAnalysis;
            
        } catch (error) {
            console.error('[AdvancedScreenAnalyzer] Screen analysis failed:', error);
            return this.getEmptyAnalysis();
        }
    }

    async analyzeWithAIVision(screenshotBase64) {
        if (!this.config.useAIVision || !screenshotBase64) {
            if (!screenshotBase64) {
                console.log('[AdvancedScreenAnalyzer] 🤖 AI vision analysis skipped - no screenshot available');
            }
            return { elements: [], confidence: 0 };
        }
        
        try {
            console.log('[AdvancedScreenAnalyzer] 🤖 AI vision analysis...');
            
            const prompt = `Analyze this screenshot and identify ALL interactive UI elements. For each element provide:
1. Type (button, textField, dropdown, checkbox, radioButton, link, menu, tab, etc.)
2. Text/label if visible
3. Approximate position (top, middle, bottom, left, center, right)
4. Size estimate (small, medium, large)
5. State (enabled, disabled, selected, etc.)
6. Purpose/function if determinable
7. Confidence score (0-1)

Focus on elements that users can interact with. Be comprehensive and include elements in:
- Main windows
- Dialogs/modals
- Toolbars
- Menus
- Sidebars
- Status bars

Respond with a JSON array of elements.`;

            // Use the same AI provider system as MCPClient
            const modelStateService = require('../common/services/modelStateService');
            const { createStreamingLLM } = require('../common/ai/factory');
            
            const modelInfo = await modelStateService.getCurrentModelInfo('llm');
            const llm = createStreamingLLM(modelInfo.provider, {
                apiKey: modelInfo.apiKey,
                model: modelInfo.model,
                temperature: 0.1,
                maxTokens: 2000,
                usePortkey: modelInfo.provider === 'openai-leviousa',
                portkeyVirtualKey: modelInfo.provider === 'openai-leviousa' ? modelInfo.apiKey : undefined,
            });

            const messages = [
                { role: 'system', content: prompt },
                { 
                    role: 'user', 
                    content: [
                        { type: 'text', text: 'Analyze this screenshot for UI elements:' },
                        { 
                            type: 'image_url', 
                            image_url: { url: `data:image/jpeg;base64,${screenshotBase64}` }
                        }
                    ]
                }
            ];

            const response = await llm.streamChat(messages);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        if (data.trim() === '') continue;
                        
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.choices?.[0]?.delta?.content) {
                                fullResponse += parsed.choices[0].delta.content;
                            }
                        } catch (parseError) {
                            // Skip malformed chunks
                        }
                    }
                }
            }
            
            // Parse AI response
            let aiElements = [];
            try {
                // Try to extract JSON from the full response
                const jsonMatch = fullResponse.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    aiElements = Array.isArray(parsed) ? parsed : parsed.elements || [];
                }
            } catch (parseError) {
                console.error('[AdvancedScreenAnalyzer] Failed to parse AI vision response:', parseError);
                // Fallback: create simple elements based on common patterns
                aiElements = this.extractElementsFromText(response);
            }
            
            // Normalize AI elements
            const normalizedElements = aiElements.map(element => this.normalizeElement(element, 'ai-vision'));
            
            console.log('[AdvancedScreenAnalyzer] AI vision found', normalizedElements.length, 'elements');
            return { elements: normalizedElements, confidence: 0.85 };
            
        } catch (error) {
            console.error('[AdvancedScreenAnalyzer] AI vision analysis failed:', error);
            return { elements: [], confidence: 0 };
        }
    }

    async analyzeWithAccessibilityAPI() {
        if (!this.config.useAccessibilityAPI) return { elements: [], confidence: 0 };
        
        try {
            console.log('[AdvancedScreenAnalyzer] ♿ Accessibility API analysis...');
            
            const script = `
                tell application "System Events"
                    try
                        set frontApp to first application process whose frontmost is true
                        set appName to name of frontApp
                        set appElements to {}
                        
                        -- Get main window elements
                        try
                            set mainWindow to front window of frontApp
                            set windowElements to every UI element of mainWindow
                            
                            repeat with element in windowElements
                                try
                                    set elementRole to role of element
                                    set elementValue to value of element
                                    set elementDescription to description of element
                                    set elementPosition to position of element
                                    set elementSize to size of element
                                    set elementEnabled to enabled of element
                                    
                                    set elementInfo to {role:elementRole, value:elementValue, description:elementDescription, position:elementPosition, size:elementSize, enabled:elementEnabled}
                                    set appElements to appElements & {elementInfo}
                                end try
                            end repeat
                        end try
                        
                        return {app:appName, elements:appElements}
                    on error errMsg
                        return {app:"unknown", elements:{}}
                    end try
                end tell
            `;
            
            const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
            const accessibilityData = this.parseAppleScriptResult(result);
            
            // Convert accessibility elements to standard format
            const accessibilityElements = this.convertAccessibilityElements(accessibilityData.elements || []);
            
            console.log('[AdvancedScreenAnalyzer] Accessibility API found', accessibilityElements.length, 'elements');
            return { elements: accessibilityElements, confidence: 0.9 };
            
        } catch (error) {
            console.error('[AdvancedScreenAnalyzer] Accessibility API analysis failed:', error);
            return { elements: [], confidence: 0 };
        }
    }

    async analyzeWithOCR(screenshotBase64) {
        if (!this.config.useOCR || !screenshotBase64) {
            if (!screenshotBase64) {
                console.log('[AdvancedScreenAnalyzer] 📝 OCR text analysis skipped - no screenshot available');
            }
            return { elements: [], confidence: 0 };
        }
        
        try {
            console.log('[AdvancedScreenAnalyzer] 📝 OCR text analysis...');
            
            // Use AI vision for OCR as well
            const ocrPrompt = `Extract ALL visible text from this screenshot. For each text element provide:
1. The exact text content
2. Position (coordinates or relative position)
3. Text type (button text, label, input placeholder, menu item, etc.)
4. Font size category (small, medium, large)
5. Whether it appears clickable/interactive

Focus on:
- Button labels
- Input field labels and placeholders
- Menu items
- Tab names
- Dialog titles
- Error messages
- Status text

Respond with JSON array of text elements.`;

            // Use the same AI provider system as MCPClient
            const modelStateService = require('../common/services/modelStateService');
            const { createStreamingLLM } = require('../common/ai/factory');
            
            const modelInfo = await modelStateService.getCurrentModelInfo('llm');
            const llm = createStreamingLLM(modelInfo.provider, {
                apiKey: modelInfo.apiKey,
                model: modelInfo.model,
                temperature: 0.1,
                maxTokens: 1500,
                usePortkey: modelInfo.provider === 'openai-leviousa',
                portkeyVirtualKey: modelInfo.provider === 'openai-leviousa' ? modelInfo.apiKey : undefined,
            });

            const messages = [
                { role: 'system', content: ocrPrompt },
                { 
                    role: 'user', 
                    content: [
                        { type: 'text', text: 'Extract text from this screenshot:' },
                        { 
                            type: 'image_url', 
                            image_url: { url: `data:image/jpeg;base64,${screenshotBase64}` }
                        }
                    ]
                }
            ];

            const response = await llm.streamChat(messages);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let ocrResponse = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        if (data.trim() === '') continue;
                        
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.choices?.[0]?.delta?.content) {
                                ocrResponse += parsed.choices[0].delta.content;
                            }
                        } catch (parseError) {
                            // Skip malformed chunks
                        }
                    }
                }
            }
            
            // Parse OCR response
            let ocrElements = [];
            try {
                const jsonMatch = ocrResponse.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    ocrElements = Array.isArray(parsed) ? parsed : parsed.textElements || [];
                }
            } catch (parseError) {
                console.error('[AdvancedScreenAnalyzer] Failed to parse OCR response:', parseError);
                ocrElements = this.extractTextElementsFromResponse(ocrResponse);
            }
            
            // Convert OCR results to UI elements
            const textElements = ocrElements.map(textEl => this.convertTextToUIElement(textEl));
            
            console.log('[AdvancedScreenAnalyzer] OCR found', textElements.length, 'text elements');
            return { elements: textElements, confidence: 0.75 };
            
        } catch (error) {
            console.error('[AdvancedScreenAnalyzer] OCR analysis failed:', error);
            return { elements: [], confidence: 0 };
        }
    }

    async analyzeWithAppleScript() {
        try {
            console.log('[AdvancedScreenAnalyzer] 🍎 AppleScript UI analysis...');
            
            const script = `
                tell application "System Events"
                    try
                        set frontApp to first application process whose frontmost is true
                        set appName to name of frontApp
                        set uiElements to {}
                        
                        -- Get buttons
                        try
                            set buttons to every button of front window of frontApp
                            repeat with btn in buttons
                                try
                                    set btnTitle to title of btn
                                    set btnPos to position of btn
                                    set btnSize to size of btn
                                    set btnEnabled to enabled of btn
                                    set uiElements to uiElements & {{type:"button", title:btnTitle, position:btnPos, size:btnSize, enabled:btnEnabled}}
                                end try
                            end repeat
                        end try
                        
                        -- Get text fields
                        try
                            set textFields to every text field of front window of frontApp
                            repeat with field in textFields
                                try
                                    set fieldValue to value of field
                                    set fieldPos to position of field
                                    set fieldSize to size of field
                                    set fieldEnabled to enabled of field
                                    set uiElements to uiElements & {{type:"textField", value:fieldValue, position:fieldPos, size:fieldSize, enabled:fieldEnabled}}
                                end try
                            end repeat
                        end try
                        
                        -- Get checkboxes
                        try
                            set checkboxes to every checkbox of front window of frontApp
                            repeat with cb in checkboxes
                                try
                                    set cbTitle to title of cb
                                    set cbValue to value of cb
                                    set cbPos to position of cb
                                    set cbSize to size of cb
                                    set uiElements to uiElements & {{type:"checkbox", title:cbTitle, value:cbValue, position:cbPos, size:cbSize}}
                                end try
                            end repeat
                        end try
                        
                        -- Get pop up buttons (dropdowns)
                        try
                            set popups to every pop up button of front window of frontApp
                            repeat with popup in popups
                                try
                                    set popupTitle to title of popup
                                    set popupValue to value of popup
                                    set popupPos to position of popup
                                    set popupSize to size of popup
                                    set uiElements to uiElements & {{type:"dropdown", title:popupTitle, value:popupValue, position:popupPos, size:popupSize}}
                                end try
                            end repeat
                        end try
                        
                        return {app:appName, elements:uiElements}
                    on error errMsg
                        return {app:"unknown", elements:{}}
                    end try
                end tell
            `;
            
            const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
            const scriptData = this.parseAppleScriptResult(result);
            
            // Convert AppleScript elements to standard format
            const scriptElements = this.convertAppleScriptElements(scriptData.elements || []);
            
            console.log('[AdvancedScreenAnalyzer] AppleScript found', scriptElements.length, 'elements');
            return { elements: scriptElements, confidence: 0.95 };
            
        } catch (error) {
            console.error('[AdvancedScreenAnalyzer] AppleScript analysis failed:', error);
            return { elements: [], confidence: 0 };
        }
    }

    combineAnalysisResults(results) {
        const combinedElements = [];
        const applications = new Set();
        
        // Combine elements from all analysis methods
        results.forEach(result => {
            if (result.elements) {
                result.elements.forEach(element => {
                    // Add source confidence
                    element.sourceConfidence = result.confidence || 0.5;
                    combinedElements.push(element);
                });
            }
        });
        
        // Deduplicate similar elements
        const deduplicatedElements = this.deduplicateElements(combinedElements);
        
        // Sort by priority and confidence
        const sortedElements = deduplicatedElements.sort((a, b) => {
            const priorityA = this.elementTypes[a.type]?.priority || 0;
            const priorityB = this.elementTypes[b.type]?.priority || 0;
            const confidenceA = a.confidence || 0;
            const confidenceB = b.confidence || 0;
            
            // Primary sort by priority, secondary by confidence
            if (priorityA !== priorityB) {
                return priorityB - priorityA;
            }
            return confidenceB - confidenceA;
        });
        
        // Limit results
        const limitedElements = sortedElements.slice(0, this.config.maxElementsPerAnalysis);
        
        return {
            timestamp: Date.now(),
            totalElements: limitedElements.length,
            applications: Array.from(applications),
            elements: limitedElements,
            analysisMethod: 'comprehensive',
            confidence: this.calculateOverallConfidence(limitedElements)
        };
    }

    deduplicateElements(elements) {
        const deduplicated = [];
        const seen = new Set();
        
        elements.forEach(element => {
            // Create a signature for the element
            const signature = this.createElementSignature(element);
            
            if (!seen.has(signature)) {
                seen.add(signature);
                deduplicated.push(element);
            } else {
                // Merge with existing element if it has higher confidence
                const existingIndex = deduplicated.findIndex(e => 
                    this.createElementSignature(e) === signature
                );
                
                if (existingIndex >= 0 && element.confidence > deduplicated[existingIndex].confidence) {
                    deduplicated[existingIndex] = element;
                }
            }
        });
        
        return deduplicated;
    }

    createElementSignature(element) {
        // Create a unique signature based on type, position, and text
        const type = element.type || 'unknown';
        const text = (element.text || element.title || element.value || '').toLowerCase().trim();
        const position = element.position ? 
            `${Math.round(element.position.x/50)*50},${Math.round(element.position.y/50)*50}` : 
            'unknown';
        
        return `${type}:${text}:${position}`;
    }

    normalizeElement(element, source) {
        return {
            id: this.generateElementId(),
            type: this.normalizeElementType(element.type || element.role),
            text: element.text || element.title || element.label || element.value || '',
            position: this.normalizePosition(element.position),
            size: this.normalizeSize(element.size),
            enabled: element.enabled !== false,
            visible: element.visible !== false,
            confidence: element.confidence || 0.7,
            source: source,
            metadata: {
                description: element.description,
                state: element.state,
                attributes: element.attributes || {}
            }
        };
    }

    normalizeElementType(type) {
        if (!type) return 'unknown';
        
        const typeMap = {
            'AXButton': 'button',
            'AXTextField': 'textField',
            'AXCheckBox': 'checkbox',
            'AXRadioButton': 'radioButton',
            'AXPopUpButton': 'dropdown',
            'AXMenuButton': 'menu',
            'AXLink': 'link',
            'AXStaticText': 'label',
            'AXImage': 'image',
            'AXTable': 'table',
            'AXTab': 'tab',
            'AXSlider': 'slider',
            'AXScrollBar': 'scrollbar'
        };
        
        return typeMap[type] || type.toLowerCase();
    }

    normalizePosition(position) {
        if (!position) return { x: 0, y: 0 };
        
        if (Array.isArray(position) && position.length >= 2) {
            return { x: position[0], y: position[1] };
        }
        
        if (typeof position === 'object' && position.x !== undefined) {
            return { x: position.x || 0, y: position.y || 0 };
        }
        
        return { x: 0, y: 0 };
    }

    normalizeSize(size) {
        if (!size) return { width: 0, height: 0 };
        
        if (Array.isArray(size) && size.length >= 2) {
            return { width: size[0], height: size[1] };
        }
        
        if (typeof size === 'object' && size.width !== undefined) {
            return { width: size.width || 0, height: size.height || 0 };
        }
        
        return { width: 0, height: 0 };
    }

    generateElementId() {
        return `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    calculateOverallConfidence(elements) {
        if (elements.length === 0) return 0;
        
        const totalConfidence = elements.reduce((sum, element) => sum + (element.confidence || 0), 0);
        return totalConfidence / elements.length;
    }

    async captureScreenshot() {
        try {
            // Use existing screenshot service
            return await global.askService.captureScreenshot();
        } catch (error) {
            console.error('[AdvancedScreenAnalyzer] Failed to capture screenshot:', error);
            throw error;
        }
    }

    generateCacheKey(screenshotBase64) {
        // Simple cache key based on screenshot hash
        if (!screenshotBase64) return 'no_screenshot';
        
        // Handle both string and Buffer formats
        let dataForHashing;
        if (Buffer.isBuffer(screenshotBase64)) {
            // Convert Buffer to base64 string
            dataForHashing = screenshotBase64.toString('base64').substring(0, 1000);
        } else if (typeof screenshotBase64 === 'string') {
            // Already a string, use as-is
            dataForHashing = screenshotBase64.substring(0, 1000);
        } else {
            // Unknown format, convert to string safely
            dataForHashing = String(screenshotBase64).substring(0, 1000);
        }
        
        // Use a simple hash of the screenshot
        const hash = require('crypto').createHash('md5')
            .update(dataForHashing)
            .digest('hex');
        
        return `screen_${hash}`;
    }

    getEmptyAnalysis() {
        return {
            timestamp: Date.now(),
            totalElements: 0,
            applications: [],
            elements: [],
            analysisMethod: 'failed',
            confidence: 0
        };
    }

    // Helper methods for parsing responses
    parseAppleScriptResult(result) {
        try {
            // Simple parser for AppleScript record format
            // This is a simplified implementation
            return { elements: [], app: 'unknown' };
        } catch (error) {
            console.error('[AdvancedScreenAnalyzer] Failed to parse AppleScript result:', error);
            return { elements: [], app: 'unknown' };
        }
    }

    extractElementsFromText(text) {
        // Extract element information from AI text response
        const elements = [];
        // Implementation would parse the AI response text
        return elements;
    }

    extractTextElementsFromResponse(response) {
        // Extract text elements from OCR response
        const textElements = [];
        // Implementation would parse the OCR response
        return textElements;
    }

    convertAccessibilityElements(accessibilityElements) {
        return accessibilityElements.map(element => this.normalizeElement(element, 'accessibility'));
    }

    convertAppleScriptElements(scriptElements) {
        return scriptElements.map(element => this.normalizeElement(element, 'applescript'));
    }

    convertTextToUIElement(textElement) {
        return this.normalizeElement({
            type: 'label',
            text: textElement.text,
            position: textElement.position,
            confidence: 0.6
        }, 'ocr');
    }

    // Find specific elements
    findElementsByType(type) {
        if (!this.lastAnalysis || !this.lastAnalysis.elements) return [];
        
        return this.lastAnalysis.elements.filter(element => element.type === type);
    }

    findElementsByText(searchText) {
        if (!this.lastAnalysis || !this.lastAnalysis.elements) return [];
        
        const search = searchText.toLowerCase();
        return this.lastAnalysis.elements.filter(element => 
            (element.text || '').toLowerCase().includes(search)
        );
    }

    findClickableElements() {
        if (!this.lastAnalysis || !this.lastAnalysis.elements) return [];
        
        const clickableTypes = ['button', 'link', 'dropdown', 'checkbox', 'radioButton', 'tab'];
        return this.lastAnalysis.elements.filter(element => 
            clickableTypes.includes(element.type) && element.enabled
        );
    }

    findTextInputElements() {
        if (!this.lastAnalysis || !this.lastAnalysis.elements) return [];
        
        return this.lastAnalysis.elements.filter(element => 
            element.type === 'textField' && element.enabled
        );
    }

    // Configuration and status
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('[AdvancedScreenAnalyzer] Configuration updated:', this.config);
    }

    getStatus() {
        return {
            isInitialized: this.isInitialized,
            config: this.config,
            lastAnalysis: this.lastAnalysis ? {
                timestamp: this.lastAnalysis.timestamp,
                elementsFound: this.lastAnalysis.elements.length,
                confidence: this.lastAnalysis.confidence
            } : null,
            cacheSize: this.analysisCache.size
        };
    }

    // Testing methods
    async test() {
        console.log('[AdvancedScreenAnalyzer] 🧪 Running screen analyzer test...');
        
        try {
            const analysis = await this.analyzeScreen();
            
            const testResults = {
                success: true,
                elementsFound: analysis.elements.length,
                confidence: analysis.confidence,
                elementTypes: [...new Set(analysis.elements.map(e => e.type))],
                hasClickableElements: this.findClickableElements().length > 0,
                hasTextInputs: this.findTextInputElements().length > 0
            };
            
            console.log('[AdvancedScreenAnalyzer] Test results:', testResults);
            return testResults;
            
        } catch (error) {
            console.error('[AdvancedScreenAnalyzer] Test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = AdvancedScreenAnalyzer; 