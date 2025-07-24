const { EventEmitter } = require('events');
const modelStateService = require('../common/services/modelStateService');

class MCPClient extends EventEmitter {
    constructor() {
        super();
        this.isInitialized = false;
        this.mcpServers = new Map();
        this.researchTools = [];
        
        // Question type to answer strategy mapping - Human-like responses
        this.answerStrategies = {
            coding: {
                systemPrompt: `You are responding as yourself to a coding question. Write code solutions without mentioning you're an AI. Be direct and practical. Don't use phrases like "Certainly!" or "I'd be happy to help". Just provide the solution with brief explanations as if you're a developer sharing knowledge.`,
                useResearch: true,
                maxTokens: 2000,
                temperature: 0.2
            },
            interview: {
                systemPrompt: `You are answering an interview question as yourself. Respond naturally as if you're in an actual interview. Don't mention being an AI or assistant. Use first person and share experiences as if they're your own. Be confident but natural.`,
                useResearch: false,
                maxTokens: 1500,
                temperature: 0.4
            },
            technical: {
                systemPrompt: `You are explaining a technical concept as someone knowledgeable in the field. Write as if you're explaining to a colleague. Be direct and informative without formal assistant language.`,
                useResearch: true,
                maxTokens: 1800,
                temperature: 0.3
            },
            math: {
                systemPrompt: `You are solving a math problem. Show your work step by step as if you're working through it yourself. Be methodical but don't use assistant phrases.`,
                useResearch: false,
                maxTokens: 1200,
                temperature: 0.1
            },
            general: {
                systemPrompt: `You are answering a question naturally as yourself. Be helpful and informative but write as if you're just someone knowledgeable sharing information, not an AI assistant.`,
                useResearch: true,
                maxTokens: 1000,
                temperature: 0.3
            }
        };

        // Research capabilities
        this.researchCapabilities = {
            webSearch: true,
            codeSearch: true,
            documentationSearch: true,
            stackOverflowSearch: true
        };

        console.log('[MCPClient] Initialized with intelligent answer strategies');
    }

    async initialize() {
        try {
            // Verify we have access to LLM models - gracefully handle database unavailability
            let modelInfo;
            try {
                modelInfo = await modelStateService.getCurrentModelInfo('llm');
            } catch (dbError) {
                if (dbError.message.includes('Database not connected')) {
                    console.warn('[MCPClient] Database not available yet, initializing in offline mode');
                    this.isInitialized = true;
                    console.log('[MCPClient] Initialized in offline mode - will attempt model access when needed');
                    return true;
                } else {
                    throw dbError;
                }
            }
            
            if (!modelInfo) {
                console.warn('[MCPClient] No LLM model configured yet, initializing in offline mode');
                this.isInitialized = true;
                console.log('[MCPClient] Initialized in offline mode - will attempt model access when needed');
                return true;
            }

            // Initialize research tools
            await this.initializeResearchTools();

            this.isInitialized = true;
            console.log('[MCPClient] Initialized successfully with model:', modelInfo.model);
            return true;
        } catch (error) {
            console.error('[MCPClient] Initialization failed:', error);
            return false;
        }
    }

    async initializeResearchTools() {
        // Initialize web search capability
        if (this.researchCapabilities.webSearch) {
            this.researchTools.push({
                name: 'web_search',
                description: 'Search the web for current information',
                execute: this.performWebSearch.bind(this)
            });
        }

        // Add more research tools as needed
        console.log(`[MCPClient] Initialized ${this.researchTools.length} research tools`);
    }

    async getAnswer(question, screenshotBase64) {
        if (!this.isInitialized) {
            throw new Error('MCPClient not initialized');
        }

        try {
            console.log(`[MCPClient] 🧠 Generating answer for ${question.type || 'general'} question...`);

            // Get the appropriate strategy for this question type
            const strategy = this.answerStrategies[question.type] || this.answerStrategies.general;

            // Perform research if needed
            let researchContext = '';
            if (strategy.useResearch) {
                researchContext = await this.performResearch(question);
            }

            // Generate the answer
            const answer = await this.generateAnswer(question, screenshotBase64, strategy, researchContext);

            // Post-process the answer
            const processedAnswer = this.postProcessAnswer(answer, question.type);

            console.log(`[MCPClient] ✅ Generated answer (${processedAnswer.length} characters)`);
            return processedAnswer;
        } catch (error) {
            console.error('[MCPClient] Error generating answer:', error);
            return null;
        }
    }

    async performResearch(question) {
        try {
            console.log('[MCPClient] 🔍 Performing research...');
            
            const researchResults = [];

            // Extract key terms from the question for research
            const searchTerms = this.extractSearchTerms(question);
            
            // Perform web search if available
            if (this.researchCapabilities.webSearch) {
                const webResults = await this.performWebSearch(searchTerms);
                if (webResults) {
                    researchResults.push({
                        source: 'web_search',
                        content: webResults
                    });
                }
            }

            // Combine research results
            const researchContext = researchResults
                .map(result => `### ${result.source}\n${result.content}`)
                .join('\n\n');

            console.log(`[MCPClient] Research completed: ${researchContext.length} characters`);
            return researchContext;
        } catch (error) {
            console.error('[MCPClient] Research failed:', error);
            return '';
        }
    }

    extractSearchTerms(question) {
        // Extract meaningful terms from the question for research
        const text = question.text.toLowerCase();
        
        // Programming-related terms
        const programmingTerms = [
            'algorithm', 'data structure', 'javascript', 'python', 'java', 'react', 'node.js',
            'database', 'sql', 'api', 'rest', 'graphql', 'docker', 'kubernetes', 'aws',
            'binary tree', 'linked list', 'hash table', 'array', 'string', 'sorting',
            'time complexity', 'space complexity', 'recursion', 'dynamic programming'
        ];

        // Technical terms
        const technicalTerms = [
            'architecture', 'microservices', 'scalability', 'performance', 'security',
            'authentication', 'authorization', 'oauth', 'jwt', 'encryption', 'ssl',
            'load balancing', 'caching', 'cdn', 'monitoring', 'logging'
        ];

        // Extract relevant terms
        const allTerms = [...programmingTerms, ...technicalTerms];
        const foundTerms = allTerms.filter(term => text.includes(term));

        // If no specific terms found, extract general keywords
        if (foundTerms.length === 0) {
            const words = text.split(' ').filter(word => 
                word.length > 3 && 
                !['what', 'how', 'why', 'when', 'where', 'which', 'that', 'this', 'with', 'from', 'they', 'them', 'have', 'been', 'will', 'would', 'could', 'should'].includes(word)
            );
            return words.slice(0, 5).join(' ');
        }

        return foundTerms.slice(0, 3).join(' ');
    }

    async performWebSearch(searchTerms) {
        try {
            // Web search is disabled for now - too many dependencies
            console.log('[MCPClient] Web search skipped (disabled)');
            return null;
        } catch (error) {
            console.error('[MCPClient] Web search failed:', error);
            return null;
        }
    }

    async generateAnswer(question, screenshotBase64, strategy, researchContext) {
        try {
            const modelInfo = await modelStateService.getCurrentModelInfo('llm');
            const { createStreamingLLM } = require('../common/ai/factory');
            const llm = createStreamingLLM(modelInfo.provider, {
                apiKey: modelInfo.apiKey,
                model: modelInfo.model,
                temperature: strategy.temperature,
                maxTokens: strategy.maxTokens,
                usePortkey: modelInfo.provider === 'openai-leviousa',
                portkeyVirtualKey: modelInfo.provider === 'openai-leviousa' ? modelInfo.apiKey : undefined,
            });

            // Build the prompt
            let userPrompt = `Question: ${question.text}`;
            
            if (question.context) {
                userPrompt += `\n\nContext: ${question.context}`;
            }

            if (researchContext) {
                userPrompt += `\n\nRelevant Information:\n${researchContext}`;
            }

            userPrompt += `\n\nPlease provide a clear, accurate, and helpful answer. Make it appropriate for the context (${question.type || 'general'} question).`;

            const messages = [
                {
                    role: 'system',
                    content: strategy.systemPrompt
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: userPrompt }
                    ]
                }
            ];

            // Include screenshot if available for visual context
            if (screenshotBase64) {
                messages[1].content.push({
                    type: 'image_url',
                    image_url: { url: `data:image/jpeg;base64,${screenshotBase64}` }
                });
            }

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

            return fullResponse.trim();
        } catch (error) {
            console.error('[MCPClient] Error generating answer:', error);
            throw error;
        }
    }

    postProcessAnswer(answer, questionType) {
        if (!answer) return '';

        // Remove common AI assistant phrases that sound robotic
        let processed = answer
            .replace(/^(Certainly!?|Of course!?|I'd be happy to help!?|Sure!?|Absolutely!?|I'd be glad to|I'll help you|Let me help)\s*/i, '')
            .replace(/^(Here's|Here is|Here are)\s+/i, '')
            .replace(/\s*(I hope this helps!?|Let me know if you need.*|Feel free to ask.*|Is there anything else.*|Hope this helps|If you have any questions|Please let me know)\s*$/i, '')
            .replace(/^(As an AI|As a language model|I'm an AI|As your assistant).*?\./i, '')
            .replace(/\b(I'd be glad|I'd be happy|I'm here to help|I can help|I can assist)\b.*?\./gi, '')
            .replace(/^(Based on your question|To answer your question|In response to your question),?\s*/i, '')
            .replace(/\b(according to my knowledge|in my opinion|from my understanding)\b/gi, '')
            .replace(/\b(I apologize|Sorry for|I'm sorry)\b.*?\./gi, '')
            .replace(/\s*(Thank you|Thanks for asking|Great question)\s*/gi, '')
            .trim();

        // Question-type specific post-processing
        switch (questionType) {
            case 'coding':
                // Ensure code blocks are properly formatted
                processed = this.formatCodeAnswer(processed);
                break;
            case 'interview':
                // Ensure professional tone
                processed = this.formatInterviewAnswer(processed);
                break;
            case 'math':
                // Ensure mathematical notation is clear
                processed = this.formatMathAnswer(processed);
                break;
        }

        // General cleanup
        processed = processed
            .replace(/^(Answer:|Response:|Solution:|Here's the solution:|The answer is:)\s*/i, '') // Remove prefixes
            .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
            .replace(/^\s*\n+/, '') // Remove leading newlines
            .trim();

        return processed;
    }

    formatCodeAnswer(answer) {
        // Preserve and improve code blocks formatting for typing
        let formatted = answer;
        
        // Convert markdown code blocks to plain text with proper formatting
        formatted = formatted.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, language, code) => {
            // Clean up the code content
            let cleanCode = code
                .replace(/^\n+/, '') // Remove leading newlines
                .replace(/\n+$/, '') // Remove trailing newlines
                .replace(/^[ ]{2,4}/gm, '    '); // Standardize to 4-space indentation
            
            // Add language label if present and useful
            if (language && ['python', 'javascript', 'java', 'cpp', 'c'].includes(language.toLowerCase())) {
                cleanCode = `# ${language.charAt(0).toUpperCase() + language.slice(1)} code:\n${cleanCode}`;
            }
            
            return cleanCode;
        });
        
        // Handle inline code
        formatted = formatted.replace(/`([^`]+)`/g, '$1');
        
        // Ensure proper Python function/class formatting
        if (formatted.includes('def ') || formatted.includes('class ')) {
            formatted = formatted
                .replace(/^def\s+/gm, 'def ') // Fix function definition spacing
                .replace(/^class\s+/gm, 'class ') // Fix class definition spacing
                .replace(/\s*:\s*$/gm, ':') // Fix colon spacing at line ends
                .replace(/:\s*\n/g, ':\n') // Ensure proper newlines after colons
                .replace(/^[ ]{1,3}(?=\S)/gm, '    ') // Standardize indentation to 4 spaces
                .replace(/^[ ]{5,7}(?=\S)/gm, '        ') // Fix nested indentation (8 spaces)
                .replace(/^[ ]{9,11}(?=\S)/gm, '            '); // Fix deep nested indentation (12 spaces)
        }
        
        // Improve readability with proper spacing
        formatted = formatted
            .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines to 2
            .replace(/^\s*\n+/, '') // Remove leading newlines
            .replace(/\n+$/, '\n') // Ensure single trailing newline
            .trim();

        // Add example usage comment for functions if not present
        if (formatted.includes('def ') && !formatted.includes('Example') && !formatted.includes('Usage')) {
            const lines = formatted.split('\n');
            const funcLines = lines.filter(line => line.trim().startsWith('def '));
            if (funcLines.length === 1) {
                const funcName = funcLines[0].match(/def\s+(\w+)/)?.[1];
                if (funcName) {
                    formatted += `\n\n# Example usage:\n# ${funcName}([64, 34, 25, 12, 22, 11, 90])`;
                }
            }
        }

        return formatted;
    }

    formatInterviewAnswer(answer) {
        // Ensure professional but natural interview format
        let formatted = answer
            // Remove overly formal language
            .replace(/^I would say that /i, '')
            .replace(/^In my professional opinion,? /i, '')
            .replace(/I believe that /i, '')
            // Ensure natural flow
            .replace(/\.\s*\.\s*\./g, '...') // Fix multiple periods
            .replace(/\s{2,}/g, ' ') // Fix multiple spaces
            .trim();

        return formatted;
    }

    formatMathAnswer(answer) {
        // Improve math formatting
        let formatted = answer
            // Remove LaTeX notation
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\[/g, '')
            .replace(/\\\]/g, '')
            // Fix mathematical symbols and spacing
            .replace(/\s*=\s*/g, ' = ')
            .replace(/\s*\+\s*/g, ' + ')
            .replace(/\s*-\s*/g, ' - ')
            .replace(/\s*\*\s*/g, ' × ')
            .replace(/\s*\/\s*/g, ' ÷ ')
            // Fix step formatting
            .replace(/step\s*(\d+):/gi, 'Step $1:')
            .replace(/\n\s*\n/g, '\n')
            .trim();

        return formatted;
    }

    // Configuration methods
    updateAnswerStrategy(questionType, strategy) {
        if (this.answerStrategies[questionType]) {
            Object.assign(this.answerStrategies[questionType], strategy);
            console.log(`[MCPClient] Updated strategy for ${questionType} questions`);
        }
    }

    enableResearchCapability(capability, enabled = true) {
        if (this.researchCapabilities.hasOwnProperty(capability)) {
            this.researchCapabilities[capability] = enabled;
            console.log(`[MCPClient] ${enabled ? 'Enabled' : 'Disabled'} ${capability}`);
        }
    }

    getAvailableStrategies() {
        return Object.keys(this.answerStrategies);
    }

    getResearchCapabilities() {
        return { ...this.researchCapabilities };
    }

    // Test method
    async testAnswerGeneration(testQuestion = {
        text: "What is the time complexity of binary search?",
        type: "technical",
        confidence: 90
    }) {
        console.log('[MCPClient] 🧪 Testing answer generation...');
        try {
            const answer = await this.getAnswer(testQuestion, null);
            console.log('[MCPClient] Test answer:', answer.substring(0, 200) + '...');
            return answer;
        } catch (error) {
            console.error('[MCPClient] Test failed:', error);
            return null;
        }
    }
}

module.exports = MCPClient; 