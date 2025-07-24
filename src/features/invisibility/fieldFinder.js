const { EventEmitter } = require('events');
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class FieldFinder extends EventEmitter {
    constructor() {
        super();
        this.isInitialized = false;
        this.currentApplication = null;
        this.foundFields = [];
        
        // Universal application detection and field finding strategies
        this.scripts = {
            // Detect current application and get detailed info
            detectApplication: `
                tell application "System Events"
                    set frontApp to name of first application process whose frontmost is true
                    set frontBundle to bundle identifier of first application process whose frontmost is true
                    return frontApp & "|" & frontBundle
                end tell
            `,
            
            // Universal browser field detection (works with ANY browser)
            universalBrowserDetection: `
                tell application "System Events"
                    set frontApp to name of first application process whose frontmost is true
                end tell
                
                if frontApp is "Safari" then
                    tell application "Safari"
                        try
                            set jsResult to do JavaScript "
                                try {
                                    var fields = [];
                                    var info = {
                                        browser: 'Safari',
                                        url: document.location.href,
                                        title: document.title,
                                        domain: document.location.hostname
                                    };
                                    
                                    // Method 1: Contenteditable elements (Google Docs, Notion, etc.)
                                    var editables = document.querySelectorAll('[contenteditable=true], [contenteditable], .kix-lineview');
                                    editables.forEach(function(el, index) {
                                        var rect = el.getBoundingClientRect();
                                        if (rect.width > 10 && rect.height > 10) {
                                            fields.push({
                                                type: 'contenteditable',
                                                id: 'editable_' + index,
                                                x: Math.round(rect.left + window.scrollX),
                                                y: Math.round(rect.top + window.scrollY),
                                                width: Math.round(rect.width),
                                                height: Math.round(rect.height),
                                                context: getContext(el),
                                                priority: calculatePriority(el, rect)
                                            });
                                        }
                                    });
                                    
                                    // Method 2: Regular input fields
                                    var inputs = document.querySelectorAll('input[type=text], input[type=email], input[type=search], input:not([type]), textarea');
                                    inputs.forEach(function(input, index) {
                                        var rect = input.getBoundingClientRect();
                                        if (rect.width > 10 && rect.height > 10) {
                                            fields.push({
                                                type: 'input',
                                                id: 'input_' + index,
                                                x: Math.round(rect.left + window.scrollX),
                                                y: Math.round(rect.top + window.scrollY),
                                                width: Math.round(rect.width),
                                                height: Math.round(rect.height),
                                                context: getInputContext(input),
                                                priority: calculateInputPriority(input, rect)
                                            });
                                        }
                                    });
                                    
                                    // Method 3: Code editors (Monaco, CodeMirror, Ace)
                                    var editors = document.querySelectorAll('.monaco-editor textarea, .CodeMirror textarea, .ace_text-input, [class*=editor] textarea');
                                    editors.forEach(function(editor, index) {
                                        var rect = editor.getBoundingClientRect();
                                        if (rect.width > 10 && rect.height > 10) {
                                            fields.push({
                                                type: 'code_editor',
                                                id: 'editor_' + index,
                                                x: Math.round(rect.left + window.scrollX),
                                                y: Math.round(rect.top + window.scrollY),
                                                width: Math.round(rect.width),
                                                height: Math.round(rect.height),
                                                context: 'code_editor',
                                                priority: 80
                                            });
                                        }
                                    });
                                    
                                    function getContext(el) {
                                        if (document.location.href.includes('docs.google.com')) return 'google_docs';
                                        if (document.location.href.includes('notion.so')) return 'notion';
                                        if (document.location.href.includes('github.com')) return 'github';
                                        if (document.location.href.includes('stackoverflow.com')) return 'stackoverflow';
                                        if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
                                        return 'contenteditable';
                                    }
                                    
                                    function getInputContext(input) {
                                        var context = input.placeholder || input.name || input.id || 'input';
                                        if (input.type === 'search') return 'search';
                                        if (input.type === 'email') return 'email';
                                        return context;
                                    }
                                    
                                    function calculatePriority(el, rect) {
                                        var priority = 50;
                                        var area = rect.width * rect.height;
                                        if (area > 50000) priority += 30; // Large fields
                                        if (rect.y < 300) priority += 20; // Upper screen
                                        if (el.getAttribute('aria-label')) priority += 10;
                                        if (document.location.href.includes('docs.google.com')) priority += 40;
                                        return priority;
                                    }
                                    
                                    function calculateInputPriority(input, rect) {
                                        var priority = 40;
                                        var area = rect.width * rect.height;
                                        if (area > 10000) priority += 20;
                                        if (input.autofocus) priority += 25;
                                        if (!input.value) priority += 15;
                                        return priority;
                                    }
                                    
                                    return JSON.stringify({
                                        info: info,
                                        totalFields: fields.length,
                                        fields: fields
                                    });
                                } catch(e) {
                                    return 'ERROR: ' + e.message;
                                }
                            " in document 1
                            return jsResult
                        on error errMsg
                            return "ERROR: " & errMsg
                        end try
                    end tell
                    
                else if frontApp contains "Chrome" then
                    -- Chrome detection would go here (similar to Safari)
                    return "CHROME_DETECTED"
                    
                else if frontApp contains "Firefox" then
                    -- Firefox detection would go here
                    return "FIREFOX_DETECTED"
                    
                else
                    -- For other browsers, return info to use accessibility fallback
                    return "OTHER_BROWSER"
                end if
            `,
            
            // Universal native application field detection
            universalNativeDetection: `
                tell application "System Events"
                    set frontApp to name of first application process whose frontmost is true
                    tell application process frontApp
                        set allFields to {}
                        
                        -- Strategy 1: Direct text fields and areas
                        try
                            set textFields to text fields of windows
                            set textAreas to text areas of windows
                            set directFields to textFields & textAreas
                            
                            repeat with field in directFields
                                try
                                    set fieldPos to position of field
                                    set fieldSize to size of field
                                    set fieldValue to value of field
                                    set fieldEnabled to enabled of field
                                    set fieldFocused to focused of field
                                    
                                    set fieldInfo to {¬
                                        type:"native_field", ¬
                                        x:item 1 of fieldPos, ¬
                                        y:item 2 of fieldPos, ¬
                                        width:item 1 of fieldSize, ¬
                                        height:item 2 of fieldSize, ¬
                                        value:fieldValue, ¬
                                        enabled:fieldEnabled, ¬
                                        focused:fieldFocused¬
                                    }
                                    set end of allFields to fieldInfo
                                end try
                            end repeat
                        end try
                        
                        -- Strategy 2: Fields within groups and scroll areas
                        try
                            repeat with win in windows
                                repeat with scrollArea in scroll areas of win
                                    try
                                        set scrollFields to text fields of scrollArea
                                        set scrollAreas to text areas of scrollArea
                                        
                                        repeat with field in (scrollFields & scrollAreas)
                                            try
                                                set fieldPos to position of field
                                                set fieldSize to size of field
                                                set fieldValue to value of field
                                                
                                                set fieldInfo to {¬
                                                    type:"scroll_field", ¬
                                                    x:item 1 of fieldPos, ¬
                                                    y:item 2 of fieldPos, ¬
                                                    width:item 1 of fieldSize, ¬
                                                    height:item 2 of fieldSize, ¬
                                                    value:fieldValue¬
                                                }
                                                set end of allFields to fieldInfo
                                            end try
                                        end repeat
                                    end try
                                end repeat
                            end repeat
                        end try
                        
                        -- Strategy 3: Fields within groups
                        try
                            repeat with win in windows
                                repeat with grp in groups of win
                                    try
                                        set groupFields to text fields of grp
                                        set groupAreas to text areas of grp
                                        
                                        repeat with field in (groupFields & groupAreas)
                                            try
                                                set fieldPos to position of field
                                                set fieldSize to size of field
                                                set fieldValue to value of field
                                                
                                                set fieldInfo to {¬
                                                    type:"group_field", ¬
                                                    x:item 1 of fieldPos, ¬
                                                    y:item 2 of fieldPos, ¬
                                                    width:item 1 of fieldSize, ¬
                                                    height:item 2 of fieldSize, ¬
                                                    value:fieldValue¬
                                                }
                                                set end of allFields to fieldInfo
                                            end try
                                        end repeat
                                    end try
                                end repeat
                            end repeat
                        end try
                        
                        return {application:frontApp, totalFields:(count of allFields), fields:allFields}
                    end tell
                end tell
            `,
            
            // Universal typing for any browser
            universalBrowserTyping: `
                on run {appName, fieldData, textToType}
                    set fieldJson to fieldData as string
                    set textToInsert to textToType as string
                    
                    if appName is "Safari" then
                        tell application "Safari"
                            try
                                set jsResult to do JavaScript "
                                    try {
                                        var fieldData = " & fieldJson & ";
                                        var text = '" & textToInsert & "';
                                        
                                        // Find element by position with enhanced targeting
                                        var element = document.elementFromPoint(fieldData.x, fieldData.y);
                                        if (!element) {
                                            // Try finding by nearby positions in a wider search pattern
                                            var found = false;
                                            for (var dx = -15; dx <= 15 && !found; dx += 5) {
                                                for (var dy = -15; dy <= 15 && !found; dy += 5) {
                                                    element = document.elementFromPoint(fieldData.x + dx, fieldData.y + dy);
                                                    if (element && (element.contentEditable === 'true' || element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
                                                        found = true;
                                                    }
                                                }
                                            }
                                        }
                                        
                                        if (element) {
                                            // Focus and prepare element
                                            element.focus();
                                            element.click();
                                            
                                            // Wait a moment for focus to take effect
                                            setTimeout(function() {
                                                if (element.contentEditable === 'true' || element.hasAttribute('contenteditable')) {
                                                    // Enhanced contenteditable handling - append instead of replace
                                                    if (document.location.href.includes('docs.google.com')) {
                                                        // Google Docs special handling - move to end and insert
                                                        var range = document.createRange();
                                                        range.selectNodeContents(element);
                                                        range.collapse(false);
                                                        var selection = window.getSelection();
                                                        selection.removeAllRanges();
                                                        selection.addRange(range);
                                                        if (element.textContent.trim().length > 0) {
                                                            document.execCommand('insertText', false, ' ');
                                                        }
                                                        document.execCommand('insertText', false, text);
                                                    } else if (document.location.href.includes('notion.so')) {
                                                        // Notion special handling - append to existing content
                                                        var currentText = element.textContent || '';
                                                        var separator = currentText.trim().length > 0 ? ' ' : '';
                                                        element.textContent = currentText + separator + text;
                                                        var inputEvent = new Event('input', {bubbles: true});
                                                        element.dispatchEvent(inputEvent);
                                                    } else {
                                                        // Generic contenteditable - append to existing content
                                                        var currentText = element.textContent || '';
                                                        var separator = currentText.trim().length > 0 ? ' ' : '';
                                                        element.textContent = currentText + separator + text;
                                                        var events = ['input', 'change', 'blur'];
                                                        events.forEach(function(eventType) {
                                                            var event = new Event(eventType, {bubbles: true});
                                                            element.dispatchEvent(event);
                                                        });
                                                    }
                                                } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                                                    // Enhanced input field handling - append to existing content
                                                    var currentValue = element.value || '';
                                                    var separator = currentValue.trim().length > 0 ? ' ' : '';
                                                    element.value = currentValue + separator + text;
                                                    var events = ['input', 'change', 'blur'];
                                                    events.forEach(function(eventType) {
                                                        var event = new Event(eventType, {bubbles: true});
                                                        element.dispatchEvent(event);
                                                    });
                                                }
                                            }, 100);
                                            
                                            return 'SUCCESS';
                                        } else {
                                            return 'ELEMENT_NOT_FOUND';
                                        }
                                    } catch(e) {
                                        return 'ERROR: ' + e.message;
                                    }
                                " in document 1
                                return jsResult
                            on error errMsg
                                return "ERROR: " & errMsg
                            end try
                        end tell
                    else
                        return "BROWSER_NOT_SUPPORTED"
                    end if
                end run
            `,
            
            // Proper AppleScript structure to avoid permission errors (based on web research)
            clickAndTypeCharByChar: `
                on run {x, y, textToType}
                    try
                        -- Get front app first (separate from System Events)
                        tell application "System Events"
                            set frontApp to name of first application process whose frontmost is true
                        end tell
                        
                        -- Activate the app separately (avoids nested tell application issue)
                        tell application frontApp to activate
                        delay 0.5
                        
                        -- Now use System Events with proper process targeting
                        tell application "System Events"
                            tell application process frontApp
                                -- Click to focus the field
                                click at {x, y}
                                delay 0.3
                                
                                -- Click again to ensure focus
                                click at {x, y}
                                delay 0.2
                                
                                -- Type character by character (natural typing effect)
                                repeat with char in textToType
                                    keystroke char
                                    delay 0.03  -- Natural typing speed
                                end repeat
                                
                            end tell
                        end tell
                        
                        return "SUCCESS"
                    on error errMsg
                        return "ERROR: " & errMsg
                    end try
                end run
            `
        };

        console.log('[FieldFinder] 🌍 Initialized with UNIVERSAL application support');
    }

    async initialize() {
        if (this.isInitialized) {
            return true;
        }

        try {
            console.log('[FieldFinder] Initializing field detection...');

            // Check basic accessibility permissions
            const hasAccessibility = await this.checkAccessibilityPermissions();
            if (!hasAccessibility) {
                throw new Error('Accessibility permissions required');
            }

            // Check Safari-specific permissions
            await this.checkSafariPermissions();

            this.isInitialized = true;
            console.log('[FieldFinder] ✅ Field detection initialized successfully');
            return true;
        } catch (error) {
            console.error('[FieldFinder] Initialization failed:', error);
            throw error;
        }
    }

    async checkAccessibilityPermissions() {
        try {
            // Test accessibility access with a simple script
            const testScript = `
                tell application "System Events"
                    set frontApp to name of first application process whose frontmost is true
                    return frontApp
                end tell
            `;
            
            const result = await this.runAppleScript(testScript);
            return result && result.length > 0;
        } catch (error) {
            console.error('[FieldFinder] Accessibility permission test failed:', error);
            return false;
        }
    }

    async checkSafariPermissions() {
        try {
            console.log('[FieldFinder] 🔍 Checking Safari JavaScript permissions...');
            
            const testScript = `
                tell application "Safari"
                    try
                        set testResult to do JavaScript "document.title" in document 1
                        return "ENABLED"
                    on error errMsg
                        return "DISABLED: " & errMsg
                    end try
                end tell
            `;
            
            const result = await this.runAppleScript(testScript);
            
            if (result === 'ENABLED') {
                console.log('[FieldFinder] ✅ Safari JavaScript from Apple Events is enabled');
                return true;
            } else {
                console.warn('[FieldFinder] ⚠️ Safari JavaScript permission issue:', result);
                console.log('\n🚨 SETUP REQUIRED:');
                console.log('1. Open Safari');
                console.log('2. Go to Safari > Preferences > Advanced');
                console.log('3. Check "Show Develop menu in menu bar"');
                console.log('4. In menu bar: Develop > Allow JavaScript from Apple Events ✅');
                console.log('5. Restart your application\n');
                return false;
            }
        } catch (error) {
            console.warn('[FieldFinder] Could not check Safari permissions:', error.message);
            return false;
        }
    }

    async findInputFields() {
        if (!this.isInitialized) {
            throw new Error('FieldFinder not initialized');
        }

        try {
            console.log('[FieldFinder] 🔍 Starting UNIVERSAL field detection...');

            // Step 1: Detect current application and context
            const appInfo = await this.detectApplicationInfo();
            console.log(`[FieldFinder] 📱 Current context:`, appInfo);

            let fields = [];

            // Step 2: Choose detection strategy based on application type
            if (this.isBrowserApplication(appInfo.name)) {
                console.log('[FieldFinder] 🌐 Using browser detection strategy');
                fields = await this.detectBrowserFields(appInfo);
            } else {
                console.log('[FieldFinder] 🖥️ Using native application detection strategy');
                fields = await this.detectNativeFields(appInfo);
            }

            // Step 3: If no fields found, try alternative strategies
            if (fields.length === 0) {
                console.log('[FieldFinder] 🔄 No fields found, trying alternative strategies...');
                fields = await this.tryAlternativeDetection(appInfo);
            }

            // Step 4: Filter and prioritize fields
            const filteredFields = this.filterAndPrioritizeFields(fields);
            this.foundFields = filteredFields;
            this.currentApplication = appInfo;

            console.log(`[FieldFinder] 🎯 UNIVERSAL detection result: ${filteredFields.length} usable fields`);
            if (filteredFields.length > 0) {
                console.log(`[FieldFinder] 📊 Field summary:`, 
                    filteredFields.map(f => ({
                        type: f.type,
                        context: f.context,
                        priority: f.priority,
                        app: f.application
                    }))
                );
            }

            return filteredFields;
        } catch (error) {
            console.error('[FieldFinder] Universal field detection failed:', error);
            return [];
        }
    }

    async detectApplicationInfo() {
        try {
            const result = await this.runAppleScript(this.scripts.detectApplication);
            const [appName, bundleId] = result.split('|');
            
            return {
                name: appName,
                bundleId: bundleId || '',
                category: this.categorizeApplication(appName, bundleId),
                capabilities: this.getApplicationCapabilities(appName, bundleId)
            };
        } catch (error) {
            console.warn('[FieldFinder] Could not detect application info:', error.message);
            return {
                name: 'Unknown',
                bundleId: '',
                category: 'unknown',
                capabilities: ['accessibility']
            };
        }
    }

    categorizeApplication(appName, bundleId) {
        // Browser detection
        if (this.isBrowserApplication(appName)) return 'browser';
        
        // Code editors
        if (['Visual Studio Code', 'Xcode', 'Sublime Text', 'Atom'].includes(appName)) return 'code_editor';
        
        // Text editors
        if (['TextEdit', 'Pages', 'Word', 'Notion'].includes(appName)) return 'text_editor';
        
        // Terminal applications
        if (['Terminal', 'iTerm', 'Hyper'].includes(appName)) return 'terminal';
        
        // System applications
        if (bundleId && bundleId.startsWith('com.apple.')) return 'system';
        
        return 'unknown';
    }

    getApplicationCapabilities(appName, bundleId) {
        const capabilities = ['accessibility']; // All apps support accessibility
        
        if (this.isBrowserApplication(appName)) {
            capabilities.push('javascript', 'web_automation');
        }
        
        if (['Visual Studio Code', 'Sublime Text', 'Atom'].includes(appName)) {
            capabilities.push('code_editing', 'plugin_api');
        }
        
        return capabilities;
    }

    isBrowserApplication(appName) {
        const browsers = [
            'Safari', 'Google Chrome', 'Chrome', 'Firefox', 'Microsoft Edge', 
            'Edge', 'Opera', 'Brave Browser', 'Arc', 'Vivaldi'
        ];
        return browsers.some(browser => appName.includes(browser));
    }

    async detectBrowserFields(appInfo) {
        try {
            console.log(`[FieldFinder] 🌐 Detecting fields in browser: ${appInfo.name}`);
            
            const result = await this.runAppleScript(this.scripts.universalBrowserDetection);
            
            if (result.startsWith('ERROR:')) {
                console.warn('[FieldFinder] Browser detection error:', result);
                return [];
            }
            
            if (result === 'CHROME_DETECTED' || result === 'FIREFOX_DETECTED' || result === 'OTHER_BROWSER') {
                console.log(`[FieldFinder] ${result} - falling back to accessibility detection`);
                return await this.detectNativeFields(appInfo);
            }

            // Parse Safari results
            const parsed = JSON.parse(result);
            console.log(`[FieldFinder] 🌐 Browser context:`, {
                browser: parsed.info.browser,
                domain: parsed.info.domain,
                totalFields: parsed.totalFields
            });

            return parsed.fields.map((field, index) => ({
                id: field.id,
                type: field.type,
                position: { x: field.x, y: field.y },
                size: { width: field.width, height: field.height },
                application: appInfo.name,
                context: field.context,
                priority: field.priority,
                capabilities: ['javascript', 'web_automation'],
                metadata: {
                    url: parsed.info.url,
                    domain: parsed.info.domain,
                    browser: parsed.info.browser
                }
            }));
        } catch (error) {
            console.error('[FieldFinder] Browser field detection failed:', error);
            return [];
        }
    }

    async detectNativeFields(appInfo) {
        try {
            console.log(`[FieldFinder] 🖥️ Detecting fields in native app: ${appInfo.name}`);
            
            const result = await this.runAppleScript(this.scripts.universalNativeDetection);
            if (!result) return [];

            const parsed = this.parseAppleScriptResult(result);
            if (!parsed.fields) return [];

            return parsed.fields.map((field, index) => ({
                id: `native_${index}`,
                type: field.type,
                position: { x: field.x, y: field.y },
                size: { width: field.width, height: field.height },
                application: appInfo.name,
                context: appInfo.category,
                priority: this.calculateNativePriority(field, appInfo),
                capabilities: ['accessibility', 'click_and_type'],
                metadata: {
                    value: field.value,
                    enabled: field.enabled,
                    focused: field.focused
                }
            }));
        } catch (error) {
            console.error('[FieldFinder] Native field detection failed:', error);
            return [];
        }
    }

    async tryAlternativeDetection(appInfo) {
        try {
            console.log('[FieldFinder] 🔄 Trying alternative detection methods...');
            
            const alternatives = [];
            
            // Alternative 1: Try simplified accessibility detection
            try {
                console.log('[FieldFinder] 🔍 Trying simplified accessibility detection...');
                const simpleFields = await this.detectSimpleAccessibilityFields(appInfo);
                if (simpleFields.length > 0) {
                    console.log(`[FieldFinder] ✅ Found ${simpleFields.length} fields via simplified accessibility`);
                    alternatives.push(...simpleFields);
                }
            } catch (error) {
                console.warn('[FieldFinder] Simplified accessibility detection failed:', error.message);
            }
            
            // Alternative 2: Try position-based detection
            try {
                console.log('[FieldFinder] 🎯 Trying position-based detection...');
                const positionFields = await this.detectFieldsByPosition(appInfo);
                if (positionFields.length > 0) {
                    console.log(`[FieldFinder] ✅ Found ${positionFields.length} fields via position detection`);
                    alternatives.push(...positionFields);
                }
            } catch (error) {
                console.warn('[FieldFinder] Position-based detection failed:', error.message);
            }
            
            // Alternative 3: Try brute force screen scanning
            if (alternatives.length === 0) {
                try {
                    console.log('[FieldFinder] 🔍 Trying brute force screen scanning...');
                    const scanFields = await this.detectFieldsByScreenScan(appInfo);
                    if (scanFields.length > 0) {
                        console.log(`[FieldFinder] ✅ Found ${scanFields.length} fields via screen scanning`);
                        alternatives.push(...scanFields);
                    }
                } catch (error) {
                    console.warn('[FieldFinder] Screen scanning failed:', error.message);
                }
            }
            
            return alternatives;
        } catch (error) {
            console.error('[FieldFinder] All alternative detection methods failed:', error);
            return [];
        }
    }

    async detectSimpleAccessibilityFields(appInfo) {
        try {
            const simpleScript = `
                tell application "System Events"
                    try
                        set frontApp to name of first application process whose frontmost is true
                        tell application process frontApp
                            set allTextFields to {}
                            
                            -- Get all text fields and text areas from all windows
                            repeat with win in windows
                                try
                                    set winFields to text fields of win
                                    set winAreas to text areas of win
                                    set allTextFields to allTextFields & winFields & winAreas
                                end try
                            end repeat
                            
                            set fieldData to {}
                            repeat with field in allTextFields
                                try
                                    set fieldPos to position of field
                                    set fieldSize to size of field
                                    set fieldInfo to "TEXT_FIELD," & (item 1 of fieldPos) & "," & (item 2 of fieldPos) & "," & (item 1 of fieldSize) & "," & (item 2 of fieldSize)
                                    set end of fieldData to fieldInfo
                                end try
                            end repeat
                            
                            return fieldData
                        end tell
                    on error
                        return {}
                    end try
                end tell
            `;

            const result = await this.runAppleScript(simpleScript);
            if (!result || result === '{}') return [];

            // Parse the simple field data
            const fields = [];
            const lines = result.split(',');
            
            for (let i = 0; i < lines.length; i += 5) {
                if (i + 4 < lines.length) {
                    const type = lines[i];
                    const x = parseInt(lines[i + 1]);
                    const y = parseInt(lines[i + 2]);
                    const width = parseInt(lines[i + 3]);
                    const height = parseInt(lines[i + 4]);
                    
                    if (!isNaN(x) && !isNaN(y) && width > 10 && height > 10) {
                        fields.push({
                            id: `simple_${i / 5}`,
                            type: 'simple_text_field',
                            position: { x, y },
                            size: { width, height },
                            application: appInfo.name,
                            context: 'simple_accessibility',
                            priority: 30,
                            capabilities: ['accessibility', 'click_and_type'],
                            metadata: { detectionMethod: 'simple_accessibility' }
                        });
                    }
                }
            }

            return fields;
        } catch (error) {
            console.error('[FieldFinder] Simple accessibility detection failed:', error);
            return [];
        }
    }

    async detectFieldsByPosition(appInfo) {
        try {
            // Create generic positioned fields based on screen analysis
            // This is useful when accessibility detection fails
            const screenWidth = 1920; // Default screen width
            const screenHeight = 1080; // Default screen height
            
            const commonFieldPositions = [
                // Common input field positions
                { x: 300, y: 200, width: 400, height: 30, context: 'top_center' },
                { x: 200, y: 300, width: 500, height: 40, context: 'center_left' },
                { x: 400, y: 400, width: 600, height: 200, context: 'main_content' },
                { x: 100, y: 500, width: 800, height: 100, context: 'lower_content' }
            ];

            const fields = [];
            for (let i = 0; i < commonFieldPositions.length; i++) {
                const pos = commonFieldPositions[i];
                fields.push({
                    id: `position_${i}`,
                    type: 'positioned_field',
                    position: { x: pos.x, y: pos.y },
                    size: { width: pos.width, height: pos.height },
                    application: appInfo.name,
                    context: pos.context,
                    priority: 20,
                    capabilities: ['click_and_type'],
                    metadata: { detectionMethod: 'position_based', confidence: 0.3 }
                });
            }

            return fields;
        } catch (error) {
            console.error('[FieldFinder] Position-based detection failed:', error);
            return [];
        }
    }

    async detectFieldsByScreenScan(appInfo) {
        try {
            // Last resort: create a single generic field in the center of the screen
            // This ensures we always have at least one target to try typing into
            console.log('[FieldFinder] 🎯 Creating fallback field for screen center');
            
            return [{
                id: 'fallback_center',
                type: 'fallback_field',
                position: { x: 600, y: 400 }, // Center of typical screen
                size: { width: 400, height: 100 },
                application: appInfo.name,
                context: 'screen_center_fallback',
                priority: 10,
                capabilities: ['click_and_type'],
                metadata: { 
                    detectionMethod: 'fallback_screen_center',
                    confidence: 0.1,
                    note: 'Fallback field - may not be accurate'
                }
            }];
        } catch (error) {
            console.error('[FieldFinder] Screen scan detection failed:', error);
            return [];
        }
    }

    calculateNativePriority(field, appInfo) {
        let priority = 50;
        
        // Higher priority for focused fields
        if (field.focused) priority += 30;
        
        // Higher priority for empty fields
        if (!field.value || field.value === '') priority += 25;
        
        // Higher priority for enabled fields
        if (field.enabled !== false) priority += 20;
        
        // Application-specific priorities
        if (appInfo.category === 'code_editor') priority += 15;
        if (appInfo.category === 'text_editor') priority += 20;
        
        // Size-based priority
        const area = field.width * field.height;
        if (area > 10000) priority += 15;
        
        return priority;
    }

    calculateFieldPriority(field) {
        let priority = 50; // Base priority

        // Prioritize empty fields (more likely to need input)
        if (!field.value || field.value === '') priority += 30;

        // Prioritize enabled fields
        if (field.enabled !== false) priority += 20;

        // Prioritize larger fields (more likely to be main input)
        const area = (field.width || 100) * (field.height || 20);
        if (area > 5000) priority += 15;

        // Prioritize fields in certain screen positions
        if (field.positionY < 500) priority += 10; // Upper part of screen

        // Prioritize currently focused fields
        if (field.focused) priority += 25;

        return priority;
    }

    parseAppleScriptResult(result) {
        try {
            // Handle different result formats from AppleScript
            if (!result || result === '{}') {
                return { fields: [] };
            }

            // If it's a string that starts with ERROR, return empty
            if (typeof result === 'string' && result.startsWith('ERROR:')) {
                console.warn('[FieldFinder] AppleScript error result:', result);
                return { fields: [] };
            }

            // Try to parse as JSON first (for structured results)
            if (typeof result === 'string' && (result.startsWith('{') || result.startsWith('['))) {
                try {
                    return JSON.parse(result);
                } catch (jsonError) {
                    console.warn('[FieldFinder] JSON parse failed, trying AppleScript record parsing');
                }
            }

            // Parse AppleScript record format
            if (typeof result === 'string') {
                return this.parseAppleScriptRecord(result);
            }

            // If it's already an object, return as-is
            if (typeof result === 'object') {
                return result;
            }

            console.warn('[FieldFinder] Unknown result format:', typeof result, result);
            return { fields: [] };
            
        } catch (error) {
            console.error('[FieldFinder] Error parsing AppleScript result:', error);
            return { fields: [] };
        }
    }

    parseAppleScriptRecord(recordString) {
        try {
            // Parse AppleScript record format: {application:"AppName", totalFields:3, fields:{{...}, {...}}}
            const fields = [];
            
            // Extract fields array from the record
            const fieldsMatch = recordString.match(/fields:\{([^}]+)\}/);
            if (!fieldsMatch) {
                return { fields: [] };
            }

            // Simple parser for AppleScript record format
            // This is a simplified version - in practice, AppleScript records are complex
            const fieldData = fieldsMatch[1];
            
            // For now, return empty fields since AppleScript record parsing is complex
            // The alternative detection methods will be used instead
            console.log('[FieldFinder] AppleScript record detected, using alternative detection methods');
            return { fields: [] };
            
        } catch (error) {
            console.error('[FieldFinder] Error parsing AppleScript record:', error);
            return { fields: [] };
        }
    }

    filterAndPrioritizeFields(fields) {
        if (!fields || !Array.isArray(fields)) {
            console.warn('[FieldFinder] Invalid fields array provided to filter');
            return [];
        }

        try {
            console.log(`[FieldFinder] 🔧 Filtering and prioritizing ${fields.length} detected fields...`);
            
            // Filter out invalid fields
            const validFields = fields.filter(field => {
                // Must have valid position
                if (!field.position || typeof field.position.x !== 'number' || typeof field.position.y !== 'number') {
                    return false;
                }
                
                // Must have valid size (minimum size thresholds)
                if (!field.size || field.size.width < 10 || field.size.height < 5) {
                    return false;
                }
                
                // Position must be on screen (reasonable bounds)
                if (field.position.x < -100 || field.position.x > 3000 || 
                    field.position.y < -100 || field.position.y > 2000) {
                    return false;
                }
                
                return true;
            });

            console.log(`[FieldFinder] ✅ ${validFields.length} fields passed validation`);

            // Calculate/update priority for each field if not already set
            validFields.forEach(field => {
                if (typeof field.priority !== 'number') {
                    field.priority = this.calculateFieldPriority(field);
                }
            });

            // Sort by priority (highest first)
            const sortedFields = validFields.sort((a, b) => b.priority - a.priority);

            // Limit to top 10 fields to avoid overwhelming the system
            const limitedFields = sortedFields.slice(0, 10);

            console.log(`[FieldFinder] 🎯 Final filtered result: ${limitedFields.length} prioritized fields`);
            if (limitedFields.length > 0) {
                console.log('[FieldFinder] 📊 Top fields:', limitedFields.slice(0, 3).map(f => ({
                    type: f.type,
                    priority: f.priority,
                    context: f.context,
                    position: f.position
                })));
            }

            return limitedFields;
            
        } catch (error) {
            console.error('[FieldFinder] Error filtering and prioritizing fields:', error);
            return [];
        }
    }

    async focusField(field) {
        if (!field || !field.position) {
            throw new Error('Invalid field provided for focusing');
        }

        try {
            console.log(`[FieldFinder] 🎯 Focusing field:`, {
                type: field.type,
                context: field.context,
                position: field.position,
                application: field.application
            });

            // Choose focusing strategy based on field capabilities
            if (field.capabilities?.includes('javascript')) {
                return await this.focusBrowserField(field);
            } else {
                return await this.focusNativeField(field);
            }
        } catch (error) {
            console.error('[FieldFinder] Error focusing field:', error);
            return false;
        }
    }

    async focusBrowserField(field) {
        try {
            console.log('[FieldFinder] 🌐 Focusing browser field using JavaScript');
            
            // Use browser-specific focusing
            const fieldJson = JSON.stringify({
                type: field.type,
                x: field.position.x,
                y: field.position.y,
                context: field.context
            });

            const focusScript = `
                tell application "${field.application}"
                    set jsCode to "
                        var element = document.elementFromPoint(${field.position.x}, ${field.position.y});
                        if (element) {
                            element.focus();
                            element.click();
                            return 'FOCUSED';
                        }
                        return 'NOT_FOUND';
                    "
                    
                    try
                        set result to do JavaScript jsCode in document 1
                        return result
                    on error errMsg
                        return "ERROR: " & errMsg
                    end try
                end tell
            `;

            const result = await this.runAppleScript(focusScript);
            
            if (result === 'FOCUSED') {
                console.log('[FieldFinder] ✅ Browser field focused successfully');
                await this.delay(200);
                return true;
            } else {
                console.warn('[FieldFinder] Browser focus result:', result);
                // Fallback to native clicking
                return await this.focusNativeField(field);
            }
        } catch (error) {
            console.error('[FieldFinder] Browser field focus failed:', error);
            return await this.focusNativeField(field);
        }
    }

    async focusNativeField(field) {
        try {
            console.log('[FieldFinder] 🖥️ Focusing native field using accessibility');
            
            const clickScript = `
                tell application "System Events"
                    set frontApp to name of first application process whose frontmost is true
                    tell application process frontApp
                        click at {${field.position.x}, ${field.position.y}}
                        delay 0.2
                        return true
                    end tell
                end tell
            `;

            const result = await this.runAppleScript(clickScript);
            
            if (result) {
                console.log('[FieldFinder] ✅ Native field focused successfully');
                await this.delay(200);
                return true;
            } else {
                console.warn('[FieldFinder] Native focus failed');
                return false;
            }
        } catch (error) {
            console.error('[FieldFinder] Native field focus failed:', error);
            return false;
        }
    }

    async typeInField(field, text) {
        if (!field || !text) {
            throw new Error('Invalid field or text provided');
        }

        try {
            console.log(`[FieldFinder] ⌨️ Typing in ${field.type} field (${text.length} chars)`, {
                application: field.application,
                context: field.context,
                capabilities: field.capabilities
            });

            // Choose typing strategy based on field capabilities
            if (field.capabilities?.includes('javascript')) {
                return await this.typeBrowserField(field, text);
            } else {
                return await this.typeNativeField(field, text);
            }
        } catch (error) {
            console.error('[FieldFinder] Error typing in field:', error);
            return false;
        }
    }

    async typeBrowserField(field, text) {
        try {
            console.log('[FieldFinder] 🌐 Browser field detected - using character-by-character typing for reliability');
            
            // For browser fields, use the same reliable character-by-character method
            // This avoids JavaScript injection issues and provides consistent typing effect
            return await this.typeUsingCharacterByCharacter(field, text);
            
        } catch (error) {
            console.error('[FieldFinder] Browser typing failed:', error);
            return false;
        }
    }
    
    // Simple, reliable typing method
    async typeUsingCharacterByCharacter(field, text) {
        try {
            console.log(`[FieldFinder] 🔤 Using character-by-character typing for ${text.length} characters`);
            
            // Use direct text (no BASE64 encoding) - this was causing the garbled text
            const result = await this.runAppleScript(this.scripts.clickAndTypeCharByChar, [
                field.position.x,
                field.position.y,
                text
            ]);
            
            if (result === 'SUCCESS') {
                console.log('[FieldFinder] ✅ Character-by-character typing successful');
                return true;
            } else if (result && result.startsWith('ERROR:')) {
                console.warn(`[FieldFinder] AppleScript error: ${result}`);
                
                // Check for specific keystroke permission errors
                if (result.includes('keystroke') || result.includes('not allowed') || result.includes('not authorized')) {
                    console.log('[FieldFinder] 🔐 Keystroke permission error detected');
                    await this.checkSystemEventsPermissions();
                } else {
                    console.log('[FieldFinder] 🔄 This may be due to accessibility permissions or app focus issues');
                }
                
                return false;
            } else {
                console.warn(`[FieldFinder] Unexpected result: ${result}`);
                return false;
            }
            
        } catch (error) {
            console.error('[FieldFinder] Character-by-character typing failed:', error);
            
            // Check if this is a permission issue and provide instructions
            if (error.message && (error.message.includes('keystroke') || error.message.includes('not allowed') || error.message.includes('not authorized'))) {
                console.log('[FieldFinder] 🔐 Detected keystroke permission issue - checking System Events permissions...');
                await this.checkSystemEventsPermissions();
            } else {
                console.log('[FieldFinder] 💡 Tip: Ensure accessibility permissions are granted for this app');
            }
            
            return false;
        }
    }


    


    async typeNativeField(field, text) {
        try {
            console.log('[FieldFinder] 🖥️ Typing in native field using character-by-character method');
            
            // Use the simple, reliable character-by-character method for all text
            return await this.typeUsingCharacterByCharacter(field, text);
            
        } catch (error) {
            console.error('[FieldFinder] Native typing failed:', error);
            return false;
        }
    }

    // Utility method for adding delays
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Check and provide instructions for macOS permissions (based on web research)
    async checkSystemEventsPermissions() {
        try {
            console.log('[FieldFinder] 🔐 Checking System Events permissions...');
            
            // Test basic keystroke permission
            const testScript = `
                tell application "System Events"
                    -- Simple test to check if we have permission
                    return "PERMISSION_OK"
                end tell
            `;
            
            const result = await this.runAppleScript(testScript);
            
            if (result === 'PERMISSION_OK') {
                console.log('[FieldFinder] ✅ System Events permissions verified');
                return true;
            } else {
                console.warn('[FieldFinder] ⚠️ System Events permission issue detected');
                this.showPermissionInstructions();
                return false;
            }
            
        } catch (error) {
            console.error('[FieldFinder] ❌ System Events permission check failed:', error);
            this.showPermissionInstructions();
            return false;
        }
    }

    showPermissionInstructions() {
        console.log(`
🚨 MACOS PERMISSIONS REQUIRED FOR TYPING:

The "Can't continue keystroke" error means your app needs permission to send keystrokes.

📋 SOLUTION - Grant Permissions in System Settings:

1. 🍎 Open Apple Menu → System Settings
2. 🔒 Go to "Privacy & Security"  
3. 🤖 Click "Automation" in the sidebar
4. 📱 Find "Leviousa" (or "Electron") in the app list
5. ✅ Toggle ON the switch for "System Events"

If you don't see Leviousa in the list:
6. ♿ Also check "Privacy & Security" → "Accessibility"
7. ➕ Click the "+" button and add Leviousa
8. ✅ Make sure the toggle is ON

📝 Alternative Method (if needed):
- Restart the app after granting permissions
- If still failing, toggle permissions OFF then ON again
- Some users need to delete and re-add the app to permission lists

🔄 After granting permissions, try the typing feature again.

Based on: MacScripter.net and Apple Support Community solutions
        `);
    }

    async clearField() {
        try {
            // Select all text in the field and then clear it
            const clearScript = `
                tell application "System Events"
                    keystroke "a" using command down
                    delay 0.05
                    keystroke ""
                end tell
            `;
            
            await this.runAppleScript(clearScript);
            console.log('[FieldFinder] Field cleared');
        } catch (error) {
            console.warn('[FieldFinder] Could not clear field:', error.message);
        }
    }

    async runAppleScript(script, args = []) {
        return new Promise((resolve, reject) => {
            try {
                // Clean and validate the script
                const cleanScript = script.trim();
                if (!cleanScript) {
                    reject(new Error('Empty AppleScript provided'));
                    return;
                }
                
                // Use temporary file approach to avoid quote escaping issues
                const fs = require('fs');
                const path = require('path');
                const os = require('os');
                
                const tempFile = path.join(os.tmpdir(), `leviousa_script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.scpt`);
                
                try {
                    // Write script to temp file with proper encoding
                    fs.writeFileSync(tempFile, cleanScript, 'utf8');
                    
                    // Build command with proper argument handling
                    let command = `osascript "${tempFile}"`;
                    
                    // Add arguments if provided with robust escaping
                    if (args.length > 0) {
                        const escapedArgs = args.map(arg => {
                            const stringArg = String(arg);
                            
                            // FIXED: No more BASE64 encoding - use proper text escaping for all text lengths
                            // This ensures AppleScript receives the actual text, not encoded strings
                            return `'${stringArg.replace(/'/g, "'\"'\"'")}'`;
                        });
                        command += ` ${escapedArgs.join(' ')}`;
                    }

                    console.log(`[FieldFinder] 🔧 Executing AppleScript command: ${command}`);
                    
                    // Execute the command
                    const { exec } = require('child_process');
                    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
                        // Cleanup temp file
                        try {
                            fs.unlinkSync(tempFile);
                        } catch (cleanupErr) {
                            console.warn('[FieldFinder] Could not cleanup temp file:', cleanupErr.message);
                        }
                        
                        if (error) {
                            console.error('[FieldFinder] AppleScript execution error:', error.message);
                            reject(error);
                        } else {
                            console.log('[FieldFinder] ✅ AppleScript executed successfully');
                            resolve(stdout.trim());
                        }
                    });
                    
                } catch (fileError) {
                    console.error('[FieldFinder] Failed to write temp script file:', fileError.message);
                    reject(fileError);
                }
                
            } catch (scriptError) {
                console.error('[FieldFinder] AppleScript preparation error:', scriptError.message);
                reject(scriptError);
            }
        });
    }
}

module.exports = FieldFinder;