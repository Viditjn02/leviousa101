const { EventEmitter } = require('events');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class HumanTyper extends EventEmitter {
    constructor() {
        super();
        this.isInitialized = false;
        this.isTyping = false;
        
        // Human typing characteristics - based on research (40-60 WPM average)
        this.typingProfile = {
            // Words per minute (base speed) - realistic human speeds
            baseWPM: 45, // Average human typing speed (40-60 WPM range)
            wpmVariation: 15, // ±15 WPM variation
            
            // Timing (calculated from WPM: 45 WPM = 225 chars/min = 3.75 chars/sec = ~267ms/char)
            baseDelayMs: 240, // Base delay between keystrokes for ~45 WPM
            delayVariation: 120, // ±120ms variation for natural rhythm
            
            // Error patterns (keeping low for answer accuracy)
            errorRate: 0.01, // 1% chance of typing error (very low for answers)
            correctionDelay: 600, // Time before correcting error
            backspaceDelay: 180, // Delay between backspaces
            
            // Pause patterns (more realistic human behavior)
            wordPauseChance: 0.20, // 20% chance of pause after word
            sentencePauseChance: 0.85, // 85% chance of pause after sentence
            wordPauseRange: [150, 400], // Word pause duration
            sentencePauseRange: [300, 1000], // Sentence pause duration
            
            // Human patterns
            burstTypingChance: 0.08, // 8% chance of fast burst
            slowdownChance: 0.12, // 12% chance of slowdown
            thinkingPauseChance: 0.03, // 3% chance of thinking pause
            thinkingPauseRange: [800, 2000], // Thinking pause duration
        };

        // Common typing errors
        this.commonErrors = {
            // Adjacent key errors (QWERTY layout)
            'a': ['s', 'q', 'w'],
            'b': ['v', 'n', 'g'],
            'c': ['x', 'v', 'd'],
            'd': ['s', 'f', 'c'],
            'e': ['w', 'r', 'd'],
            'f': ['d', 'g', 'v'],
            'g': ['f', 'h', 'b'],
            'h': ['g', 'j', 'n'],
            'i': ['u', 'o', 'k'],
            'j': ['h', 'k', 'm'],
            'k': ['j', 'l', 'i'],
            'l': ['k', 'o'],
            'm': ['n', 'j'],
            'n': ['b', 'm', 'h'],
            'o': ['i', 'p', 'l'],
            'p': ['o', 'l'],
            'q': ['w', 'a'],
            'r': ['e', 't', 'f'],
            's': ['a', 'd', 'w'],
            't': ['r', 'y', 'g'],
            'u': ['y', 'i', 'j'],
            'v': ['c', 'b', 'f'],
            'w': ['q', 'e', 's'],
            'x': ['z', 'c', 's'],
            'y': ['t', 'u', 'h'],
            'z': ['x', 'a']
        };

        console.log('[HumanTyper] Initialized with realistic typing simulation');
    }

    async initialize() {
        try {
            this.isInitialized = true;
            console.log('[HumanTyper] Initialized successfully');
            return true;
        } catch (error) {
            console.error('[HumanTyper] Initialization failed:', error);
            return false;
        }
    }

    async typeText(text, options = {}) {
        if (!this.isInitialized) {
            throw new Error('HumanTyper not initialized');
        }

        if (this.isTyping) {
            console.log('[HumanTyper] Already typing, waiting for current operation to complete...');
            while (this.isTyping) {
                await this.delay(100);
            }
        }

        this.isTyping = true;

        try {
            console.log(`[HumanTyper] 🖋️ Starting human-like typing of ${text.length} characters...`);

            const config = {
                humanLike: true,
                includeErrors: true,
                includeBackspacing: true,
                speed: 'normal', // slow, normal, fast
                ...options
            };

            if (config.humanLike) {
                await this.typeWithHumanCharacteristics(text, config);
            } else {
                await this.typeDirectly(text);
            }

            console.log('[HumanTyper] ✅ Typing completed successfully');
            this.emit('typing-completed', { text, duration: Date.now() });
        } catch (error) {
            console.error('[HumanTyper] Error during typing:', error);
            this.emit('typing-error', { error, text });
            throw error;
        } finally {
            this.isTyping = false;
        }
    }

    async typeWithHumanCharacteristics(text, config) {
        const words = text.split(' ');
        let currentWPM = this.calculateCurrentWPM();
        let consecutiveChars = 0;
        
        console.log(`[HumanTyper] Using human typing at ~${currentWPM} WPM`);

        for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
            const word = words[wordIndex];
            
            // Type the word character by character
            for (let charIndex = 0; charIndex < word.length; charIndex++) {
                const char = word[charIndex];
                
                // Should we make an error?
                if (config.includeErrors && Math.random() < this.typingProfile.errorRate) {
                    await this.typeWithError(char, config);
                } else {
                    await this.typeCharacter(char);
                }
                
                // Variable delay between characters
                const delay = this.calculateCharacterDelay(currentWPM, consecutiveChars);
                await this.delay(delay);
                
                consecutiveChars++;
                
                // Occasionally adjust typing speed
                if (consecutiveChars % 10 === 0) {
                    currentWPM = this.adjustTypingSpeed(currentWPM);
                }
            }
            
            // Add space after word (except for last word)
            if (wordIndex < words.length - 1) {
                await this.typeCharacter(' ');
                
                // Pause after word sometimes
                if (Math.random() < this.typingProfile.wordPauseChance) {
                    const pauseDuration = this.randomBetween(...this.typingProfile.wordPauseRange);
                    console.log(`[HumanTyper] 🤔 Word pause (${pauseDuration}ms)`);
                    await this.delay(pauseDuration);
                }
            }
            
            // Pause after sentences
            if (word.match(/[.!?]$/)) {
                if (Math.random() < this.typingProfile.sentencePauseChance) {
                    const pauseDuration = this.randomBetween(...this.typingProfile.sentencePauseRange);
                    console.log(`[HumanTyper] 📖 Sentence pause (${pauseDuration}ms)`);
                    await this.delay(pauseDuration);
                }
            }
            
            // Occasional thinking pauses
            if (Math.random() < this.typingProfile.thinkingPauseChance) {
                const thinkingDuration = this.randomBetween(...this.typingProfile.thinkingPauseRange);
                console.log(`[HumanTyper] 💭 Thinking pause (${thinkingDuration}ms)`);
                await this.delay(thinkingDuration);
            }
        }
    }

    async typeWithError(intendedChar, config) {
        // Type a wrong character first
        const errorChar = this.getTypingError(intendedChar);
        console.log(`[HumanTyper] 🔤 Typing error: '${errorChar}' instead of '${intendedChar}'`);
        
        await this.typeCharacter(errorChar);
        
        // Wait a bit before noticing the error
        await this.delay(this.typingProfile.correctionDelay);
        
        // Backspace to correct the error
        console.log('[HumanTyper] ⌫ Correcting error...');
        await this.backspace();
        await this.delay(this.typingProfile.backspaceDelay);
        
        // Type the correct character
        await this.typeCharacter(intendedChar);
    }

    async typeCharacter(char) {
        try {
            // Handle special characters that need escaping
            const escapedChar = this.escapeSpecialCharacter(char);
            
            const script = `
                tell application "System Events"
                    keystroke "${escapedChar}"
                end tell
            `;
            
            await this.runAppleScript(script);
        } catch (error) {
            console.error(`[HumanTyper] Error typing character '${char}':`, error);
            throw error;
        }
    }

    async backspace() {
        const script = `
            tell application "System Events"
                key code 51
            end tell
        `;
        
        await this.runAppleScript(script);
    }

    escapeSpecialCharacter(char) {
        // Escape characters that have special meaning in AppleScript
        const escapeMap = {
            '"': '\\"',
            '\\': '\\\\',
            '\n': '\\n',
            '\r': '\\r',
            '\t': '\\t'
        };
        
        return escapeMap[char] || char;
    }
    
    // NEW: Properly escape entire text strings for AppleScript
    escapeTextForAppleScript(text) {
        if (!text) return '';
        
        return text
            .replace(/\\/g, '\\\\')   // Escape backslashes first
            .replace(/"/g, '\\"')     // Escape double quotes
            .replace(/\n/g, '\\n')    // Escape newlines
            .replace(/\r/g, '\\r')    // Escape carriage returns
            .replace(/\t/g, '\\t');   // Escape tabs
    }

    getTypingError(char) {
        const lowerChar = char.toLowerCase();
        const possibleErrors = this.commonErrors[lowerChar];
        
        if (possibleErrors && possibleErrors.length > 0) {
            const errorChar = possibleErrors[Math.floor(Math.random() * possibleErrors.length)];
            // Preserve original case
            return char === char.toUpperCase() ? errorChar.toUpperCase() : errorChar;
        }
        
        // Fallback: return a random adjacent character
        const alphabet = 'abcdefghijklmnopqrstuvwxyz';
        const randomChar = alphabet[Math.floor(Math.random() * alphabet.length)];
        return char === char.toUpperCase() ? randomChar.toUpperCase() : randomChar;
    }

    calculateCurrentWPM() {
        const baseWPM = this.typingProfile.baseWPM;
        const variation = this.typingProfile.wpmVariation;
        return baseWPM + (Math.random() - 0.5) * 2 * variation;
    }

    calculateCharacterDelay(wpm, consecutiveChars) {
        // Convert WPM to milliseconds per character
        // Assuming average word length of 5 characters
        const msPerChar = (60 * 1000) / (wpm * 5);
        
        // Add variation
        const variation = this.typingProfile.delayVariation;
        const variationMs = (Math.random() - 0.5) * 2 * variation;
        
        // Add fatigue effect (slightly slower as we type more)
        const fatigueMultiplier = 1 + (consecutiveChars * 0.0001);
        
        return Math.max(50, msPerChar * fatigueMultiplier + variationMs);
    }

    adjustTypingSpeed(currentWPM) {
        // Occasionally burst or slow down
        if (Math.random() < this.typingProfile.burstTypingChance) {
            console.log('[HumanTyper] ⚡ Burst typing mode');
            return currentWPM * 1.3;
        } else if (Math.random() < this.typingProfile.slowdownChance) {
            console.log('[HumanTyper] 🐌 Slowdown mode');
            return currentWPM * 0.7;
        }
        
        // Gradual return to base speed
        const baseWPM = this.typingProfile.baseWPM;
        return currentWPM + (baseWPM - currentWPM) * 0.1;
    }

    async typeDirectly(text) {
        // Fast typing without human characteristics - use proper text escaping
        try {
            // For moderate to long text, break it into chunks to avoid AppleScript limits
            if (text.length > 150) {
                console.log(`[HumanTyper] Breaking long text (${text.length} chars) into chunks`);
                await this.typeInChunks(text);
                return;
            }
            
            const escapedText = this.escapeTextForAppleScript(text);
            const script = `
                tell application "System Events"
                    keystroke "${escapedText}"
                end tell
            `;
            
            await this.runAppleScript(script);
        } catch (error) {
            console.warn(`[HumanTyper] Direct typing failed, trying chunk method:`, error.message);
            await this.typeInChunks(text);
        }
    }
    
    // NEW: Break long text into manageable chunks
    async typeInChunks(text, chunkSize = 120) {
        const chunks = [];
        for (let i = 0; i < text.length; i += chunkSize) {
            chunks.push(text.substring(i, i + chunkSize));
        }
        
        console.log(`[HumanTyper] Typing ${chunks.length} chunks`);
        
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            try {
                const escapedText = this.escapeTextForAppleScript(chunk);
                const script = `
                    tell application "System Events"
                        keystroke "${escapedText}"
                    end tell
                `;
                
                await this.runAppleScript(script);
                
                // Longer delay between chunks to prevent system overload
                await this.delay(150);
            } catch (error) {
                console.error(`[HumanTyper] Failed to type chunk ${i + 1}:`, error.message);
                // Try character-by-character for this chunk
                await this.typeCharacterByCharacter(chunk);
            }
        }
    }
    
    // NEW: Fallback method - type character by character
    async typeCharacterByCharacter(text) {
        console.log(`[HumanTyper] Falling back to character-by-character typing for ${text.length} chars`);
        
        for (const char of text) {
            try {
                await this.typeCharacter(char);
                await this.delay(50); // Small delay between characters
            } catch (error) {
                console.warn(`[HumanTyper] Failed to type character '${char}':`, error.message);
                // Skip problematic characters rather than failing completely
            }
        }
    }

    async runAppleScript(script) {
        return new Promise((resolve, reject) => {
            try {
                // Use temporary file approach like FieldFinder (works correctly)
                
                const tempFile = path.join(os.tmpdir(), `humantyper_script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.scpt`);
                
                try {
                    // Write script to temp file with proper encoding
                    fs.writeFileSync(tempFile, script.trim(), 'utf8');
                    
                    // Execute using temp file
                    const command = `osascript "${tempFile}"`;
                    const result = execSync(command, { 
                        encoding: 'utf8',
                        timeout: 10000,  // Increased timeout
                        maxBuffer: 1024 * 1024  // 1MB buffer
                    });
                    
                    // Clean up temp file
                    try {
                        fs.unlinkSync(tempFile);
                    } catch (cleanupError) {
                        // Ignore cleanup errors
                        console.warn('[HumanTyper] Could not clean up temp file:', cleanupError.message);
                    }
                    
                    resolve(result.trim());
                    
                } catch (execError) {
                    // Clean up temp file on error
                    try {
                        if (fs.existsSync(tempFile)) {
                            fs.unlinkSync(tempFile);
                        }
                    } catch (cleanupError) {
                        // Ignore cleanup errors
                    }
                    
                    throw execError;
                }
                
            } catch (error) {
                reject(new Error(`AppleScript execution failed: ${error.message}`));
            }
        });
    }

    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Configuration methods
    setTypingSpeed(speed) {
        const speedProfiles = {
            slow: { baseWPM: 30, wpmVariation: 10 },
            normal: { baseWPM: 65, wpmVariation: 15 },
            fast: { baseWPM: 90, wpmVariation: 20 }
        };
        
        if (speedProfiles[speed]) {
            Object.assign(this.typingProfile, speedProfiles[speed]);
            console.log(`[HumanTyper] Set typing speed to: ${speed}`);
        }
    }

    setErrorRate(rate) {
        this.typingProfile.errorRate = Math.max(0, Math.min(1, rate));
        console.log(`[HumanTyper] Set error rate to: ${this.typingProfile.errorRate * 100}%`);
    }

    getTypingProfile() {
        return { ...this.typingProfile };
    }

    updateProfile(updates) {
        Object.assign(this.typingProfile, updates);
        console.log('[HumanTyper] Typing profile updated');
    }

    // Test method
    async testTyping(testText = "Hello, this is a test of human-like typing with some errors!") {
        console.log('[HumanTyper] 🧪 Testing human typing...');
        try {
            await this.typeText(testText, {
                humanLike: true,
                includeErrors: true,
                includeBackspacing: true
            });
            console.log('[HumanTyper] ✅ Test completed successfully');
        } catch (error) {
            console.error('[HumanTyper] ❌ Test failed:', error);
        }
    }
}

module.exports = HumanTyper; 