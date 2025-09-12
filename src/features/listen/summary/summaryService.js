const { BrowserWindow } = require('electron');
const { getSystemPrompt } = require('../../common/prompts/promptBuilder.js');
const { createLLM } = require('../../common/ai/factory');
const sessionRepository = require('../../common/repositories/session');
const summaryRepository = require('./repositories');
const modelStateService = require('../../common/services/modelStateService');

class SummaryService {
    constructor() {
        this.previousAnalysisResult = null;
        this.analysisHistory = [];
        this.conversationHistory = [];
        this.currentSessionId = null;
        
        // Performance optimizations
        this.analysisCache = null; // Smart caching for faster analysis
        
        // Callbacks
        this.onAnalysisComplete = null;
        this.onStatusUpdate = null;
    }

    setCallbacks({ onAnalysisComplete, onStatusUpdate }) {
        this.onAnalysisComplete = onAnalysisComplete;
        this.onStatusUpdate = onStatusUpdate;
    }

    setSessionId(sessionId) {
        this.currentSessionId = sessionId;
    }

    sendToRenderer(channel, data) {
        const { windowPool } = require('../../../window/windowManager');
        const listenWindow = windowPool?.get('listen');
        
        if (listenWindow && !listenWindow.isDestroyed()) {
            listenWindow.webContents.send(channel, data);
        }
    }

    addConversationTurn(speaker, text) {
        const conversationText = `${speaker.toLowerCase()}: ${text.trim()}`;
        this.conversationHistory.push(conversationText);
        console.log(`💬 Added conversation text: ${conversationText}`);
        console.log(`📈 Total conversation history: ${this.conversationHistory.length} texts`);

        // Trigger analysis if needed
        this.triggerAnalysisIfNeeded();
    }

    getConversationHistory() {
        return this.conversationHistory;
    }

    resetConversationHistory() {
        this.conversationHistory = [];
        this.previousAnalysisResult = null;
        this.analysisHistory = [];
        console.log('🔄 Conversation history and analysis state reset');
    }

    /**
     * Converts conversation history into text to include in the prompt.
     * @param {Array<string>} conversationTexts - Array of conversation texts ["me: ~~~", "them: ~~~", ...]
     * @param {number} maxTurns - Maximum number of recent turns to include
     * @returns {string} - Formatted conversation string for the prompt
     */
    formatConversationForPrompt(conversationTexts, maxTurns = 30) {
        if (conversationTexts.length === 0) return '';
        return conversationTexts.slice(-maxTurns).join('\n');
    }

    async makeOutlineAndRequests(conversationTexts, maxTurns = 15) {
        const startTime = Date.now();
        console.log(`⚡ Fast analysis called - ${conversationTexts.length} texts`);

        if (conversationTexts.length === 0) {
            console.log('⚠️ No conversation texts available for analysis');
            return null;
        }

        // OPTIMIZATION 1: Smart caching - avoid redundant analysis
        const conversationHash = this.generateConversationHash(conversationTexts);
        if (this.analysisCache && this.analysisCache.hash === conversationHash) {
            console.log('📋 Using cached analysis result');
            return this.analysisCache.result;
        }

        // OPTIMIZATION 2: Adaptive context - smart truncation for faster processing
        const smartContext = this.buildSmartContext(conversationTexts, maxTurns);

        try {
            // SAFE DATABASE OPERATIONS - check connection first
            if (this.currentSessionId) {
                try {
                    const sqliteClient = require('../../common/services/sqliteClient');
                    if (sqliteClient.isConnected()) {
                        await sessionRepository.touch(this.currentSessionId);
                    } else {
                        console.log('[SummaryService] Database not ready yet, skipping touch (analysis will continue)');
                    }
                } catch (dbError) {
                    console.warn('[SummaryService] DB touch failed, continuing with analysis:', dbError.message);
                }
            }

            // SAFE MODEL INFO ACCESS - handle database dependency gracefully
            let modelInfo = null;
            try {
                const sqliteClient = require('../../common/services/sqliteClient');
                if (sqliteClient.isConnected()) {
                    modelInfo = await modelStateService.getCurrentModelInfo('llm');
                } else {
                    console.log('[SummaryService] Database not ready, cannot get model info - analysis skipped');
                    return this.getDefaultAnalysisResult();
                }
            } catch (dbError) {
                console.warn('[SummaryService] Model info access failed, analysis skipped:', dbError.message);
                return this.getDefaultAnalysisResult();
            }
            
            if (!modelInfo || !modelInfo.apiKey) {
                console.warn('[SummaryService] AI model not configured, analysis skipped');
                return this.getDefaultAnalysisResult();
            }
            
            // OPTIMIZATION 4: Streamlined prompts for 3x faster response
            const messages = this.buildOptimizedPrompt(smartContext);

            console.log(`⚡ Sending optimized analysis to ${modelInfo.provider}`);

            // REVERT TO WORKING LLM SETTINGS  
            const llm = createLLM(modelInfo.provider, {
                apiKey: modelInfo.apiKey,
                model: modelInfo.model,
                temperature: 0.7, // Back to original working value
                maxTokens: 1024, // Back to original working token limit
                usePortkey: modelInfo.provider === 'openai-leviousa',
                portkeyVirtualKey: modelInfo.provider === 'openai-leviousa' ? modelInfo.apiKey : undefined,
            });

            const completion = await llm.chat(messages);
            const responseText = completion.content;
            
            // Use the original parsing method that works reliably
            const structuredData = this.parseResponseText(responseText, this.previousAnalysisResult);

            // SAFE DATABASE SAVE - check connection and handle gracefully
            if (this.currentSessionId) {
                try {
                    const sqliteClient = require('../../common/services/sqliteClient');
                    if (sqliteClient.isConnected()) {
                        await summaryRepository.saveSummary({
                            sessionId: this.currentSessionId,
                            text: responseText,
                            tldr: structuredData.summary.join('\n'),
                            bullet_json: JSON.stringify(structuredData.topic.bullets),
                            action_json: JSON.stringify(structuredData.actions),
                            model: modelInfo.model
                        });
                        console.log('[SummaryService] ✅ Analysis saved to database');
                    } else {
                        console.log('[SummaryService] Database not ready, analysis will not be persisted (analysis still works)');
                    }
                } catch (err) {
                    console.warn('[SummaryService] DB save failed (non-critical):', err.message);
                    // Continue with analysis even if database save fails
                }
            }

            // OPTIMIZATION 8: Update state and cache
            this.updateAnalysisState(structuredData, conversationTexts.length, conversationHash);

            const duration = Date.now() - startTime;
            console.log(`⚡ Analysis completed in ${duration}ms`);

            return structuredData;

        } catch (error) {
            console.error('❌ Error during fast analysis:', error.message);
            return this.previousAnalysisResult || this.getDefaultAnalysisResult();
        }
    }

    // OPTIMIZATION HELPER METHODS

    generateConversationHash(texts) {
        // Simple hash for caching - last 3 texts + length
        const recent = texts.slice(-3).join('').toLowerCase();
        return `${recent.length}-${texts.length}`;
    }

    buildSmartContext(conversationTexts, maxTurns) {
        // Smart context: prioritize recent turns and significant content changes
        const recentTexts = conversationTexts.slice(-maxTurns);
        
        // If we have previous analysis, only include new content + small context
        if (this.previousAnalysisResult && conversationTexts.length > 5) {
            const newContent = conversationTexts.slice(-5); // Only last 5 for incremental
            return {
                conversation: this.formatConversationForPrompt(newContent, 5),
                isIncremental: true,
                previousContext: {
                    topic: this.previousAnalysisResult.topic.header,
                    summary: this.previousAnalysisResult.summary.slice(0, 2).join(', ')
                }
            };
        }
        
        return {
            conversation: this.formatConversationForPrompt(recentTexts, maxTurns),
            isIncremental: false
        };
    }

    buildOptimizedPrompt(smartContext) {
        // REVERT TO WORKING PROMPT STRUCTURE
        const basePrompt = getSystemPrompt('leviousa_analysis', '', false);
        const systemPrompt = basePrompt.replace('{{CONVERSATION_HISTORY}}', smartContext.conversation);

        let contextualPrompt = '';
        if (smartContext.isIncremental && smartContext.previousContext) {
            contextualPrompt = `
Previous Analysis Context:
- Main Topic: ${smartContext.previousContext.topic}
- Key Points: ${smartContext.previousContext.summary}

Please build upon this context while analyzing the new conversation segments.
`;
        }

        const userContent = `${contextualPrompt}

Analyze this conversation and extract the ACTUAL SPECIFIC TOPIC being discussed. Do NOT use generic terms like "Discussion", "Meeting", or "Conversation". Focus on what they're actually talking about.

Format your response as follows:

**Summary Overview**
- Main discussion point with specific context

**Key Topic: [SPECIFIC ACTUAL TOPIC - e.g. "Product Launch Strategy", "Bug Fix Implementation", "Client Requirements Review"]**
- First key insight about this specific topic
- Second key insight about this specific topic  
- Third key insight about this specific topic

**Extended Explanation**
Provide 2-3 sentences explaining the specific context and implications of this particular topic.

**Suggested Questions**
1. Specific follow-up question about this topic?
2. Second specific question about this topic?
3. Third specific question about this topic?

CRITICAL: The "Key Topic" must be the ACTUAL SPECIFIC SUBJECT they discussed, not generic words. Examples:
- Good: "Calendar Integration Debugging", "Notion Workspace Organization", "LinkedIn OAuth Scope Issues" 
- Bad: "Discussion", "Meeting", "Tech Talk", "Conversation"

Keep all points concise and topic-specific.`;

        return [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
        ];
    }

    fastParseResponse(responseText, previousResult) {
        const structuredData = {
            summary: [],
            topic: { header: '', bullets: [] },
            actions: ['✨ What should I say next?'],
            followUps: ['✉️ Send a follow-up email', '📅 Book Calendar', '📝 Save to Notion'],
            searchSuggestions: []
        };

        // Use previousResult as baseline for incremental updates
        if (previousResult) {
            structuredData.topic.header = previousResult.topic.header;
            // Don't copy previous summary - extract fresh summary each time
        }

        try {
            // Optimized parsing with simpler regex patterns
            const lines = responseText.split('\n').map(line => line.trim());
            let foundSummary = false;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Fast summary extraction - clear array first and extract fresh
                if (line.includes('**Summary') || line.includes('Summary:')) {
                    structuredData.summary = []; // Clear previous summary
                    this.extractBulletPoints(lines, i + 1, structuredData.summary, 3);
                    foundSummary = true;
                }
                
                // Fast topic extraction
                else if (line.includes('**Topic') || line.includes('Topic:')) {
                    const topicMatch = line.match(/Topic[:\s]*(.+)/);
                    if (topicMatch) {
                        structuredData.topic.header = topicMatch[1].replace(/\**/g, '').trim() + ':';
                    }
                    this.extractBulletPoints(lines, i + 1, structuredData.topic.bullets, 3);
                }
                
                // Fast insights extraction
                else if (line.includes('**Insights') || line.includes('Insights:')) {
                    this.extractBulletPoints(lines, i + 1, structuredData.topic.bullets, 3);
                }
                
                // Fast questions extraction
                else if (line.includes('**Questions') || line.includes('Questions:')) {
                    this.extractQuestions(lines, i + 1, structuredData.actions, 2);
                }
            }

            // Generate search suggestions efficiently
            structuredData.searchSuggestions = this.generateSearchSuggestions(responseText, structuredData);

            // CRITICAL FIX: If no summary found, create one from topic bullets or previous result
            if (structuredData.summary.length === 0) {
                if (structuredData.topic.bullets.length > 0) {
                    // Use topic bullets as summary if no explicit summary found
                    structuredData.summary = structuredData.topic.bullets.slice(0, 3);
                } else if (previousResult && previousResult.summary.length > 0) {
                    // Fallback to previous summary if available
                    structuredData.summary = previousResult.summary.slice(0, 3);
                } else {
                    // Last resort: generate basic summary from any content found
                    structuredData.summary = ['Discussion in progress...'];
                }
            }

        } catch (error) {
            console.warn('Fast parsing failed, using fallback:', error.message);
            // Fallback: use previous result if available
            if (previousResult) {
                return previousResult;
            }
        }

        return structuredData;
    }

    extractBulletPoints(lines, startIdx, targetArray, maxCount) {
        for (let i = startIdx; i < lines.length && targetArray.length < maxCount; i++) {
            const line = lines[i];
            if (line.startsWith('-') || line.startsWith('•')) {
                const point = line.substring(1).trim();
                if (point && !targetArray.includes(point)) {
                    targetArray.push(point);
                }
            } else if (line.startsWith('**') || line.includes(':')) {
                break; // Next section
            }
        }
    }

    extractQuestions(lines, startIdx, targetArray, maxCount) {
        let questionCount = 0;
        for (let i = startIdx; i < lines.length && questionCount < maxCount; i++) {
            const line = lines[i];
            if (line.match(/^\d+\./) || line.startsWith('-') || line.startsWith('•')) {
                const question = line.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '').trim();
                if (question.includes('?')) {
                    targetArray.push(`❓ ${question}`);
                    questionCount++;
                }
            } else if (line.startsWith('**') || line.includes(':')) {
                break; // Next section
            }
        }
    }


    updateAnalysisState(structuredData, conversationLength, conversationHash) {
            this.previousAnalysisResult = structuredData;
        
        // Cache the result for potential reuse
        this.analysisCache = {
            hash: conversationHash,
            result: structuredData,
            timestamp: Date.now()
        };

            this.analysisHistory.push({
                timestamp: Date.now(),
                data: structuredData,
            conversationLength: conversationLength,
            });

            if (this.analysisHistory.length > 10) {
                this.analysisHistory.shift();
            }
    }

    getDefaultAnalysisResult() {
        return {
            summary: ['Analyzing conversation...'],
            topic: { header: 'Discussion in progress', bullets: [] },
            actions: ['✨ What should I say next?'],
            followUps: ['✉️ Send a follow-up email', '📅 Book Calendar', '📝 Save to Notion'],
            searchSuggestions: []
        };
    }

    parseResponseText(responseText, previousResult) {
        const structuredData = {
            summary: [],
              topic: { header: '', bullets: [] },
              actions: [],
              followUps: ['✉️ Send a follow-up email', '📅 Book Calendar', '📝 Save to Notion'],
              searchSuggestions: [], // New section for web search suggestions
        };

        // 이전 결과가 있으면 기본값으로 사용
        if (previousResult) {
            structuredData.topic.header = previousResult.topic.header;
            structuredData.summary = [...previousResult.summary];
        }

        try {
            const lines = responseText.split('\n');
            let currentSection = '';
            let isCapturingTopic = false;
            let topicName = '';

            for (const line of lines) {
                const trimmedLine = line.trim();

                // 섹션 헤더 감지
                if (trimmedLine.startsWith('**Summary Overview**')) {
                    currentSection = 'summary-overview';
                    continue;
                } else if (trimmedLine.startsWith('**Key Topic:')) {
                    currentSection = 'topic';
                    isCapturingTopic = true;
                    topicName = trimmedLine.match(/\*\*Key Topic: (.+?)\*\*/)?.[1] || '';
                    if (topicName) {
                        structuredData.topic.header = topicName + ':';
                    }
                    continue;
                } else if (trimmedLine.startsWith('**Extended Explanation**')) {
                    currentSection = 'explanation';
                    continue;
                } else if (trimmedLine.startsWith('**Suggested Questions**')) {
                    currentSection = 'questions';
                    continue;
                }

                // 컨텐츠 파싱
                if (trimmedLine.startsWith('-') && currentSection === 'summary-overview') {
                    const summaryPoint = trimmedLine.substring(1).trim();
                    if (summaryPoint && !structuredData.summary.includes(summaryPoint)) {
                        // 기존 summary 업데이트 (최대 5개 유지)
                        structuredData.summary.unshift(summaryPoint);
                        if (structuredData.summary.length > 5) {
                            structuredData.summary.pop();
                        }
                    }
                } else if (trimmedLine.startsWith('-') && currentSection === 'topic') {
                    const bullet = trimmedLine.substring(1).trim();
                    if (bullet && structuredData.topic.bullets.length < 3) {
                        structuredData.topic.bullets.push(bullet);
                    }
                } else if (currentSection === 'explanation' && trimmedLine) {
                    // explanation을 topic bullets에 추가 (문장 단위로)
                    const sentences = trimmedLine
                        .split(/\.\s+/)
                        .filter(s => s.trim().length > 0)
                        .map(s => s.trim() + (s.endsWith('.') ? '' : '.'));

                    sentences.forEach(sentence => {
                        if (structuredData.topic.bullets.length < 3 && !structuredData.topic.bullets.includes(sentence)) {
                            structuredData.topic.bullets.push(sentence);
                        }
                    });
                } else if (trimmedLine.match(/^\d+\./) && currentSection === 'questions') {
                    const question = trimmedLine.replace(/^\d+\.\s*/, '').trim();
                    if (question && question.includes('?')) {
                        structuredData.actions.push(`❓ ${question}`);
                    }
                }
            }

            // 기본 액션 추가 - Keep only essential meeting actions
            const defaultActions = ['✨ What should I say next?'];
            defaultActions.forEach(action => {
                if (!structuredData.actions.includes(action)) {
                    structuredData.actions.push(action);
                }
            });

            // 액션 개수 제한
            structuredData.actions = structuredData.actions.slice(0, 5);

            // Generate search suggestions based on conversation content
            structuredData.searchSuggestions = this.generateSearchSuggestions(responseText, structuredData);

            // 유효성 검증 및 이전 데이터 병합
            if (structuredData.summary.length === 0 && previousResult) {
                structuredData.summary = previousResult.summary;
            }
            if (structuredData.topic.bullets.length === 0 && previousResult) {
                structuredData.topic.bullets = previousResult.topic.bullets;
            }
        } catch (error) {
            console.error('❌ Error parsing response text:', error);
            // 에러 시 이전 결과 반환
            return (
                previousResult || {
                    summary: [],
                    topic: { header: 'Analysis in progress', bullets: [] },
                    actions: ['✨ What should I say next?'],
                    followUps: ['✉️ Send a follow-up email', '📅 Book Calendar', '📝 Save to Notion'],
                    searchSuggestions: []
                }
            );
        }

        console.log('📊 Final structured data:', JSON.stringify(structuredData, null, 2));
        return structuredData;
    }

    /**
     * Get the latest structured data (for follow-up questions, etc.)
     */
    getLatestStructuredData() {
        try {
            return this.previousAnalysisResult;
        } catch (error) {
            console.warn('[SummaryService] Error getting latest structured data:', error.message);
            return null;
        }
    }

    /**
     * Generate intelligent search suggestions based on conversation content and context
     */
    generateSearchSuggestions(responseText, structuredData) {
        const searchSuggestions = [];
        
        try {
            // Use full conversation history for better context, not just AI response
            const conversationText = this.conversationHistory.join(' ').toLowerCase();
            const allText = [
                conversationText,
                responseText || '',
                structuredData.topic.header || '',
                ...structuredData.summary,
                ...structuredData.topic.bullets
            ].join(' ');

            const entities = this.extractIntelligentEntities(allText);
            const contextClues = this.analyzeConversationContext(conversationText);
            
            // Prioritize entities based on conversation context and frequency
            const prioritizedEntities = this.prioritizeEntities(entities, contextClues);
            
            // Generate contextual search suggestions
            prioritizedEntities.slice(0, 6).forEach(entity => {
                const suggestion = this.generateContextualSuggestion(entity, contextClues);
                if (suggestion && !searchSuggestions.includes(suggestion)) {
                            searchSuggestions.push(suggestion);
                }
            });

            console.log(`[SummaryService] Generated ${searchSuggestions.length} intelligent search suggestions:`, searchSuggestions);
            return searchSuggestions;

        } catch (error) {
            console.error('[SummaryService] Error generating search suggestions:', error);
            return [];
        }
    }

    /**
     * Extract entities with enhanced intelligence and context awareness
     */
    extractIntelligentEntities(allText) {
        const entities = new Map(); // Use Map to track frequency and context

        // Enhanced company patterns with industry context
        const companyPatterns = [
            // Traditional company patterns
            /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc|Corp|LLC|Ltd|Co|Company|Technologies|Tech|Systems|Solutions|Labs|AI|Software|Services|Group|Partners|Ventures)))\b/g,
            // Startup patterns
            /\b(Y\s*Combinator|YC|Techstars|500\s*Startups|Andreessen\s*Horowitz|a16z|Sequoia|Kleiner\s*Perkins)\b/gi,
            // Famous tech companies (case-sensitive for accuracy)
            /\b(Apple|Microsoft|Google|Amazon|Facebook|Meta|Tesla|Netflix|Uber|Airbnb|Spotify|Slack|Discord|TikTok|Instagram|WhatsApp|LinkedIn|Twitter|Zoom|Dropbox|Snapchat|Pinterest|Reddit|Shopify|Stripe|Square|PayPal|Salesforce|Adobe|Oracle|IBM|Intel|NVIDIA|AMD|Qualcomm|Cisco|VMware|ServiceNow|Workday|CrowdStrike|Snowflake|Databricks|Palantir|Unity|Roblox|Epic\s*Games|Activision|Electronic\s*Arts|Take-Two)\b/g
        ];

        // Enhanced technology patterns with emerging tech
        const techPatterns = [
            // Core technologies
            /\b(artificial\s*intelligence|machine\s*learning|deep\s*learning|neural\s*networks?|computer\s*vision|natural\s*language\s*processing|NLP|reinforcement\s*learning|generative\s*AI|large\s*language\s*models?|LLMs?)\b/gi,
            // Programming and frameworks
            /\b(React|Angular|Vue\.?js|Node\.?js|Python|JavaScript|TypeScript|Java|C\+\+|C#|Go|Rust|Swift|Kotlin|Ruby|PHP|GraphQL|REST|SQL|NoSQL|MongoDB|PostgreSQL|MySQL|Redis|Elasticsearch)\b/gi,
            // Cloud and infrastructure
            /\b(AWS|Amazon\s*Web\s*Services|Azure|Google\s*Cloud|GCP|Docker|Kubernetes|microservices|serverless|DevOps|CI\/CD|Jenkins|GitHub|GitLab|Terraform|Ansible)\b/gi,
            // Emerging technologies
            /\b(blockchain|cryptocurrency|NFTs?|DeFi|Web3|metaverse|virtual\s*reality|VR|augmented\s*reality|AR|quantum\s*computing|edge\s*computing|5G|IoT|Internet\s*of\s*Things)\b/gi,
            // Business technologies
            /\b(CRM|ERP|SaaS|PaaS|IaaS|API|SDK|CDN|SSL|OAuth|JWT|GraphQL|webhook)\b/gi
        ];

        // Enhanced person patterns
        const personPatterns = [
            // Titled names
            /\b(?:Mr\.?|Ms\.?|Mrs\.?|Dr\.?|Prof\.?|CEO|CTO|CFO|VP|Director|Manager|President|Chairman|Founder)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g,
            // Famous tech personalities (context-aware)
            /\b(Elon\s*Musk|Jeff\s*Bezos|Bill\s*Gates|Steve\s*Jobs|Mark\s*Zuckerberg|Tim\s*Cook|Satya\s*Nadella|Sundar\s*Pichai|Jensen\s*Huang|Marc\s*Benioff|Reed\s*Hastings|Daniel\s*Ek|Patrick\s*Collison|John\s*Collison|Drew\s*Houston|Stewart\s*Butterfield|Brian\s*Chesky|Joe\s*Gebbia|Nathan\s*Blecharczyk|Travis\s*Kalanick|Dara\s*Khosrowshahi|Anthony\s*Casalena)\b/gi
        ];

        // Unknown/technical terms that might need explanation
        const unknownTermPatterns = [
            // Capitalized terms that aren't common words (potential product names, concepts)
            /\b([A-Z][a-z]*[A-Z][a-z]*[A-Z]?[a-z]*)\b/g, // CamelCase terms
            // Acronyms (2-6 letters, all caps)
            /\b([A-Z]{2,6})\b/g,
            // Technical jargon indicators
            /\b(\w+(?:ization|isation|ability|ification|ology|ometry|ography|istics))\b/gi
        ];

        // Extract and categorize entities
        this.extractAndCategorizeEntities(allText, companyPatterns, entities, 'company');
        this.extractAndCategorizeEntities(allText, techPatterns, entities, 'technology');
        this.extractAndCategorizeEntities(allText, personPatterns, entities, 'person');
        this.extractAndCategorizeEntities(allText, unknownTermPatterns, entities, 'unknown');

        return entities;
    }

    extractAndCategorizeEntities(text, patterns, entities, category) {
        patterns.forEach(pattern => {
            let match;
            pattern.lastIndex = 0; // Reset regex state
            while ((match = pattern.exec(text)) !== null) {
                const term = (match[1] || match[0]).trim();
                
                // Enhanced filtering
                if (this.isValidEntity(term, category)) {
                    const key = term.toLowerCase();
                    if (!entities.has(key)) {
                        entities.set(key, {
                            term: term,
                            category: category,
                            frequency: 1,
                            contexts: [match.index]
                        });
                    } else {
                        const existing = entities.get(key);
                        existing.frequency++;
                        existing.contexts.push(match.index);
                    }
                }
            }
        });
    }

    isValidEntity(term, category) {
        // Enhanced validation based on category and common sense
        const commonWords = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'have', 'been', 'will', 'would', 'could', 'should', 'when', 'where', 'what', 'why', 'how', 'can', 'may', 'might', 'must', 'shall', 'need', 'want', 'like', 'know', 'think', 'see', 'get', 'make', 'go', 'come', 'take', 'use', 'work', 'way', 'time', 'day', 'year', 'new', 'first', 'last', 'long', 'great', 'little', 'own', 'other', 'old', 'right', 'big', 'high', 'different', 'small', 'large', 'next', 'early', 'young', 'important', 'few', 'public', 'bad', 'same', 'able']);
        
        if (commonWords.has(term.toLowerCase()) || term.length < 2) {
            return false;
        }

        // Category-specific validation
        switch (category) {
            case 'company':
                return term.length >= 2 && !term.match(/^(said|told|called|named|asked|going|doing|using|having|being)$/i);
            case 'technology':
                return term.length >= 2 && !term.match(/^(it|is|to|of|in|on|at|by|up|do|no|so|my|me|we|us|or|if)$/i);
            case 'person':
                return term.length >= 3 && term.includes(' ');
            case 'unknown':
                return term.length >= 3 && !term.match(/^(THE|AND|FOR|WITH|FROM|THIS|THAT|ARE|WAS|HAS|HAD|BUT|NOT|ALL|ANY|CAN|DID|GET|HER|HIM|HIS|HOW|ITS|MAY|NEW|NOW|OLD|OUR|OUT|SEE|TWO|WHO|BOY|DID|GET|HAS|HER|HIM|HIS|HOW|MAN|NEW|NOW|OLD|OUR|OUT|SEE|SHE|TWO|WAY|WHO|YOU|BUT|CAN|DID|FOR|GET|HAS|HER|HIM|HIS|HOW|ITS|MAN|MAY|NEW|NOT|NOW|OLD|ONE|OUR|OUT|SAY|SHE|THE|TOO|TWO|USE|WAS|WAY|WHO|WHY|WIN|YES|YOU|YET)$/i);
            default:
                return true;
        }
    }

    /**
     * Analyze conversation context for real-time information needs and topic focus
     */
    analyzeConversationContext(conversationText) {
        return {
            needsRealTime: /\b(news|recent|latest|current|today|yesterday|this\s*week|price|stock|market|update|announcement|launch|release|trend|happening|breaking)\b/i.test(conversationText),
            businessFocus: /\b(company|business|startup|revenue|funding|investment|market|competition|strategy|growth|scale|IPO|acquisition|merger)\b/i.test(conversationText),
            technicalFocus: /\b(development|programming|architecture|system|platform|infrastructure|framework|library|database|API|integration)\b/i.test(conversationText),
            personalFocus: /\b(founder|CEO|leadership|background|biography|achievement|career|education|experience)\b/i.test(conversationText),
            industryContext: this.detectIndustryContext(conversationText)
        };
    }

    detectIndustryContext(text) {
        const industries = [
            { name: 'fintech', patterns: /\b(finance|banking|payment|cryptocurrency|blockchain|trading|investment|fintech)\b/i },
            { name: 'healthcare', patterns: /\b(health|medical|healthcare|biotech|pharmaceutical|clinical|patient|therapy)\b/i },
            { name: 'ecommerce', patterns: /\b(retail|ecommerce|shopping|marketplace|commerce|store|sales|customer)\b/i },
            { name: 'enterprise', patterns: /\b(enterprise|B2B|SaaS|corporate|business|productivity|collaboration|CRM|ERP)\b/i },
            { name: 'gaming', patterns: /\b(game|gaming|entertainment|mobile|console|streaming|esports)\b/i },
            { name: 'ai', patterns: /\b(AI|artificial|intelligence|machine|learning|neural|automation|robotics)\b/i }
        ];

        return industries.find(industry => industry.patterns.test(text))?.name || 'general';
    }

    /**
     * Prioritize entities based on relevance and context
     */
    prioritizeEntities(entities, contextClues) {
        return Array.from(entities.values())
            .sort((a, b) => {
                // Prioritize by frequency and relevance
                let scoreA = a.frequency * 2;
                let scoreB = b.frequency * 2;

                // Boost based on context relevance
                if (contextClues.businessFocus && a.category === 'company') scoreA += 3;
                if (contextClues.businessFocus && b.category === 'company') scoreB += 3;
                
                if (contextClues.technicalFocus && a.category === 'technology') scoreA += 3;
                if (contextClues.technicalFocus && b.category === 'technology') scoreB += 3;

                if (contextClues.personalFocus && a.category === 'person') scoreA += 3;
                if (contextClues.personalFocus && b.category === 'person') scoreB += 3;

                // Boost unknown terms that might need explanation
                if (a.category === 'unknown' && a.frequency > 1) scoreA += 2;
                if (b.category === 'unknown' && b.frequency > 1) scoreB += 2;

                return scoreB - scoreA;
            });
    }

    /**
     * Generate contextual search suggestion based on entity and conversation context
     */
    generateContextualSuggestion(entity, contextClues) {
        const { term, category } = entity;
        
        // Generate category-specific suggestions with context awareness
        switch (category) {
            case 'company':
                if (contextClues.needsRealTime) {
                    return `🔍 Latest news about ${term}`;
                } else if (contextClues.businessFocus) {
                    return `🔍 ${term} business model and strategy`;
                } else {
                    return `🔍 Look up ${term}`;
                }
                
            case 'technology':
                if (contextClues.technicalFocus) {
                    return `🔍 How to implement ${term}`;
                } else if (contextClues.needsRealTime) {
                    return `🔍 Current trends in ${term}`;
                } else {
                    return `🔍 Explain ${term}`;
                }
                
            case 'person':
                if (contextClues.businessFocus) {
                    return `🔍 ${term} leadership and achievements`;
                } else {
                    return `🔍 Who is ${term}`;
                }
                
            case 'unknown':
                return `🔍 What is ${term}`;
                
            default:
                return `🔍 Research ${term}`;
        }
    }

    /**
     * Triggers analysis when conversation history reaches adequate content (more frequent for better UX).
     */
    async triggerAnalysisIfNeeded() {
        // REVERT TO MORE FREQUENT ANALYSIS: trigger at 3, 5, 7, 9... for faster insights
        const shouldTrigger = this.conversationHistory.length >= 3 && 
                             (this.conversationHistory.length % 2 === 1 || this.conversationHistory.length === 3);
        
        if (shouldTrigger) {
            console.log(`Triggering analysis - ${this.conversationHistory.length} conversation texts accumulated`);

            const data = await this.makeOutlineAndRequests(this.conversationHistory);
            if (data) {
                console.log('Sending structured data to renderer');
                this.sendToRenderer('summary-update', data);
                
                // Notify callback
                if (this.onAnalysisComplete) {
                    this.onAnalysisComplete(data);
                }
            } else {
                console.log('No analysis data returned');
            }
        }
    }

    getCurrentAnalysisData() {
        return {
            previousResult: this.previousAnalysisResult,
            history: this.analysisHistory,
            conversationLength: this.conversationHistory.length,
        };
    }
}

module.exports = SummaryService; 