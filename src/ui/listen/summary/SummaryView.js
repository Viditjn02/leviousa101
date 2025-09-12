import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

import '../../ask/MCPActionBar.js';

export class SummaryView extends LitElement {
    static styles = css`
        :host {
            display: block;
            width: 100%;
        }

        /* Inherit font styles from parent */

        /* highlight.js 스타일 추가 */
        .insights-container pre {
            background: rgba(0, 0, 0, 0.4) !important;
            border-radius: 8px !important;
            padding: 12px !important;
            margin: 8px 0 !important;
            overflow-x: auto !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            white-space: pre !important;
            word-wrap: normal !important;
            word-break: normal !important;
        }

        .insights-container code {
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace !important;
            font-size: 11px !important;
            background: transparent !important;
            white-space: pre !important;
            word-wrap: normal !important;
            word-break: normal !important;
        }

        .insights-container pre code {
            white-space: pre !important;
            word-wrap: normal !important;
            word-break: normal !important;
            display: block !important;
        }

        .insights-container p code {
            background: rgba(255, 255, 255, 0.1) !important;
            padding: 2px 4px !important;
            border-radius: 3px !important;
            color: #ffd700 !important;
        }

        .hljs-keyword {
            color: #ff79c6 !important;
        }
        .hljs-string {
            color: #f1fa8c !important;
        }
        .hljs-comment {
            color: #6272a4 !important;
        }
        .hljs-number {
            color: #bd93f9 !important;
        }
        .hljs-function {
            color: #50fa7b !important;
        }
        .hljs-variable {
            color: #8be9fd !important;
        }
        .hljs-built_in {
            color: #ffb86c !important;
        }
        .hljs-title {
            color: #50fa7b !important;
        }
        .hljs-attr {
            color: #50fa7b !important;
        }
        .hljs-tag {
            color: #ff79c6 !important;
        }

        .insights-container {
            overflow-y: auto;
            padding: 12px 16px 16px 16px;
            position: relative;
            z-index: 1;
            min-height: 150px;
            max-height: 600px;
            flex: 1;
        }

        /* Visibility handled by parent component */

        .insights-container::-webkit-scrollbar {
            width: 8px;
        }
        .insights-container::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
            border-radius: 4px;
        }
        .insights-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
        }
        .insights-container::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.5);
        }

        insights-title {
            color: rgba(255, 255, 255, 0.8);
            font-size: 15px;
            font-weight: 500;
            font-family: 'Helvetica Neue', sans-serif;
            margin: 12px 0 8px 0;
            display: block;
        }

        .insights-container h4 {
            color: #ffffff;
            font-size: 12px;
            font-weight: 600;
            margin: 12px 0 8px 0;
            padding: 4px 8px;
            border-radius: 4px;
            background: transparent;
            cursor: default;
        }

        .insights-container h4:hover {
            background: transparent;
        }

        .insights-container h4:first-child {
            margin-top: 0;
        }

        .outline-item {
            color: #ffffff;
            font-size: 11px;
            line-height: 1.4;
            margin: 4px 0;
            padding: 6px 8px;
            border-radius: 4px;
            background: transparent;
            transition: background-color 0.15s ease;
            cursor: pointer;
            word-wrap: break-word;
        }

        .outline-item:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .request-item {
            color: #ffffff;
            font-size: 12px;
            line-height: 1.2;
            margin: 4px 0;
            padding: 6px 8px;
            border-radius: 4px;
            background: transparent;
            cursor: default;
            word-wrap: break-word;
            transition: background-color 0.15s ease;
        }

        .request-item.clickable {
            cursor: pointer;
            transition: all 0.15s ease;
        }
        .request-item.clickable:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateX(2px);
        }

        .search-suggestion {
            background: rgba(33, 150, 243, 0.1);
            border-left: 3px solid rgba(33, 150, 243, 0.5);
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .search-suggestion:hover {
            background: rgba(33, 150, 243, 0.2);
            border-left-color: rgba(33, 150, 243, 0.8);
            transform: translateX(3px);
        }

        /* 마크다운 렌더링된 콘텐츠 스타일 */
        .markdown-content {
            color: #ffffff;
            font-size: 11px;
            line-height: 1.4;
            margin: 4px 0;
            padding: 6px 8px;
            border-radius: 4px;
            background: transparent;
            cursor: pointer;
            word-wrap: break-word;
            transition: all 0.15s ease;
        }

        .markdown-content:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateX(2px);
        }

        .markdown-content p {
            margin: 4px 0;
        }

        .markdown-content ul,
        .markdown-content ol {
            margin: 4px 0;
            padding-left: 16px;
        }

        .markdown-content li {
            margin: 2px 0;
        }

        .markdown-content a {
            color: #8be9fd;
            text-decoration: none;
        }

        .markdown-content a:hover {
            text-decoration: underline;
        }

        .markdown-content strong {
            font-weight: 600;
            color: #f8f8f2;
        }

        .markdown-content em {
            font-style: italic;
            color: #f1fa8c;
        }

        .empty-state {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100px;
            color: rgba(255, 255, 255, 0.6);
            font-size: 12px;
            font-style: italic;
        }

        /* Email Form Styles */
        .email-form {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 12px 16px;
            background: rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            margin-top: 8px;
            transition: opacity 0.1s ease-in-out, transform 0.1s ease-in-out;
        }

        .email-form.hidden {
            opacity: 0;
            transform: scaleY(0);
            padding: 0;
            height: 0;
            overflow: hidden;
            border: none;
            margin: 0;
        }

        .email-form-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(0, 0, 0, 0.2);
            margin: -12px -16px 8px -16px;
            border-radius: 8px 8px 0 0;
        }
        
        .email-form-title {
            font-size: 14px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
        }
        
        .email-close-btn {
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.7);
            cursor: pointer;
            padding: 4px;
            border-radius: 3px;
            transition: background 0.15s;
        }

        .email-close-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.9);
        }

        .email-field {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .email-field label {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.7);
            flex-shrink: 0;
            width: 50px;
        }

        .email-field input,
        .email-field textarea {
            flex: 1;
            padding: 8px 12px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
            outline: none;
            border: none;
            color: white;
            font-size: 14px;
            font-family: 'Helvetica Neue', sans-serif;
            font-weight: 400;
        }

        .email-field input::placeholder,
        .email-field textarea::placeholder {
            color: rgba(255, 255, 255, 0.5);
        }

        .email-field input:focus,
        .email-field textarea:focus {
            outline: none;
        }

        .email-send-btn {
            align-self: flex-end;
            width: 120px;
            padding: 8px 12px;
            font-size: 13px;
            font-weight: 500;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            color: white;
            cursor: pointer;
            transition: background 0.15s;
        }

        .email-send-btn:hover {
            background: rgba(255, 255, 255, 0.2);
        }
    `;

    static properties = {
        structuredData: { type: Object },
        isVisible: { type: Boolean },
        hasCompletedRecording: { type: Boolean },
        // Email composer form state
        showEmailForm: { type: Boolean, reflect: true },
        emailData: { type: Object }
    };

    constructor() {
        super();
        this.structuredData = {
            summary: [],
            topic: { header: '', bullets: [] },
            actions: [],
            followUps: [],
        };
        this.isVisible = true;
        this.hasCompletedRecording = false;
        this.showEmailForm = false;
        this.emailData = { to: '', subject: '', body: '', cc: '', bcc: '' };

        // 마크다운 라이브러리 초기화
        this.marked = null;
        this.hljs = null;
        this.isLibrariesLoaded = false;
        this.DOMPurify = null;
        this.isDOMPurifyLoaded = false;

        this.loadLibraries();
    }

    connectedCallback() {
        super.connectedCallback();
        if (window.api) {
            window.api.summaryView.onSummaryUpdate((event, data) => {
                this.structuredData = data;
                this.requestUpdate();
            });
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (window.api) {
            window.api.summaryView.removeAllSummaryUpdateListeners();
        }
    }

    // Handle session reset from parent
    resetAnalysis() {
        this.structuredData = {
            summary: [],
            topic: { header: '', bullets: [] },
            actions: [],
            followUps: [],
        };
        this.requestUpdate();
    }

    async loadLibraries() {
        try {
            if (!window.marked) {
                await this.loadScript('../../../assets/marked-4.3.0.min.js');
            }

            if (!window.hljs) {
                await this.loadScript('../../../assets/highlight-11.9.0.min.js');
            }

            if (!window.DOMPurify) {
                await this.loadScript('../../../assets/dompurify-3.0.7.min.js');
            }

            this.marked = window.marked;
            this.hljs = window.hljs;
            this.DOMPurify = window.DOMPurify;

            if (this.marked && this.hljs) {
                this.marked.setOptions({
                    highlight: (code, lang) => {
                        if (lang && this.hljs.getLanguage(lang)) {
                            try {
                                return this.hljs.highlight(code, { language: lang }).value;
                            } catch (err) {
                                console.warn('Highlight error:', err);
                            }
                        }
                        try {
                            return this.hljs.highlightAuto(code).value;
                        } catch (err) {
                            console.warn('Auto highlight error:', err);
                        }
                        return code;
                    },
                    breaks: true,
                    gfm: true,
                    pedantic: false,
                    smartypants: false,
                    xhtml: false,
                });

                this.isLibrariesLoaded = true;
                console.log('Markdown libraries loaded successfully');
            }

            if (this.DOMPurify) {
                this.isDOMPurifyLoaded = true;
                console.log('DOMPurify loaded successfully in SummaryView');
            }
        } catch (error) {
            console.error('Failed to load libraries:', error);
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    parseMarkdown(text) {
        if (!text) return '';

        if (!this.isLibrariesLoaded || !this.marked) {
            return text;
        }

        try {
            return this.marked(text);
        } catch (error) {
            console.error('Markdown parsing error:', error);
            return text;
        }
    }

    handleMarkdownClick(originalText) {
        this.handleRequestClick(originalText);
    }

    async handleMCPAction(event) {
        const { action } = event.detail;
        console.log('[SummaryView] MCP action triggered:', action);

        // Check if this is an email action that should show the composer
        const isEmailAction = action.type === 'email.send' || 
                             action.label?.includes('Email') || 
                             action.label?.includes('email') ||
                             action.id?.includes('email') ||
                             (typeof action === 'string' && action.includes('email')) ||
                             (action.text && action.text.includes('email'));
                             
        if (isEmailAction) {
            console.log('[SummaryView] 📧 Email action detected, showing composer...');
            
            // Pre-populate email data from action context
            this.emailData = {
                to: action.context?.recipients || '',
                subject: action.context?.subject || `Meeting Summary: ${this.structuredData?.topic?.header || 'Summary'}`,
                body: action.context?.body || this.generateEmailContent(),
                cc: action.context?.cc || '',
                bcc: action.context?.bcc || ''
            };
            
            this.showEmailForm = true;
            this.requestUpdate();
            return;
        }

        // Check if this is a calendar action
        const isCalendarAction = action.type === 'calendar.book' || 
                                action.label?.includes('Calendar') || 
                                action.label?.includes('calendar') ||
                                action.id?.includes('calendar') ||
                                (typeof action === 'string' && action.includes('Calendar')) ||
                                (typeof action === 'string' && action.includes('📅')) ||
                                (action.text && action.text.includes('Calendar'));

        // Check if this is a Notion action
        const isNotionAction = action.type === 'notion.save' || 
                              action.label?.includes('Notion') || 
                              action.label?.includes('notion') ||
                              action.id?.includes('notion') ||
                              (typeof action === 'string' && action.includes('Notion')) ||
                              (typeof action === 'string' && action.includes('📝')) ||
                              (action.text && action.text.includes('Notion'));
                                
        if (isCalendarAction) {
            console.log('[SummaryView] 📅 Calendar action detected, booking with conversation context...');
            
            try {
                // Use existing structured conversation data
                const data = this.structuredData || {};
                let conversationContext = '';
                
                // Build context from existing summary data
                if (data.topic?.header) {
                    conversationContext += `Topic: ${data.topic.header}. `;
                }
                
                if (data.summary && data.summary.length > 0) {
                    conversationContext += `Key points: ${data.summary.slice(0, 3).join(', ')}. `;
                }
                
                if (data.topic?.bullets && data.topic.bullets.length > 0) {
                    conversationContext += `Details: ${data.topic.bullets.slice(0, 2).join(', ')}. `;
                }
                
                // Create detailed calendar booking prompt with conversation context
                const calendarPrompt = `Please book a calendar meeting based on our conversation. 

CONVERSATION CONTEXT:
${conversationContext}

FULL CONVERSATION SUMMARY:
Topic: ${data.topic?.header || 'Meeting discussion'}
Key Points: ${data.summary?.join(', ') || 'Discussion points'}
Details: ${data.topic?.bullets?.join(', ') || 'Meeting details'}

INSTRUCTIONS:
- If specific date, time, or attendees were mentioned in the conversation, use those details
- If no specific date/time provided, suggest a follow-up meeting for next week
- If no attendees mentioned, create a general follow-up meeting
- Include the conversation topic in the meeting title
- Add key discussion points in the meeting description`;
                
                console.log('[SummaryView] 📅 Sending calendar booking request with existing summary context');
                
                // Send to ask service to handle calendar booking (reuse existing LLM + MCP flow)
                const result = await window.api.askService.processMessage(calendarPrompt);
                
                if (result.success) {
                    console.log('[SummaryView] ✅ Calendar event booked successfully');
                } else {
                    console.error('[SummaryView] ❌ Calendar booking failed:', result.error);
                }
            } catch (error) {
                console.error('[SummaryView] ❌ Calendar action failed:', error);
            }
            
            return;
        }

        if (isNotionAction) {
            console.log('[SummaryView] 📝 Notion action detected, saving conversation to Notion...');
            
            try {
                // Use existing structured conversation data
                const data = this.structuredData || {};
                
                // Create specific page title from actual conversation content
                const actualTopic = data.topic?.header ? 
                    data.topic.header.replace(/[:\-\s]+$/, '') : // Remove trailing colons/dashes
                    (data.summary?.[0] || 'Discussion'); // Use first summary point if no topic
                    
                const pageTitle = `Leviousa - ${actualTopic} - ${new Date().toLocaleDateString()}`;
                
                let pageContent = `# Meeting Summary\n\n`;
                
                // Add topic
                if (data.topic?.header) {
                    pageContent += `**Topic:** ${data.topic.header}\n\n`;
                }
                
                // Add key points
                if (data.summary && data.summary.length > 0) {
                    pageContent += `## Key Points\n`;
                    data.summary.forEach(point => {
                        pageContent += `• ${point}\n`;
                    });
                    pageContent += `\n`;
                }
                
                // Add details
                if (data.topic?.bullets && data.topic.bullets.length > 0) {
                    pageContent += `## Discussion Details\n`;
                    data.topic.bullets.forEach(bullet => {
                        pageContent += `• ${bullet}\n`;
                    });
                    pageContent += `\n`;
                }
                
                // Add actions if any
                if (data.actions && data.actions.length > 0) {
                    pageContent += `## Next Steps\n`;
                    data.actions.forEach(action => {
                        pageContent += `• ${action}\n`;
                    });
                    pageContent += `\n`;
                }
                
                pageContent += `\n---\n*Generated by Leviousa AI on ${new Date().toLocaleString()}*`;
                
                // Create Notion page request that will use hierarchical organization
                const notionPrompt = `Save this meeting summary to Notion: Title "${pageTitle}" with content: ${pageContent}`;
                
                console.log('[SummaryView] 📝 Sending Notion page creation request with structured content');
                
                // Send to ask service to handle Notion page creation (reuse existing LLM + MCP flow)
                const result = await window.api.askService.processMessage(notionPrompt);
                
                if (result.success) {
                    console.log('[SummaryView] ✅ Notion page created successfully');
                } else {
                    console.error('[SummaryView] ❌ Notion page creation failed:', result.error);
                }
            } catch (error) {
                console.error('[SummaryView] ❌ Notion action failed:', error);
            }
            
            return;
        }

        if (!window.api?.mcp?.ui) {
            console.error('[SummaryView] MCP UI API not available');
            return;
        }

        try {
            // Execute the action through MCP UI Integration
            const result = await window.api.mcp.ui.executeAction(action.id, {
                ...action.metadata,
                summary: this.getSummaryText(),
                structuredData: this.structuredData,
                title: this.structuredData?.topic?.header || 'Meeting Summary'
            });

            if (result.success) {
                console.log('[SummaryView] MCP action executed successfully:', result);
                
                // Handle UI resource if returned
                if (result.result?.resourceId) {
                    console.log('[SummaryView] UI resource created:', result.result.resourceId);
                }
            } else {
                console.error('[SummaryView] MCP action failed:', result.error);
            }
        } catch (error) {
            console.error('[SummaryView] Error executing MCP action:', error);
        }
    }

    generateEmailContent() {
        const data = this.structuredData;
        let content = `Hi,\n\nHere's a summary of our meeting:\n\n`;
        
        let hasContent = false;
        
        // Add summary if available
        if (data?.summary && data.summary.length > 0) {
            content += `**Key Points:**\n`;
            data.summary.slice(0, 5).forEach(point => {
                content += `• ${point}\n`;
            });
            content += `\n`;
            hasContent = true;
        }
        
        // Add topic insights if available
        if (data?.topic && data.topic.bullets && data.topic.bullets.length > 0) {
            content += `**${data.topic.header || 'Discussion Details'}:**\n`;
            data.topic.bullets.forEach(bullet => {
                content += `• ${bullet}\n`;
            });
            content += `\n`;
            hasContent = true;
        }

        // CRITICAL FIX: If no structured data available, generate from conversation context
        if (!hasContent) {
            // Try to get conversation context from global listen service if available
            try {
                if (window.api?.listen?.getCurrentSessionData) {
                    const sessionData = window.api.listen.getCurrentSessionData();
                    if (sessionData?.conversationHistory && sessionData.conversationHistory.length > 0) {
                        content += `**Discussion Summary:**\n`;
                        const recentTurns = sessionData.conversationHistory.slice(-6); // Last 6 turns
                        recentTurns.forEach((turn, index) => {
                            if (turn && turn.trim()) {
                                content += `• ${turn.trim()}\n`;
                            }
                        });
                        content += `\n`;
                        hasContent = true;
                    }
                }
            } catch (error) {
                console.warn('Could not get session data for email:', error.message);
            }
        }

        // If still no content, provide a basic template but with context indication
        if (!hasContent) {
            content += `We had a productive discussion. Key points and next steps were covered.\n\n`;
        }
        
        content += `Looking forward to our continued collaboration.\n\nBest regards`;
        return content;
    }

    /**
     * Generate email content specifically from the analyzed conversation
     */
    generateConversationEmailContent() {
        const data = this.structuredData;
        let content = `Hi,\n\nI wanted to share a summary of our conversation:\n\n`;
        
        // Add the actual analyzed summary
        if (data?.summary && data.summary.length > 0) {
            content += `**Key Discussion Points:**\n`;
            data.summary.forEach(point => {
                content += `• ${point}\n`;
            });
            content += `\n`;
        }
        
        // Add topic insights from our conversation
        if (data?.topic && data.topic.header && data.topic.bullets.length > 0) {
            content += `**${data.topic.header}**\n`;
            data.topic.bullets.forEach(bullet => {
                content += `• ${bullet}\n`;
            });
            content += `\n`;
        }
        
        // Add next steps based on analysis
        if (data?.actions && data.actions.length > 1) { // Skip the default "What should I say next"
            const actionableItems = data.actions.filter(a => 
                !a.includes('What should I say next') && 
                !a.includes('email') && 
                !a.includes('✉️')
            );
            if (actionableItems.length > 0) {
                content += `**Follow-up thoughts from our discussion:**\n`;
                actionableItems.forEach(action => {
                    const cleanAction = action.replace('❓ ', '').replace('?', '');
                    content += `• ${cleanAction}\n`;
                });
                content += `\n`;
            }
        }
        
        content += `Thanks for the great conversation!\n\nBest regards`;
        
        console.log('[SummaryView] 📧 Generated conversation-specific email content:', content.substring(0, 150) + '...');
        return content;
    }

    /** Send the email via MCP tool */
    async handleEmailSend() {
        const { to, subject, body, cc = '', bcc = '' } = this.emailData;
        if (!to || !subject || !body) {
            alert('Please fill in To, Subject, and Body fields');
            return;
        }
        
        try {
            console.log('[SummaryView] Attempting to send email via Paragon MCP...');
            
            // Use the Microsoft Graph API format like the working MCPUIIntegrationService
            const toAddresses = Array.isArray(to) ? to : [to];
            const ccAddresses = cc ? (Array.isArray(cc) ? cc : [cc]) : [];
            const bccAddresses = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : [];
            
            const toolParams = {
                toRecipients: toAddresses.map(addr => ({ emailAddress: { address: addr } })),
                messageContent: {
                    subject: subject,
                    body: {
                        content: body,
                        contentType: 'text'
                    }
                }
            };
            
            // Add CC and BCC if present (using Microsoft Graph format)
            if (ccAddresses.length > 0) {
                toolParams.ccRecipients = ccAddresses.map(addr => ({ emailAddress: { address: addr } }));
            }
            if (bccAddresses.length > 0) {
                toolParams.bccRecipients = bccAddresses.map(addr => ({ emailAddress: { address: addr } }));
            }

            const actionData = {
                serverId: 'paragon',
                tool: 'GMAIL_SEND_EMAIL',
                params: toolParams
            };

            // Get authenticated user ID and add to toolParams
            try {
                const userState = await window.api.common.getCurrentUser();
                if (userState && userState.uid) {
                    actionData.params.user_id = userState.uid;
                } else {
                    console.warn('[SummaryView] No authenticated user found - using fallback default-user');
                    actionData.params.user_id = 'default-user';
                }
            } catch (uidErr) {
                console.warn('[SummaryView] Failed to fetch current user for user_id:', uidErr);
                actionData.params.user_id = 'default-user';
            }

            console.log('[SummaryView] 📧 Final actionData being sent to MCP API:', JSON.stringify(actionData, null, 2));

            const result = await window.api.mcp.callTool(actionData.serverId, actionData.tool, actionData.params);
            
            if (result && result.success !== false) {
                console.log('[SummaryView] ✅ Email sent successfully:', result);
                alert('✅ Email sent successfully!');
                this.closeEmailForm();
            } else {
                console.error('[SummaryView] ❌ Email send failed:', result);
                alert(`❌ Failed to send email: ${result?.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('[SummaryView] Error sending email:', error);
            alert(`❌ Error sending email: ${error.message}`);
        }
    }

    closeEmailForm() {
        this.showEmailForm = false;
        this.emailData = { to: '', subject: '', body: '', cc: '', bcc: '' };
        this.requestUpdate();
    }

    renderMarkdownContent() {
        if (!this.isLibrariesLoaded || !this.marked) {
            return;
        }

        const markdownElements = this.shadowRoot.querySelectorAll('[data-markdown-id]');
        markdownElements.forEach(element => {
            const originalText = element.getAttribute('data-original-text');
            if (originalText) {
                try {
                    let parsedHTML = this.parseMarkdown(originalText);

                    if (this.isDOMPurifyLoaded && this.DOMPurify) {
                        parsedHTML = this.DOMPurify.sanitize(parsedHTML);

                        if (this.DOMPurify.removed && this.DOMPurify.removed.length > 0) {
                            console.warn('Unsafe content detected in insights, showing plain text');
                            element.textContent = '⚠️ ' + originalText;
                            return;
                        }
                    }

                    element.innerHTML = parsedHTML;
                } catch (error) {
                    console.error('Error rendering markdown for element:', error);
                    element.textContent = originalText;
                }
            }
        });
    }

    async handleRequestClick(requestText) {
        console.log('🔥 Analysis request clicked:', requestText);

        // CRITICAL FIX: Check if this is an email action that should show the composer
        if (requestText && (requestText.includes('email') || requestText.includes('✉️') || requestText.includes('Email') || requestText.includes('summary'))) {
            console.log('[SummaryView] 📧 Email action detected - showing LISTEN MODE email composer with conversation content...');
            
            // Generate conversation-specific email content
            const emailBody = this.generateConversationEmailContent();
            
            this.emailData = {
                to: '',
                subject: `Conversation Summary: ${this.structuredData?.topic?.header?.replace(':', '') || 'Discussion'}`,
                body: emailBody,
                cc: '',
                bcc: ''
            };
            
            this.showEmailForm = true;
            this.requestUpdate();
            
            console.log('[SummaryView] 📧 Email composer opened with ACTUAL conversation content');
            console.log('[SummaryView] 📧 Email body preview:', this.emailData.body.substring(0, 200) + '...');
            return;
        }

        if (window.api) {
            try {
                const result = await window.api.summaryView.sendQuestionFromSummary(requestText);

                if (result.success) {
                    console.log('✅ Question sent to AskView successfully');
                } else {
                    console.error('❌ Failed to send question to AskView:', result.error);
                }
            } catch (error) {
                console.error('❌ Error in handleRequestClick:', error);
            }
        }
    }

    async handleSearchClick(searchText) {
        console.log('🔍 Search suggestion clicked:', searchText);
        
        try {
            // Extract the search term from the suggestion text
            const searchMatch = searchText.match(/🔍\s+(?:Look up|Search for|Research)\s+(.+?)(?:\s+(?:on web|info))?$/);
            const searchTerm = searchMatch ? searchMatch[1] : searchText.replace(/🔍\s+/, '');
            
            // Create intelligent search query with conversation context
            const conversationContext = this.getSummaryText();
            const contextualQuery = this.buildContextualSearchQuery(searchTerm, conversationContext);
            
            // Send to Ask service instead of opening browser
            if (window.api?.summaryView?.sendQuestionFromSummary) {
                const result = await window.api.summaryView.sendQuestionFromSummary(contextualQuery);
                
                if (result.success) {
                    console.log('✅ Search query sent to AskView:', contextualQuery);
                    // Show Ask window to display results
                    if (window.api?.ask?.toggleAskButton) {
                        await window.api.ask.toggleAskButton();
                    }
                } else {
                    console.error('❌ Failed to send search query to AskView:', result.error);
                    // Fallback to basic request click
                    await this.handleRequestClick(`Tell me about ${searchTerm}`);
                }
            } else {
                console.warn('⚠️ AskView API not available, using fallback');
                // Fallback to request click
                await this.handleRequestClick(`Tell me about ${searchTerm}`);
            }
        } catch (error) {
            console.error('❌ Error in handleSearchClick:', error);
            // Fallback: try basic question
            try {
                await this.handleRequestClick(`What is ${searchText.replace(/🔍\s+/, '')}?`);
            } catch (fallbackError) {
                console.error('❌ Fallback also failed:', fallbackError);
            }
        }
    }

    /**
     * Build contextual search query that includes conversation context for better LLM responses
     */
    buildContextualSearchQuery(searchTerm, conversationContext) {
        // Determine query type based on patterns
        const isCompany = /\b(Inc|Corp|LLC|Ltd|Co|Company|Technologies|Tech|Systems|Solutions|Labs|AI|Software|Services)\b/i.test(searchTerm);
        const isTechnology = /\b(AI|ML|API|SaaS|React|Python|JavaScript|Node|GraphQL|REST|PostgreSQL|MongoDB|Redis|AWS|Azure|GCP|blockchain|cryptocurrency|DevOps|microservices|kubernetes|docker)\b/i.test(searchTerm);
        const isPerson = /^(Mr\.|Ms\.|Dr\.)?\s*[A-Z][a-z]+\s+[A-Z][a-z]+/.test(searchTerm);
        
        // Create context-aware query
        let baseQuery = '';
        
        if (isCompany) {
            baseQuery = `Tell me about the company ${searchTerm}. What do they do, who founded them, recent news, and how they might relate to our discussion`;
        } else if (isTechnology) {
            baseQuery = `Explain ${searchTerm} in the context of technology. What is it, how does it work, current trends, and why it might be relevant to our conversation`;
        } else if (isPerson) {
            baseQuery = `Who is ${searchTerm}? Provide background, notable achievements, and why they might be mentioned in a business context`;
        } else {
            // Check if it needs real-time information
            const needsRealTime = /\b(news|recent|latest|current|today|price|stock|update|announcement)\b/i.test(conversationContext);
            if (needsRealTime) {
                baseQuery = `Use web search to find the latest information about ${searchTerm}. Focus on recent news, updates, or current status`;
            } else {
                baseQuery = `Provide comprehensive information about ${searchTerm}`;
            }
        }
        
        // Add conversation context for better relevance
        if (conversationContext && conversationContext.length > 50) {
            const contextSummary = conversationContext.length > 500 
                ? conversationContext.substring(0, 500) + '...'
                : conversationContext;
            
            baseQuery += `\n\nContext from our conversation:\n${contextSummary}\n\nPlease relate your answer to the topics we've been discussing.`;
        }
        
        return baseQuery;
    }

    getSummaryText() {
        const data = this.structuredData || { summary: [], topic: { header: '', bullets: [] }, actions: [] };
        let sections = [];

        if (data.summary && data.summary.length > 0) {
            sections.push(`Current Summary:\n${data.summary.map(s => `• ${s}`).join('\n')}`);
        }

        if (data.topic && data.topic.header && data.topic.bullets.length > 0) {
            sections.push(`\n${data.topic.header}:\n${data.topic.bullets.map(b => `• ${b}`).join('\n')}`);
        }

        if (data.actions && data.actions.length > 0) {
            sections.push(`\nActions:\n${data.actions.map(a => `▸ ${a}`).join('\n')}`);
        }

        if (data.followUps && data.followUps.length > 0) {
            sections.push(`\nFollow-Ups:\n${data.followUps.map(f => `▸ ${f}`).join('\n')}`);
        }

        return sections.join('\n\n').trim();
    }

    updated(changedProperties) {
        super.updated(changedProperties);
        this.renderMarkdownContent();
    }

    render() {
        if (!this.isVisible) {
            return html`<div style="display: none;"></div>`;
        }

        const data = this.structuredData || {
            summary: [],
            topic: { header: '', bullets: [] },
            actions: [],
            followUps: []
        };
        
        // CRITICAL FIX: Move email to actions array for conversation-specific email composer
        if (!data.actions || data.actions.length === 0) {
            data.actions = ['✨ What should I say next?'];
        }
        
        // FORCE email action into actions array (conversation-specific) when recording completed
        if (this.hasCompletedRecording) {
            // Remove any existing email actions from actions first
            data.actions = data.actions.filter(a => 
                !a.includes('email') && !a.includes('✉️') && !a.includes('Email')
            );
            // Add email action at the TOP of actions array for conversation-specific email
            data.actions.unshift('✉️ Send conversation summary');
            
            console.log('[SummaryView] 📧 FORCED email action into actions array for conversation-specific composer');
        }
        
        // Remove email from followUps completely - use actions array instead
        if (data.followUps && data.followUps.length > 0) {
            data.followUps = data.followUps.filter(f => 
                !f.includes('email') && !f.includes('✉️') && !f.includes('Email')
            );
        }
        
        // Keep followUps for MCP actions only (calendar, notion, etc.)
        if (this.hasCompletedRecording) {
            if (!data.followUps || data.followUps.length === 0) {
                data.followUps = ['📅 Book Calendar', '📝 Save to Notion'];
            }
        }

        const hasAnyContent = data.summary.length > 0 || data.topic.bullets.length > 0 || data.actions.length > 0;

        return html`
            <div class="insights-container">
                ${!hasAnyContent
                    ? html`<div class="empty-state">No insights yet...</div>`
                    : html`
                        <insights-title>Current Summary</insights-title>
                        ${data.summary.length > 0
                            ? data.summary
                                  .slice(0, 5)
                                  .map(
                                      (bullet, index) => html`
                                          <div
                                              class="markdown-content"
                                              data-markdown-id="summary-${index}"
                                              data-original-text="${bullet}"
                                              @click=${() => this.handleMarkdownClick(bullet)}
                                          >
                                              ${bullet}
                                          </div>
                                      `
                                  )
                            : html` <div class="request-item">No content yet...</div> `}
                        ${data.topic.header
                            ? html`
                                  <insights-title>${data.topic.header}</insights-title>
                                  ${data.topic.bullets
                                      .slice(0, 3)
                                      .map(
                                          (bullet, index) => html`
                                              <div
                                                  class="markdown-content"
                                                  data-markdown-id="topic-${index}"
                                                  data-original-text="${bullet}"
                                                  @click=${() => this.handleMarkdownClick(bullet)}
                                              >
                                                  ${bullet}
                                              </div>
                                          `
                                      )}
                              `
                            : ''}
                        ${data.actions.length > 0
                            ? html`
                                  <insights-title>What should I say next?</insights-title>
                                  ${data.actions.map((action, index) => 
                                      html`<div class="request-item" @click=${() => this.handleRequestClick(action)}>${action}</div>`
                                  )}
                              `
                            : ''}
                        ${data.searchSuggestions && data.searchSuggestions.length > 0
                            ? html`
                                  <insights-title>Search</insights-title>
                                  ${data.searchSuggestions.map((suggestion, index) => 
                                      html`<div class="request-item search-suggestion" @click=${() => this.handleSearchClick(suggestion)}>${suggestion}</div>`
                                  )}
                              `
                            : ''}
                        ${this.hasCompletedRecording && data.followUps && data.followUps.length > 0
                            ? html`
                                  <insights-title>Actions</insights-title>
                                  <mcp-action-bar
                                      .context=${{
                                          type: 'listen-complete',
                                          summary: this.getSummaryText(),
                                          structuredData: this.structuredData,
                                          sessionType: 'listen',
                                          message: 'Meeting completed',
                                          response: this.getSummaryText(),
                                          actions: [],
                                          followUps: data.followUps || []
                                      }}
                                      @mcp-action=${this.handleMCPAction}
                                  ></mcp-action-bar>
                              `
                            : ''}
                    `}

                <!-- Email Composer Form -->
                ${this.showEmailForm ? html`
                    <div class="email-form">
                        <div class="email-form-header">
                            <span class="email-form-title">📧 Email Composer</span>
                            <button class="email-close-btn" @click=${this.closeEmailForm}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div class="email-field">
                            <label for="emailTo">To:</label>
                            <input type="text" id="emailTo" .value=${this.emailData.to} @input=${e => this.emailData.to = e.target.value} placeholder="Recipient email(s)" />
                        </div>
                        <div class="email-field">
                            <label for="emailCc">CC:</label>
                            <input type="text" id="emailCc" .value=${this.emailData.cc || ''} @input=${e => this.emailData.cc = e.target.value} placeholder="CC" />
                        </div>
                        <div class="email-field">
                            <label for="emailSubject">Subject:</label>
                            <input type="text" id="emailSubject" .value=${this.emailData.subject} @input=${e => this.emailData.subject = e.target.value} placeholder="Subject" />
                        </div>
                        <div class="email-field">
                            <label for="emailBody">Body:</label>
                            <textarea id="emailBody" rows="6" .value=${this.emailData.body} @input=${e => this.emailData.body = e.target.value} placeholder="Email content..."></textarea>
                        </div>
                        <button class="email-send-btn" @click=${this.handleEmailSend}>
                            📤 Send Email
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }
}

customElements.define('summary-view', SummaryView); 