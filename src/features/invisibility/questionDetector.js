const { EventEmitter } = require('events');
const modelStateService = require('../common/services/modelStateService');

class QuestionDetector extends EventEmitter {
    constructor() {
        super();
        this.isInitialized = false;
        this.questionPatterns = {
            // Programming/coding question patterns
            coding: [
                /write\s+a\s+(function|method|class|algorithm)/i,
                /implement\s+the\s+following/i,
                /complete\s+the\s+(code|function|method)/i,
                /solve\s+the\s+following\s+problem/i,
                /given\s+the\s+following\s+(array|string|object|data)/i,
                /return\s+the\s+(result|answer|output)/i,
                /find\s+the\s+(maximum|minimum|sum|length)/i,
                /sort\s+the\s+(array|list)/i,
                /reverse\s+the\s+(string|array)/i,
                /check\s+if\s+the\s+(string|array|number)/i,
                /time\s+complexity/i,
                /space\s+complexity/i,
                /algorithm\s+to/i,
                /data\s+structure/i,
                /binary\s+tree/i,
                /linked\s+list/i,
                /hash\s+table/i,
                /dynamic\s+programming/i,
                /two\s+pointers/i,
                /sliding\s+window/i,
                /breadth.first\s+search/i,
                /depth.first\s+search/i
            ],
            
            // Interview question patterns
            interview: [
                /tell\s+me\s+about\s+yourself/i,
                /why\s+do\s+you\s+want\s+to\s+work/i,
                /what\s+are\s+your\s+(strengths|weaknesses)/i,
                /where\s+do\s+you\s+see\s+yourself/i,
                /describe\s+a\s+time\s+when/i,
                /give\s+me\s+an\s+example\s+of/i,
                /how\s+do\s+you\s+handle/i,
                /what\s+motivates\s+you/i,
                /why\s+are\s+you\s+leaving/i,
                /what\s+is\s+your\s+greatest/i,
                /how\s+do\s+you\s+work\s+under\s+pressure/i,
                /describe\s+your\s+ideal/i,
                /what\s+questions\s+do\s+you\s+have\s+for\s+us/i
            ],
            
            // Technical interview patterns
            technical: [
                /explain\s+the\s+difference\s+between/i,
                /what\s+is\s+(a|an)\s+.+\?/i,
                /how\s+does\s+.+\s+work\?/i,
                /when\s+would\s+you\s+use/i,
                /what\s+are\s+the\s+advantages/i,
                /compare\s+and\s+contrast/i,
                /design\s+a\s+system/i,
                /how\s+would\s+you\s+optimize/i,
                /what\s+are\s+the\s+trade.offs/i,
                /scalability/i,
                /microservices/i,
                /database\s+design/i,
                /load\s+balancing/i,
                /caching/i,
                /rest\s+api/i,
                /graphql/i,
                /oauth/i,
                /jwt/i,
                /docker/i,
                /kubernetes/i,
                /aws/i,
                /cloud/i
            ],
            
            // Math/logic question patterns
            math: [
                /calculate\s+the/i,
                /find\s+the\s+(value|solution)/i,
                /solve\s+for\s+x/i,
                /what\s+is\s+the\s+(sum|product|quotient)/i,
                /if\s+.+\s+then\s+what/i,
                /given\s+that\s+.+\s+calculate/i,
                /probability/i,
                /statistics/i,
                /derivative/i,
                /integral/i,
                /equation/i,
                /formula/i
            ],
            
            // General question patterns
            general: [
                /what\s+is\s+your\s+answer/i,
                /please\s+(answer|respond|explain)/i,
                /your\s+(thoughts|opinion|view)/i,
                /how\s+would\s+you\s+(approach|solve|handle)/i,
                /what\s+would\s+you\s+do\s+if/i,
                /\?\s*$/m, // Ends with question mark
                /answer\s+the\s+following/i,
                /respond\s+to\s+the/i,
                /provide\s+your/i,
                /explain\s+why/i,
                /justify\s+your/i
            ]
        };

        console.log('[QuestionDetector] Initialized with comprehensive question patterns');
    }

    async initialize() {
        try {
            // Verify we have access to vision models - gracefully handle database unavailability
            let modelInfo;
            try {
                modelInfo = await modelStateService.getCurrentModelInfo('llm');
            } catch (dbError) {
                if (dbError.message.includes('Database not connected')) {
                    console.warn('[QuestionDetector] Database not available yet, initializing in offline mode');
                    this.isInitialized = true;
                    console.log('[QuestionDetector] Initialized in offline mode - will attempt model access when needed');
                    return true;
                } else {
                    throw dbError;
                }
            }
            
            if (!modelInfo) {
                console.warn('[QuestionDetector] No LLM model configured yet, initializing in offline mode');
                this.isInitialized = true;
                console.log('[QuestionDetector] Initialized in offline mode - will attempt model access when needed');
                return true;
            }

            this.isInitialized = true;
            console.log('[QuestionDetector] Initialized successfully with model:', modelInfo.model);
            return true;
        } catch (error) {
            console.error('[QuestionDetector] Initialization failed:', error);
            return false;
        }
    }

    async detectQuestions(screenshotBase64) {
        if (!this.isInitialized) {
            throw new Error('QuestionDetector not initialized');
        }

        try {
            console.log('[QuestionDetector] Analyzing screenshot for questions...');

            // Step 1: Extract text from image using vision model
            const extractedText = await this.extractTextFromImage(screenshotBase64);
            if (!extractedText) {
                console.log('[QuestionDetector] No text extracted from image');
                return [];
            }

            console.log(`[QuestionDetector] Extracted text (${extractedText.length} chars):`, extractedText.substring(0, 200) + '...');

            // Step 2: Use pattern matching for quick detection
            const patternQuestions = this.detectQuestionsWithPatterns(extractedText);

            // Step 3: Use AI for more sophisticated detection
            const aiQuestions = await this.detectQuestionsWithAI(extractedText, screenshotBase64);

            // Step 4: Combine and rank results
            const allQuestions = [...patternQuestions, ...aiQuestions];
            const uniqueQuestions = this.deduplicateQuestions(allQuestions);
            const rankedQuestions = this.rankQuestions(uniqueQuestions);

            console.log(`[QuestionDetector] Found ${rankedQuestions.length} question(s)`);
            return rankedQuestions;
        } catch (error) {
            console.error('[QuestionDetector] Error detecting questions:', error);
            return [];
        }
    }

    async extractTextFromImage(screenshotBase64) {
        try {
            const modelInfo = await modelStateService.getCurrentModelInfo('llm');
            
            // Use the same AI provider system as askService
            const { createStreamingLLM } = require('../common/ai/factory');
            const llm = createStreamingLLM(modelInfo.provider, {
                apiKey: modelInfo.apiKey,
                model: modelInfo.model,
                temperature: 0.1,
                maxTokens: 1000,
                usePortkey: modelInfo.provider === 'openai-leviousa',
                portkeyVirtualKey: modelInfo.provider === 'openai-leviousa' ? modelInfo.apiKey : undefined,
            });
            
            const messages = [
                {
                    role: 'system',
                    content: 'Extract ALL text from this image. Return only the text content, preserving structure and formatting where possible. Do not add any commentary or explanation.'
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Please extract all text from this image:' },
                        { 
                            type: 'image_url', 
                            image_url: { url: `data:image/jpeg;base64,${screenshotBase64}` }
                        }
                    ]
                }
            ];
            
            // For text extraction, we don't need streaming, so we'll read the full response
            const response = await llm.streamChat(messages);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        if (data === '[DONE]') {
                            break;
                        }
                        try {
                            const json = JSON.parse(data);
                            const token = json.choices[0]?.delta?.content || '';
                            if (token) {
                                fullResponse += token;
                            }
                        } catch (parseError) {
                            // Skip malformed JSON
                        }
                    }
                }
            }
            
            return fullResponse.trim();
            
        } catch (error) {
            console.error('[QuestionDetector] Error extracting text from image:', error);
            return null;
        }
    }

    detectQuestionsWithPatterns(text) {
        const questions = [];
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 10);

        for (const line of lines) {
            for (const [category, patterns] of Object.entries(this.questionPatterns)) {
                for (const pattern of patterns) {
                    if (pattern.test(line)) {
                        questions.push({
                            text: line,
                            type: 'pattern',
                            category,
                            confidence: this.calculatePatternConfidence(line, pattern),
                            source: 'pattern_matching'
                        });
                        break; // Only count once per line
                    }
                }
            }
        }

        return questions;
    }

    async detectQuestionsWithAI(text, screenshotBase64) {
        try {
            const modelInfo = await modelStateService.getCurrentModelInfo('llm');
            const { createStreamingLLM } = require('../common/ai/factory');
            const llm = createStreamingLLM(modelInfo.provider, {
                apiKey: modelInfo.apiKey,
                model: modelInfo.model,
                temperature: 0.1,
                maxTokens: 2000,
                usePortkey: modelInfo.provider === 'openai-leviousa',
                portkeyVirtualKey: modelInfo.provider === 'openai-leviousa' ? modelInfo.apiKey : undefined,
            });

            const messages = [
                {
                    role: 'system',
                    content: `Analyze this text and image to identify questions that require answers. Look for:

1. Coding/programming questions (algorithms, data structures, implementation tasks)
2. Interview questions (behavioral, situational, technical)
3. Math/logic problems
4. Any text that appears to be asking for a response or solution

For each question found, determine:
- The exact question text
- Question type (coding, interview, technical, math, general)
- Confidence level (0-100)
- Context clues that suggest it's a question

Return a JSON array of questions in this format:
[
  {
    "text": "exact question text",
    "type": "coding|interview|technical|math|general",
    "confidence": 85,
    "context": "brief description of why this is identified as a question"
  }
]

If no questions are found, return an empty array: []`
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: `Analyze this text for questions:\n\n${text}` },
                        { 
                            type: 'image_url', 
                            image_url: { url: `data:image/jpeg;base64,${screenshotBase64}` }
                        }
                    ]
                }
            ];

            // Read the full streaming response
            const response = await llm.streamChat(messages);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        if (data === '[DONE]') {
                            break;
                        }
                        try {
                            const json = JSON.parse(data);
                            const token = json.choices[0]?.delta?.content || '';
                            if (token) {
                                fullResponse += token;
                            }
                        } catch (parseError) {
                            // Skip malformed JSON
                        }
                    }
                }
            }

            // Parse JSON response
            const jsonMatch = fullResponse.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                console.log('[QuestionDetector] No valid JSON found in AI response');
                return [];
            }

            const questions = JSON.parse(jsonMatch[0]);
            return questions.map(q => ({
                ...q,
                source: 'ai_detection'
            }));
        } catch (error) {
            console.error('[QuestionDetector] Error in AI question detection:', error);
            return [];
        }
    }

    calculatePatternConfidence(text, pattern) {
        let confidence = 50; // Base confidence
        
        // Boost confidence based on question indicators
        if (text.includes('?')) confidence += 20;
        if (text.toLowerCase().includes('what') || text.toLowerCase().includes('how') || text.toLowerCase().includes('why')) confidence += 15;
        if (text.length > 20 && text.length < 200) confidence += 10;
        if (text.toLowerCase().includes('answer') || text.toLowerCase().includes('solve') || text.toLowerCase().includes('implement')) confidence += 15;
        
        return Math.min(confidence, 95);
    }

    deduplicateQuestions(questions) {
        const unique = [];
        const seen = new Set();

        for (const question of questions) {
            // Create a simplified version for comparison
            const simplified = question.text.toLowerCase().replace(/[^\w\s]/g, '').trim();
            
            if (!seen.has(simplified)) {
                seen.add(simplified);
                unique.push(question);
            }
        }

        return unique;
    }

    rankQuestions(questions) {
        // Sort by confidence and relevance
        return questions.sort((a, b) => {
            // Prioritize AI detection over pattern matching
            if (a.source === 'ai_detection' && b.source === 'pattern_matching') return -1;
            if (a.source === 'pattern_matching' && b.source === 'ai_detection') return 1;
            
            // Then by confidence
            return (b.confidence || 0) - (a.confidence || 0);
        });
    }

    // Public method to test question detection without full processing
    async testQuestionDetection(text) {
        const patternQuestions = this.detectQuestionsWithPatterns(text);
        console.log('Pattern-based questions found:', patternQuestions);
        return patternQuestions;
    }
}

module.exports = QuestionDetector; 