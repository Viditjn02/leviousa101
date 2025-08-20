/**
 * LLM-based input parsing service
 * Replaces brittle regex patterns with flexible LLM understanding
 */

class LLMInputParser {
    constructor(llmService) {
        this.llmService = llmService;
    }

    /**
     * Extract LinkedIn username/profile identifier using LLM
     * Much more flexible than regex patterns
     */
    async extractLinkedInIdentifier(query) {
        const prompt = `You are a specialized parser for LinkedIn profile queries. Extract ONLY the LinkedIn username, profile ID, or person identifier from the user's query.

RULES:
- Return ONLY the identifier, no explanations
- Handle usernames with numbers, dots, underscores, hyphens
- Handle both full names and usernames
- If multiple identifiers, return the most specific one
- Return null if no clear identifier

EXAMPLES:
Input: "pullup davidbloom5 from linkedin"
Output: davidbloom5

Input: "find john.smith on linkedin" 
Output: john.smith

Input: "get Sarah Wilson's linkedin profile"
Output: Sarah Wilson

Input: "linkedin profile for mike-tech_lead"
Output: mike-tech_lead

Input: "show me linkedin stuff"
Output: null

Query: "${query}"
Identifier:`;

        try {
            const result = await this.llmService.generateText(prompt, {
                maxTokens: 50,
                temperature: 0.1, // Very low for consistent parsing
                timeout: 3000
            });
            
            const extracted = result.trim();
            
            // Basic sanity check
            if (!extracted || extracted.toLowerCase() === 'null' || extracted.length > 100) {
                return null;
            }
            
            console.log(`[LLMInputParser] ✅ Extracted LinkedIn identifier: "${extracted}"`);
            return extracted;
            
        } catch (error) {
            console.error('[LLMInputParser] ❌ Failed to extract LinkedIn identifier:', error);
            // Fallback to simple regex as backup
            return this.fallbackRegexExtraction(query);
        }
    }

    /**
     * Simple fallback regex (much simpler than current complex patterns)
     */
    fallbackRegexExtraction(query) {
        // Just one simple pattern as fallback
        const match = query.match(/(?:pullup|find|get|linkedin)\s+([a-zA-Z0-9._-]+)/i);
        return match ? match[1] : null;
    }

    /**
     * Parse email context using LLM
     */
    async extractEmailContext(query) {
        const prompt = `Extract email context from this query. Return JSON with recipient, subject, and content.

Query: "${query}"
Context:`;

        try {
            const result = await this.llmService.generateText(prompt, {
                maxTokens: 200,
                temperature: 0.2
            });
            
            return JSON.parse(result);
        } catch (error) {
            console.error('[LLMInputParser] Failed to parse email context:', error);
            return null;
        }
    }

    /**
     * Determine intent from natural language query
     */
    async classifyIntent(query) {
        const prompt = `Classify this query into one category: linkedin_profile, linkedin_post, linkedin_search, email_compose, calendar_event, file_search, web_search, or general.

Query: "${query}"
Category:`;

        try {
            const result = await this.llmService.generateText(prompt, {
                maxTokens: 20,
                temperature: 0.1
            });
            
            return result.trim().toLowerCase();
        } catch (error) {
            return 'general';
        }
    }
}

module.exports = LLMInputParser;
