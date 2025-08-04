import { html, css, LitElement } from '../../ui/assets/lit-core-2.7.4.min.js';
import { parser, parser_write, parser_end, default_renderer } from '../../ui/assets/smd.js';
import './MCPActionBar.js';
// Remove any old mcp-ui-integration imports

export class AskView extends LitElement {
    static properties = {
        currentResponse: { type: String },
        currentQuestion: { type: String },
        isLoading: { type: Boolean },
        copyState: { type: String },
        isHovering: { type: Boolean },
        hoveredLineIndex: { type: Number },
        lineCopyState: { type: Object },
        showTextInput: { type: Boolean },
        headerText: { type: String },
        headerAnimating: { type: Boolean },
        isStreaming: { type: Boolean },
        conversationHistory: { type: Array }, // New property for conversation history
        isConversationMode: { type: Boolean }, // New property to track conversation state
        // Email composer form state
        showEmailForm: { type: Boolean, reflect: true },
        emailData: { type: Object }
    };

    static styles = css`
        :host {
            display: block;
            width: 100%;
            height: 100%;
            color: white;
            transform: translate3d(0, 0, 0);
            backface-visibility: hidden;
            transition: transform 0.2s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.2s ease-out;
            will-change: transform, opacity;
        }

        :host(.hiding) {
            animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.6, 1) forwards;
        }

        :host(.showing) {
            animation: slideDown 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        :host(.hidden) {
            opacity: 0;
            transform: translateY(-150%) scale(0.85);
            pointer-events: none;
        }

        @keyframes slideUp {
            0% {
                opacity: 1;
                transform: translateY(0) scale(1);
                filter: blur(0px);
            }
            30% {
                opacity: 0.7;
                transform: translateY(-20%) scale(0.98);
                filter: blur(0.5px);
            }
            70% {
                opacity: 0.3;
                transform: translateY(-80%) scale(0.92);
                filter: blur(1.5px);
            }
            100% {
                opacity: 0;
                transform: translateY(-150%) scale(0.85);
                filter: blur(2px);
            }
        }

        @keyframes slideDown {
            0% {
                opacity: 0;
                transform: translateY(-150%) scale(0.85);
                filter: blur(2px);
            }
            30% {
                opacity: 0.5;
                transform: translateY(-50%) scale(0.92);
                filter: blur(1px);
            }
            65% {
                opacity: 0.9;
                transform: translateY(-5%) scale(0.99);
                filter: blur(0.2px);
            }
            85% {
                opacity: 0.98;
                transform: translateY(2%) scale(1.005);
                filter: blur(0px);
            }
            100% {
                opacity: 1;
                transform: translateY(0) scale(1);
                filter: blur(0px);
            }
        }

        * {
            font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            cursor: default;
            user-select: none;
        }

        /* Allow text selection in assistant responses */
        .response-container, .response-container * {
            user-select: text !important;
            cursor: text !important;
        }

        .response-container pre {
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

        .response-container code {
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace !important;
            font-size: 11px !important;
            background: transparent !important;
            white-space: pre !important;
            word-wrap: normal !important;
            word-break: normal !important;
        }

        .response-container pre code {
            white-space: pre !important;
            word-wrap: normal !important;
            word-break: normal !important;
            display: block !important;
        }

        .response-container p code {
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

        .ask-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            background: rgba(0, 0, 0, 0.6);
            border-radius: 12px;
            outline: 0.5px rgba(255, 255, 255, 0.3) solid;
            outline-offset: -1px;
            backdrop-filter: blur(1px);
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
        }

        .ask-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.15);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            border-radius: 12px;
            filter: blur(10px);
            z-index: -1;
        }

        .response-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: transparent;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            flex-shrink: 0;
        }

        .response-header.hidden {
            display: none;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        }

        .response-icon {
            width: 20px;
            height: 20px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .response-icon svg {
            width: 12px;
            height: 12px;
            stroke: rgba(255, 255, 255, 0.9);
        }

        .response-label {
            font-size: 13px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
            white-space: nowrap;
            position: relative;
            overflow: hidden;
        }

        .response-label.animating {
            animation: fadeInOut 0.3s ease-in-out;
        }

        @keyframes fadeInOut {
            0% {
                opacity: 1;
                transform: translateY(0);
            }
            50% {
                opacity: 0;
                transform: translateY(-10px);
            }
            100% {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .header-right {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
            justify-content: flex-end;
        }

        .question-text {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.7);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 300px;
            margin-right: 8px;
        }

        .header-controls {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-shrink: 0;
        }

        .copy-button {
            background: transparent;
            color: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 4px;
            border-radius: 3px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 24px;
            height: 24px;
            flex-shrink: 0;
            transition: background-color 0.15s ease;
            position: relative;
            overflow: hidden;
        }

        .copy-button:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .copy-button svg {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
        }

        .copy-button .check-icon {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
        }

        .copy-button.copied .copy-icon {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
        }

        .copy-button.copied .check-icon {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }

        .close-button {
            background: rgba(255, 255, 255, 0.07);
            color: white;
            border: none;
            padding: 4px;
            border-radius: 20px;
            outline: 1px rgba(255, 255, 255, 0.3) solid;
            outline-offset: -1px;
            backdrop-filter: blur(0.5px);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
        }

        .close-button:hover {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 1);
        }

        .response-container {
            flex: 1;
            padding: 16px;
            padding-left: 48px;
            overflow-y: auto;
            font-size: 14px;
            line-height: 1.6;
            background: transparent;
            min-height: 0;
            max-height: 400px;
            position: relative;
        }

        .response-container.hidden {
            display: none;
        }

        .response-container::-webkit-scrollbar {
            width: 6px;
        }

        .response-container::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
        }

        .response-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
        }

        .response-container::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .loading-dots {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 40px;
        }

        .loading-dot {
            width: 8px;
            height: 8px;
            background: rgba(255, 255, 255, 0.6);
            border-radius: 50%;
            animation: pulse 1.5s ease-in-out infinite;
        }

        .loading-dot:nth-child(1) {
            animation-delay: 0s;
        }

        .loading-dot:nth-child(2) {
            animation-delay: 0.2s;
        }

        .loading-dot:nth-child(3) {
            animation-delay: 0.4s;
        }

        @keyframes pulse {
            0%,
            80%,
            100% {
                opacity: 0.3;
                transform: scale(0.8);
            }
            40% {
                opacity: 1;
                transform: scale(1.2);
            }
        }

        .response-line {
            position: relative;
            padding: 2px 0;
            margin: 0;
            transition: background-color 0.15s ease;
        }

        .response-line:hover {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
        }

        .line-copy-button {
            position: absolute;
            left: -32px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 3px;
            padding: 2px;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.15s ease, background-color 0.15s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
        }

        .response-line:hover .line-copy-button {
            opacity: 1;
        }

        .line-copy-button:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        .line-copy-button.copied {
            background: rgba(40, 167, 69, 0.3);
        }

        .line-copy-button svg {
            width: 12px;
            height: 12px;
            stroke: rgba(255, 255, 255, 0.9);
        }

        .text-input-container {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            background: rgba(0, 0, 0, 0.1);
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            flex-shrink: 0;
            transition: opacity 0.1s ease-in-out, transform 0.1s ease-in-out;
            transform-origin: bottom;
        }

        .text-input-container.hidden {
            opacity: 0;
            transform: scaleY(0);
            padding: 0;
            height: 0;
            overflow: hidden;
            border-top: none;
        }

        .text-input-container.no-response {
            border-top: none;
        }

        #textInput {
            flex: 1;
            padding: 10px 14px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 20px;
            outline: none;
            border: none;
            color: white;
            font-size: 14px;
            font-family: 'Helvetica Neue', sans-serif;
            font-weight: 400;
        }

        #textInput::placeholder {
            color: rgba(255, 255, 255, 0.5);
        }

        #textInput:focus {
            outline: none;
        }

        .response-line h1,
        .response-line h2,
        .response-line h3,
        .response-line h4,
        .response-line h5,
        .response-line h6 {
            color: rgba(255, 255, 255, 0.95);
            margin: 16px 0 8px 0;
            font-weight: 600;
        }

        .response-line p {
            margin: 8px 0;
            color: rgba(255, 255, 255, 0.9);
        }

        .response-line ul,
        .response-line ol {
            margin: 8px 0;
            padding-left: 20px;
        }

        .response-line li {
            margin: 4px 0;
            color: rgba(255, 255, 255, 0.9);
        }

        .response-line code {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.95);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 13px;
        }

        .response-line pre {
            background: rgba(255, 255, 255, 0.05);
            color: rgba(255, 255, 255, 0.95);
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 12px 0;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .response-line pre code {
            background: none;
            padding: 0;
        }

        .response-line blockquote {
            border-left: 3px solid rgba(255, 255, 255, 0.3);
            margin: 12px 0;
            padding: 8px 16px;
            background: rgba(255, 255, 255, 0.05);
            color: rgba(255, 255, 255, 0.8);
        }

        .empty-state {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: rgba(255, 255, 255, 0.5);
            font-size: 14px;
        }

        .btn-gap {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            gap: 4px;
        }

        /* ────────────────[ GLASS BYPASS ]─────────────── */
        :host-context(body.has-glass) .ask-container,
        :host-context(body.has-glass) .response-header,
        :host-context(body.has-glass) .response-icon,
        :host-context(body.has-glass) .copy-button,
        :host-context(body.has-glass) .close-button,
        :host-context(body.has-glass) .line-copy-button,
        :host-context(body.has-glass) .text-input-container,
        :host-context(body.has-glass) .response-container pre,
        :host-context(body.has-glass) .response-container p code,
        :host-context(body.has-glass) .response-container pre code {
            background: transparent !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            filter: none !important;
            backdrop-filter: none !important;
        }

        :host-context(body.has-glass) .ask-container::before {
            display: none !important;
        }

        :host-context(body.has-glass) .copy-button:hover,
        :host-context(body.has-glass) .close-button:hover,
        :host-context(body.has-glass) .line-copy-button,
        :host-context(body.has-glass) .line-copy-button:hover,
        :host-context(body.has-glass) .response-line:hover {
            background: transparent !important;
        }

        :host-context(body.has-glass) .response-container::-webkit-scrollbar-track,
        :host-context(body.has-glass) .response-container::-webkit-scrollbar-thumb {
            background: transparent !important;
        }

        .submit-btn, .clear-btn {
            display: flex;
            align-items: center;
            background: transparent;
            color: white;
            border: none;
            border-radius: 6px;
            margin-left: 8px;
            font-size: 13px;
            font-family: 'Helvetica Neue', sans-serif;
            font-weight: 500;
            overflow: hidden;
            cursor: pointer;
            transition: background 0.15s;
            height: 32px;
            padding: 0 10px;
            box-shadow: none;
        }
        .submit-btn:hover, .clear-btn:hover {
            background: rgba(255,255,255,0.1);
        }
        .btn-label {
            margin-right: 8px;
            display: flex;
            align-items: center;
            height: 100%;
        }
        .btn-icon {
            background: rgba(255,255,255,0.1);
            border-radius: 13%;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
        }
        .btn-icon img, .btn-icon svg {
            width: 13px;
            height: 13px;
            display: block;
        }
        .header-clear-btn {
            background: transparent;
            border: none;
            display: flex;
            align-items: center;
            gap: 2px;
            cursor: pointer;
            padding: 0 2px;
        }
        .header-clear-btn .icon-box {
            color: white;
            font-size: 12px;
            font-family: 'Helvetica Neue', sans-serif;
            font-weight: 500;
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 13%;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .header-clear-btn:hover .icon-box {
            background-color: rgba(255,255,255,0.18);
        }

        /* Conversation History Styles */
        .conversation-history {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            margin-bottom: 12px;
            max-height: 200px;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
        }

        .conversation-history::-webkit-scrollbar {
            width: 6px;
        }

        .conversation-history::-webkit-scrollbar-track {
            background: transparent;
        }

        .conversation-history::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 3px;
        }

        .conversation-history::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.5);
        }

        .conversation-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px 8px 0 0;
        }

        .conversation-label {
            font-size: 11px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.8);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .new-conversation-btn {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            color: white;
            padding: 4px 8px;
            font-size: 10px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s ease;
        }

        .new-conversation-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.3);
            transform: translateY(-1px);
        }

        .history-list {
            max-height: 150px;
            overflow-y: auto;
            padding: 8px;
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
        }

        .history-list::-webkit-scrollbar {
            width: 4px;
        }

        .history-list::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 2px;
        }

        .history-exchange {
            margin-bottom: 8px;
            padding: 6px 8px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 6px;
            border-left: 2px solid rgba(255, 255, 255, 0.1);
        }

        .history-exchange:last-child {
            margin-bottom: 0;
        }

        .history-question,
        .history-response {
            display: flex;
            margin-bottom: 4px;
            font-size: 11px;
            line-height: 1.4;
        }

        .history-response {
            margin-bottom: 0;
        }

        .history-label {
            color: rgba(255, 255, 255, 0.6);
            font-weight: 600;
            margin-right: 6px;
            min-width: 16px;
        }

        .history-text {
            color: rgba(255, 255, 255, 0.8);
            flex: 1;
            word-break: break-word;
        }

        .history-question .history-label {
            color: rgba(100, 200, 255, 0.8);
        }

        .history-response .history-label {
            color: rgba(100, 255, 150, 0.8);
        }

        /* Response Container Scrolling Improvements */
        .response-container {
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
            scroll-behavior: smooth;
        }

        .response-container::-webkit-scrollbar {
            width: 6px;
        }

        .response-container::-webkit-scrollbar-track {
            background: transparent;
        }

        .response-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 3px;
        }

        .response-container::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.5);
        }

        /* Email Form Styles */
        .email-form {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 12px 16px;
            background: rgba(0, 0, 0, 0.1);
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            flex-shrink: 0;
            transition: opacity 0.1s ease-in-out, transform 0.1s ease-in-out;
            transform-origin: top;
        }

        .email-form.hidden {
            opacity: 0;
            transform: scaleY(0);
            padding: 0;
            height: 0;
            overflow: hidden;
            border-top: none;
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
            width: 120px; /* Adjust as needed */
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
        
        /* Email form should work alongside the response, not replace it */
        .email-form {
            border: 1px solid rgba(255, 255, 255, 0.2);
            margin-top: 8px;
            position: relative;
        }
        
        .email-form-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(0, 0, 0, 0.2);
        }
        
        .email-form-title {
            font-size: 14px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
        }
        
        .email-header-buttons {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        
        .email-debug-btn {
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.7);
            cursor: pointer;
            padding: 4px;
            border-radius: 3px;
            transition: background 0.15s;
            font-size: 14px;
        }
        
        .email-debug-btn:hover {
            background: rgba(255, 255, 255, 0.1);
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
        
        /* Ensure email form is visible and properly positioned */
        .email-form.hidden {
            opacity: 0;
            transform: scaleY(0);
            padding: 0;
            height: 0;
            overflow: hidden;
            border: none;
            margin: 0;
        }
    `;

    constructor() {
        super();
        this.currentResponse = '';
        this.currentQuestion = '';
        this.isLoading = false;
        this.copyState = 'idle';
        this.showTextInput = true;
        this.headerText = 'AI Response';
        this.headerAnimating = false;
        this.isStreaming = false;
        this.conversationHistory = [];
        this.isConversationMode = false;
        this.showEmailForm = false;
        this.emailData = { to: '', subject: '', body: '' };

        this.marked = null;
        this.hljs = null;
        this.DOMPurify = null;
        this.isLibrariesLoaded = false;

        // SMD.js streaming markdown parser
        this.smdParser = null;
        this.smdContainer = null;
        this.lastProcessedLength = 0;

        this.handleSendText = this.handleSendText.bind(this);
        this.handleTextKeydown = this.handleTextKeydown.bind(this);
        this.handleCopy = this.handleCopy.bind(this);
        this.clearResponseContent = this.clearResponseContent.bind(this);
        this.handleEscKey = this.handleEscKey.bind(this);
        this.handleScroll = this.handleScroll.bind(this);
        this.handleCloseAskWindow = this.handleCloseAskWindow.bind(this);
        this.handleCloseIfNoContent = this.handleCloseIfNoContent.bind(this);
        this.startNewConversation = this.startNewConversation.bind(this);
        this.addToConversationHistory = this.addToConversationHistory.bind(this);
        this.closeEmailForm = this.closeEmailForm.bind(this);
        this.handleEmailSend = this.handleEmailSend.bind(this);
        this.checkAvailableTools = this.checkAvailableTools.bind(this);

        this.loadLibraries();

        // --- Resize helpers ---
        this.isThrottled = false;
    }

    /**
     * Add a message exchange to the conversation history
     * @param {string} question - User question
     * @param {string} response - AI response
     */
    addToConversationHistory(question, response) {
        if (question && response) {
            this.conversationHistory.push({
                question: question.trim(),
                response: response.trim(),
                timestamp: new Date().toISOString()
            });
            this.isConversationMode = true;
            console.log(`[AskView] Added to conversation history. Total exchanges: ${this.conversationHistory.length}`);
        }
    }

    /**
     * Start a new conversation by clearing history
     */
    startNewConversation() {
        this.conversationHistory = [];
        this.isConversationMode = false;
        this.currentResponse = '';
        this.currentQuestion = '';
        this.showTextInput = true;
        console.log('[AskView] Started new conversation');
        this.requestUpdate();
        this.focusTextInput();
    }

    /**
     * Get conversation history formatted for API
     * @returns {string[]} Array of conversation texts
     */
    getConversationHistoryForAPI() {
        const history = [];
        this.conversationHistory.forEach(exchange => {
            history.push(exchange.question);
            history.push(exchange.response);
        });
        return history;
    }

    connectedCallback() {
        super.connectedCallback();

        console.log('📱 AskView connectedCallback - IPC 이벤트 리스너 설정');

        document.addEventListener('keydown', this.handleEscKey);

        this.resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const needed = entry.contentRect.height;
                const current = window.innerHeight;

                if (needed > current - 4) {
                    this.requestWindowResize(Math.ceil(needed));
                }
            }
        });

        const container = this.shadowRoot?.querySelector('.ask-container');
        if (container) this.resizeObserver.observe(container);

        this.handleQuestionFromAssistant = (event, question) => {
            console.log('AskView: Received question from ListenView:', question);
            this.handleSendText(null, question);
        };

        if (window.api) {
            window.api.askView.onShowTextInput(() => {
                console.log('Show text input signal received');
                if (!this.showTextInput) {
                    this.showTextInput = true;
                    this.updateComplete.then(() => this.focusTextInput());
                  } else {
                    this.focusTextInput();
                  }
            });

            window.api.askView.onScrollResponseUp(() => this.handleScroll('up'));
            window.api.askView.onScrollResponseDown(() => this.handleScroll('down'));
            window.api.askView.onAskStateUpdate((event, newState) => {
                // Check if we just completed a response (was streaming, now not streaming with response)
                const justCompletedResponse = this.isStreaming && !newState.isStreaming && 
                                            newState.currentResponse && !newState.isLoading;
                
                const previousQuestion = this.currentQuestion;
                const previousResponse = this.currentResponse;
                
                this.currentResponse = newState.currentResponse;
                this.currentQuestion = newState.currentQuestion;
                this.isLoading       = newState.isLoading;
                this.isStreaming     = newState.isStreaming;
              
                const wasHidden = !this.showTextInput;
                this.showTextInput = newState.showTextInput;
                
                // Add completed exchange to conversation history
                if (justCompletedResponse && previousQuestion && newState.currentResponse) {
                    this.addToConversationHistory(previousQuestion, newState.currentResponse);
                    // Keep input available for follow-up questions
                    this.showTextInput = true;
                }
              
                if (newState.showTextInput) {
                  if (wasHidden) {
                    this.updateComplete.then(() => this.focusTextInput());
                  } else {
                    this.focusTextInput();
                  }
                }
              });
            console.log('AskView: IPC 이벤트 리스너 등록 완료');
        }
        // Listen for MCP email UI resources
        window.api?.mcp?.ui?.onResourceAvailable((event, data) => this.handleUIResource(data));
        // Listen for inline UI resources (email form activation)
        window.api?.mcp?.ui?.onResourceAvailable((event, data) => {
            this.handleUIResource(data);
        });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.resizeObserver?.disconnect();

        console.log('📱 AskView disconnectedCallback - IPC 이벤트 리스너 제거');

        document.removeEventListener('keydown', this.handleEscKey);

        if (this.copyTimeout) {
            clearTimeout(this.copyTimeout);
        }

        if (this.headerAnimationTimeout) {
            clearTimeout(this.headerAnimationTimeout);
        }

        if (this.streamingTimeout) {
            clearTimeout(this.streamingTimeout);
        }

        Object.values(this.lineCopyTimeouts).forEach(timeout => clearTimeout(timeout));

        if (window.api) {
            window.api.askView.removeOnAskStateUpdate(this.handleAskStateUpdate);
            window.api.askView.removeOnShowTextInput(this.handleShowTextInput);
            window.api.askView.removeOnScrollResponseUp(this.handleScroll);
            window.api.askView.removeOnScrollResponseDown(this.handleScroll);
            console.log('✅ AskView: IPC 이벤트 리스너 제거 필요');
        }
    }


    async loadLibraries() {
        try {
            if (!window.marked) {
                await this.loadScript('../../assets/marked-4.3.0.min.js');
            }

            if (!window.hljs) {
                await this.loadScript('../../assets/highlight-11.9.0.min.js');
            }

            if (!window.DOMPurify) {
                await this.loadScript('../../assets/dompurify-3.0.7.min.js');
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
                this.renderContent();
                console.log('Markdown libraries loaded successfully in AskView');
            }

            if (this.DOMPurify) {
                this.isDOMPurifyLoaded = true;
                console.log('DOMPurify loaded successfully in AskView');
            }
        } catch (error) {
            console.error('Failed to load libraries in AskView:', error);
        }
    }

    handleCloseAskWindow() {
        // this.clearResponseContent();
        window.api.askView.closeAskWindow();
    }

    handleCloseIfNoContent() {
        if (!this.currentResponse && !this.isLoading && !this.isStreaming) {
            this.handleCloseAskWindow();
        }
    }

    handleEscKey(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            this.handleCloseIfNoContent();
        }
    }

    clearResponseContent() {
        this.currentResponse = '';
        this.currentQuestion = '';
        this.isLoading = false;
        this.isStreaming = false;
        this.headerText = 'AI Response';
        this.showTextInput = true;
        this.lastProcessedLength = 0;
        this.smdParser = null;
        this.smdContainer = null;
    }

    handleInputFocus() {
        this.isInputFocused = true;
    }

    focusTextInput() {
        requestAnimationFrame(() => {
            const textInput = this.shadowRoot?.getElementById('textInput');
            if (textInput) {
                textInput.focus();
            }
        });
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
            console.error('Markdown parsing error in AskView:', error);
            return text;
        }
    }

    fixIncompleteCodeBlocks(text) {
        if (!text) return text;

        const codeBlockMarkers = text.match(/```/g) || [];
        const markerCount = codeBlockMarkers.length;

        if (markerCount % 2 === 1) {
            return text + '\n```';
        }

        return text;
    }

    handleScroll(direction) {
        const scrollableElement = this.shadowRoot.querySelector('#responseContainer');
        if (scrollableElement) {
            const scrollAmount = 100; // 한 번에 스크롤할 양 (px)
            if (direction === 'up') {
                scrollableElement.scrollTop -= scrollAmount;
            } else {
                scrollableElement.scrollTop += scrollAmount;
            }
        }
    }


    renderContent() {
        const responseContainer = this.shadowRoot.getElementById('responseContainer');
        if (!responseContainer) return;
    
        // Check loading state
        if (this.isLoading) {
            responseContainer.innerHTML = `
              <div class="loading-dots">
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
              </div>`;
            this.resetStreamingParser();
            return;
        }
        
        // If there is no response, show empty state
        if (!this.currentResponse) {
            responseContainer.innerHTML = `<div class="empty-state">...</div>`;
            this.resetStreamingParser();
            return;
        }
        
        // Set streaming markdown parser
        this.renderStreamingMarkdown(responseContainer);

        // Auto-scroll to bottom when content is updated during streaming
        if (this.isStreaming && responseContainer.style.overflowY === 'auto') {
            responseContainer.scrollTop = responseContainer.scrollHeight;
        }

        // After updating content, recalculate window height
        this.adjustWindowHeightThrottled();
    }

    resetStreamingParser() {
        this.smdParser = null;
        this.smdContainer = null;
        this.lastProcessedLength = 0;
    }

    renderStreamingMarkdown(responseContainer) {
        try {
            // 파서가 없거나 컨테이너가 변경되었으면 새로 생성
            if (!this.smdParser || this.smdContainer !== responseContainer) {
                this.smdContainer = responseContainer;
                this.smdContainer.innerHTML = '';
                
                // smd.js의 default_renderer 사용
                const renderer = default_renderer(this.smdContainer);
                this.smdParser = parser(renderer);
                this.lastProcessedLength = 0;
            }

            // 새로운 텍스트만 처리 (스트리밍 최적화)
            const currentText = this.currentResponse;
            const newText = currentText.slice(this.lastProcessedLength);
            
            if (newText.length > 0) {
                // 새로운 텍스트 청크를 파서에 전달
                parser_write(this.smdParser, newText);
                this.lastProcessedLength = currentText.length;
            }

            // 스트리밍이 완료되면 파서 종료
            if (!this.isStreaming && !this.isLoading) {
                parser_end(this.smdParser);
            }

            // 코드 하이라이팅 적용
            if (this.hljs) {
                responseContainer.querySelectorAll('pre code').forEach(block => {
                    if (!block.hasAttribute('data-highlighted')) {
                        this.hljs.highlightElement(block);
                        block.setAttribute('data-highlighted', 'true');
                    }
                });
            }

            // 스크롤을 맨 아래로
            responseContainer.scrollTop = responseContainer.scrollHeight;
            
        } catch (error) {
            console.error('Error rendering streaming markdown:', error);
            // 에러 발생 시 기본 텍스트 렌더링으로 폴백
            this.renderFallbackContent(responseContainer);
        }
    }

    renderFallbackContent(responseContainer) {
        const textToRender = this.currentResponse || '';
        
        if (this.isLibrariesLoaded && this.marked && this.DOMPurify) {
            try {
                // 마크다운 파싱
                const parsedHtml = this.marked.parse(textToRender);

                // DOMPurify로 정제
                const cleanHtml = this.DOMPurify.sanitize(parsedHtml, {
                    ALLOWED_TAGS: [
                        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'b', 'em', 'i',
                        'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img', 'table', 'thead',
                        'tbody', 'tr', 'th', 'td', 'hr', 'sup', 'sub', 'del', 'ins',
                    ],
                    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel'],
                });

                responseContainer.innerHTML = cleanHtml;

                // 코드 하이라이팅 적용
                if (this.hljs) {
                    responseContainer.querySelectorAll('pre code').forEach(block => {
                        this.hljs.highlightElement(block);
                    });
                }
            } catch (error) {
                console.error('Error in fallback rendering:', error);
                responseContainer.textContent = textToRender;
            }
        } else {
            // 라이브러리가 로드되지 않았을 때 기본 렌더링
            const basicHtml = textToRender
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`([^`]+)`/g, '<code>$1</code>');

            responseContainer.innerHTML = `<p>${basicHtml}</p>`;
        }
    }


    requestWindowResize(targetHeight) {
        if (window.api) {
            window.api.askView.adjustWindowHeight(targetHeight);
        }
    }

    animateHeaderText(text) {
        this.headerAnimating = true;
        this.requestUpdate();

        setTimeout(() => {
            this.headerText = text;
            this.headerAnimating = false;
            this.requestUpdate();
        }, 150);
    }

    startHeaderAnimation() {
        this.animateHeaderText('analyzing screen...');

        if (this.headerAnimationTimeout) {
            clearTimeout(this.headerAnimationTimeout);
        }

        this.headerAnimationTimeout = setTimeout(() => {
            this.animateHeaderText('thinking...');
        }, 1500);
    }

    renderMarkdown(content) {
        if (!content) return '';

        if (this.isLibrariesLoaded && this.marked) {
            return this.parseMarkdown(content);
        }

        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }

    fixIncompleteMarkdown(text) {
        if (!text) return text;

        // 불완전한 볼드체 처리
        const boldCount = (text.match(/\*\*/g) || []).length;
        if (boldCount % 2 === 1) {
            text += '**';
        }

        // 불완전한 이탤릭체 처리
        const italicCount = (text.match(/(?<!\*)\*(?!\*)/g) || []).length;
        if (italicCount % 2 === 1) {
            text += '*';
        }

        // 불완전한 인라인 코드 처리
        const inlineCodeCount = (text.match(/`/g) || []).length;
        if (inlineCodeCount % 2 === 1) {
            text += '`';
        }

        // 불완전한 링크 처리
        const openBrackets = (text.match(/\[/g) || []).length;
        const closeBrackets = (text.match(/\]/g) || []).length;
        if (openBrackets > closeBrackets) {
            text += ']';
        }

        const openParens = (text.match(/\]\(/g) || []).length;
        const closeParens = (text.match(/\)\s*$/g) || []).length;
        if (openParens > closeParens && text.endsWith('(')) {
            text += ')';
        }

        return text;
    }


    async handleCopy() {
        if (this.copyState === 'copied') return;

        let responseToCopy = this.currentResponse;

        if (this.isDOMPurifyLoaded && this.DOMPurify) {
            const testHtml = this.renderMarkdown(responseToCopy);
            const sanitized = this.DOMPurify.sanitize(testHtml);

            if (this.DOMPurify.removed && this.DOMPurify.removed.length > 0) {
                console.warn('Unsafe content detected, copy blocked');
                return;
            }
        }

        const textToCopy = `Question: ${this.currentQuestion}\n\nAnswer: ${responseToCopy}`;

        try {
            await navigator.clipboard.writeText(textToCopy);
            console.log('Content copied to clipboard');

            this.copyState = 'copied';
            this.requestUpdate();

            if (this.copyTimeout) {
                clearTimeout(this.copyTimeout);
            }

            this.copyTimeout = setTimeout(() => {
                this.copyState = 'idle';
                this.requestUpdate();
            }, 1500);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    async handleLineCopy(lineIndex) {
        const originalLines = this.currentResponse.split('\n');
        const lineToCopy = originalLines[lineIndex];

        if (!lineToCopy) return;

        try {
            await navigator.clipboard.writeText(lineToCopy);
            console.log('Line copied to clipboard');

            // '복사됨' 상태로 UI 즉시 업데이트
            this.lineCopyState = { ...this.lineCopyState, [lineIndex]: true };
            this.requestUpdate(); // LitElement에 UI 업데이트 요청

            // 기존 타임아웃이 있다면 초기화
            if (this.lineCopyTimeouts && this.lineCopyTimeouts[lineIndex]) {
                clearTimeout(this.lineCopyTimeouts[lineIndex]);
            }

            // ✨ 수정된 타임아웃: 1.5초 후 '복사됨' 상태 해제
            this.lineCopyTimeouts[lineIndex] = setTimeout(() => {
                const updatedState = { ...this.lineCopyState };
                delete updatedState[lineIndex];
                this.lineCopyState = updatedState;
                this.requestUpdate(); // UI 업데이트 요청
            }, 1500);
        } catch (err) {
            console.error('Failed to copy line:', err);
        }
    }

    async handleSendText(e, overridingText = '') {
        const textInput = this.shadowRoot?.getElementById('textInput');
        const text = (overridingText || textInput?.value || '').trim();
        if (!text) return;

        textInput.value = '';

        if (window.api) {
            // Get conversation history for context
            const conversationHistory = this.getConversationHistoryForAPI();
            
            console.log(`[AskView] Sending message with ${conversationHistory.length} history items`);
            
            window.api.askView.sendMessage(text, conversationHistory).catch(error => {
                console.error('Error sending text:', error);
            });
        }
    }

    async handleMCPAction(event) {
        const { action } = event.detail;
        console.log('[AskView] MCP action triggered:', action);

        if (!window.api?.mcp?.executeAction) {
            console.error('[AskView] MCP UI API not available');
            return;
        }

        try {
            // Execute the action through MCP UI Integration
            const result = await window.api.mcp.executeAction(action.id, {
                ...action.metadata,
                currentQuestion: this.currentQuestion,
                currentResponse: this.currentResponse,
                conversationHistory: this.conversationHistory
            });

            if (result.success) {
                console.log('[AskView] MCP action executed successfully:', result);
                
                // Handle UI resource if returned
                if (result.result?.resourceId) {
                    // The UI resource will be handled by the global UI resource handler
                    console.log('[AskView] UI resource created:', result.result.resourceId);
                }
            } else {
                console.error('[AskView] MCP action failed:', result.error);
            }
        } catch (error) {
            console.error('[AskView] Error executing MCP action:', error);
        }
    }

    handleTextKeydown(e) {
        // Fix for IME composition issue: Ignore Enter key presses while composing.
        if (e.isComposing) {
            return;
        }

        const isPlainEnter = e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey;
        const isModifierEnter = e.key === 'Enter' && (e.metaKey || e.ctrlKey);

        if (isPlainEnter || isModifierEnter) {
            e.preventDefault();
            this.handleSendText();
        }
    }

    updated(changedProperties) {
        super.updated(changedProperties);
    
        // ✨ isLoading 또는 currentResponse가 변경될 때마다 뷰를 다시 그립니다.
        if (changedProperties.has('isLoading') || changedProperties.has('currentResponse')) {
            this.renderContent();
        }
    
        if (changedProperties.has('showTextInput') || changedProperties.has('isLoading') || 
            changedProperties.has('currentResponse') || changedProperties.has('conversationHistory')) {
            this.adjustWindowHeightThrottled();
        }
    
        if (changedProperties.has('showTextInput') && this.showTextInput) {
            this.focusTextInput();
        }

        // Handle conversation history changes
        if (changedProperties.has('conversationHistory')) {
            console.log(`[AskView] Conversation history updated: ${this.conversationHistory.length} exchanges`);
        }
    }

    firstUpdated() {
        setTimeout(() => this.adjustWindowHeight(), 200);
        
        // Set up MCP UI resource event listener via contextBridge API
        if (window.api && window.api.mcp && window.api.mcp.ui && window.api.mcp.ui.onResourceAvailable) {
            window.api.mcp.ui.onResourceAvailable((event, data) => {
                console.log('[AskView] UI resource available:', data);
                this.handleMCPUIResource(data);
            });
        }
    }


    getTruncatedQuestion(question, maxLength = 30) {
        if (!question) return '';
        if (question.length <= maxLength) return question;
        return question.substring(0, maxLength) + '...';
    }



    render() {
        const hasResponse = this.isLoading || this.currentResponse || this.isStreaming;
        const hasConversationHistory = this.conversationHistory.length > 0;
        const headerText = this.isLoading ? 'Thinking...' : 'AI Response';
        const placeholderText = hasConversationHistory ? 
            "Continue the conversation..." : 
            "Ask about your screen or audio";

        return html`
            <div class="ask-container">
                <!-- Conversation History -->
                ${hasConversationHistory ? html`
                    <div class="conversation-history">
                        <div class="conversation-header">
                            <span class="conversation-label">Conversation History</span>
                            <button class="new-conversation-btn" @click=${this.startNewConversation} title="Start New Conversation">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 5v14m-7-7h14" />
                                </svg>
                                New
                            </button>
                        </div>
                        <div class="history-list">
                            ${this.conversationHistory.map((exchange, index) => html`
                                <div class="history-exchange">
                                    <div class="history-question">
                                        <span class="history-label">Q:</span>
                                        <span class="history-text">${exchange.question}</span>
                                    </div>
                                    <div class="history-response">
                                        <span class="history-label">A:</span>
                                        <span class="history-text">${this.getTruncatedQuestion(exchange.response, 100)}</span>
                                    </div>
                                </div>
                            `)}
                        </div>
                    </div>
                ` : ''}

                <!-- Response Header -->
                <div class="response-header ${!hasResponse || this.showEmailForm ? 'hidden' : ''}">
                    <div class="header-left">
                        <div class="response-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                                <path d="M8 12l2 2 4-4" />
                            </svg>
                        </div>
                        <span class="response-label">${headerText}</span>
                    </div>
                    <div class="header-right">
                        <span class="question-text">${this.getTruncatedQuestion(this.currentQuestion)}</span>
                        <div class="header-controls">
                            ${hasConversationHistory ? html`
                                <button class="new-conversation-btn" @click=${this.startNewConversation} title="Start New Conversation">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M12 5v14m-7-7h14" />
                                    </svg>
                                </button>
                            ` : ''}
                            <button class="copy-button ${this.copyState === 'copied' ? 'copied' : ''}" @click=${this.handleCopy}>
                                <svg class="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                </svg>
                                <svg
                                    class="check-icon"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2.5"
                                >
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                            </button>
                            <button class="close-button" @click=${this.handleCloseAskWindow}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Response Container -->
                <div class="response-container ${!hasResponse ? 'hidden' : ''}" id="responseContainer">
                    <!-- Content is dynamically generated in updateResponseContent() -->
                </div>

                <!-- MCP Action Bar -->
                ${this.showTextInput && hasResponse ? html`
                    <mcp-action-bar
                        .context=${{
                            type: 'ask',
                            message: this.currentQuestion,
                            response: this.currentResponse,
                            history: this.conversationHistory
                        }}
                        @mcp-action=${this.handleMCPAction}
                    ></mcp-action-bar>
                ` : ''}

                <!-- Inline Email Form - Moved to after response container -->
                ${this.showEmailForm ? html`
                    <div class="email-form">
                        <div class="email-form-header">
                            <span class="email-form-title">Email Composer</span>
                            <div class="email-header-buttons">
                                <button class="email-debug-btn" @click=${this.checkAvailableTools} title="Check Available Gmail Tools">
                                    🔍
                                </button>
                                <button class="email-close-btn" @click=${this.closeEmailForm}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
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
                            <textarea id="emailBody" rows="4" .value=${this.emailData.body} @input=${e => this.emailData.body = e.target.value} placeholder="Type your email..."></textarea>
                        </div>
                        <button class="submit-btn email-send-btn" @click=${this.handleEmailSend}>Send Email</button>
                    </div>
                ` : ''}

                <!-- Text Input Container -->
                <div class="text-input-container ${!hasResponse ? 'no-response' : ''} ${!this.showTextInput ? 'hidden' : ''}">
                    <input
                        type="text"
                        id="textInput"
                        placeholder="${placeholderText}"
                        @keydown=${this.handleTextKeydown}
                        @focus=${this.handleInputFocus}
                    />
                    <button
                        class="submit-btn"
                        @click=${this.handleSendText}
                    >
                        <span class="btn-label">Submit</span>
                        <span class="btn-icon">
                            ↵
                        </span>
                    </button>
                </div>
            </div>
        `;
    }

    // Dynamically resize the BrowserWindow to fit current content
    adjustWindowHeight() {
        if (!window.api) return;

        this.updateComplete.then(() => {
            const headerEl = this.shadowRoot.querySelector('.response-header');
            const responseEl = this.shadowRoot.querySelector('.response-container');
            const inputEl = this.shadowRoot.querySelector('.text-input-container');
            const historyEl = this.shadowRoot.querySelector('.conversation-history'); // Include conversation history
            const emailFormEl = this.shadowRoot.querySelector('.email-form'); // Include email form

            if (!headerEl || !responseEl) return;

            const headerHeight = headerEl.classList.contains('hidden') ? 0 : headerEl.offsetHeight;
            const responseHeight = responseEl.scrollHeight;
            const inputHeight = (inputEl && !inputEl.classList.contains('hidden')) ? inputEl.offsetHeight : 0;
            const historyHeight = (historyEl && !historyEl.classList.contains('hidden')) ? historyEl.offsetHeight : 0;
            const emailFormHeight = (emailFormEl && !emailFormEl.classList.contains('hidden')) ? emailFormEl.offsetHeight : 0;

            const idealHeight = headerHeight + responseHeight + inputHeight + historyHeight + emailFormHeight;
            const maxHeight = 700; // Maximum window height
            const targetHeight = Math.min(maxHeight, idealHeight);

            // If content exceeds max height, enable scrolling in response container
            if (idealHeight > maxHeight) {
                const availableResponseHeight = maxHeight - headerHeight - inputHeight - historyHeight - emailFormHeight;
                responseEl.style.maxHeight = `${availableResponseHeight}px`;
                responseEl.style.overflowY = 'auto';
                console.log(`[AskView] Content exceeds max height. Enabling scroll. Available response height: ${availableResponseHeight}px`);
            } else {
                responseEl.style.maxHeight = 'none';
                responseEl.style.overflowY = 'visible';
            }

            console.log(
                `[AskView Height Debug] Header: ${headerHeight}px, Response: ${responseHeight}px, Input: ${inputHeight}px, History: ${historyHeight}px, Email Form: ${emailFormHeight}px, Ideal: ${idealHeight}px, Target: ${targetHeight}px`
            );

            window.api.askView.adjustWindowHeight("ask", targetHeight);

        }).catch(err => console.error('AskView adjustWindowHeight error:', err));
    }

    // Throttled wrapper to avoid excessive IPC spam (executes at most once per animation frame)
    adjustWindowHeightThrottled() {
        if (this.isThrottled) return;

        this.isThrottled = true;
        requestAnimationFrame(() => {
            this.adjustWindowHeight();
            this.isThrottled = false;
        });
    }

    /** Handle incoming UI resource events */
    handleUIResource(data) {
      console.log('[AskView] handleUIResource called with:', data);
      
      if (data.tool === 'gmail.send' && data.context) {
        console.log('[AskView] Email context received:', data.context);
        
        this.emailData = {
          to: data.context.recipients || '',
          subject: data.context.subject || '',
          body: data.context.body || '',
          cc: data.context.cc || '',
          bcc: data.context.bcc || ''
        };
        
        console.log('[AskView] Setting emailData:', this.emailData);
        
        this.showEmailForm = true;
        this.requestUpdate();
        
        // Adjust window height to accommodate the email form
        this.adjustWindowHeightThrottled();
      } else {
        console.log('[AskView] UI resource not handled - tool:', data.tool, 'hasContext:', !!data.context);
      }
    }

  /** Send the email via MCP tool */
  async handleEmailSend() {
    const { to, subject, body, cc = '', bcc = '' } = this.emailData;
    if (!to || !subject || !body) {
      alert('Please fill in To, Subject, and Body fields');
      return;
    }
    
    try {
      console.log('[AskView] Attempting to send email via Paragon MCP...');
      
      // Use the correct Gmail tool name from Paragon MCP
      const toolName = 'gmail_send_email';
      
      const result = await window.api.mcp.callTool(toolName, {
        toRecipients: [{ emailAddress: { address: to } }],
        from: { emailAddress: { address: 'user@gmail.com' } }, // Will use authenticated user's email
        messageContent: {
          subject: subject,
          body: {
            content: body,
            contentType: 'text'
          }
        }
      });
      
      if (result && result.success) {
        console.log('[AskView] Email sent successfully via Paragon');
        
        // Close the email form and reset data after successful send
        this.showEmailForm = false;
        this.emailData = { to: '', subject: '', body: '', cc: '', bcc: '' };
        this.requestUpdate();
        
        // Show success message in the response area
        this.currentResponse = `✅ Email sent successfully to ${to}!`;
        this.isLoading = false;
        this.isStreaming = false;
        this.requestUpdate();
        
      } else {
        console.error('[AskView] Email sending failed:', result.error);
        
        // Display a user-friendly error message in the UI
        this.currentResponse = `❌ Failed to send email: ${result.error || 'Unknown error'}`;
        this.isLoading = false;
        this.isStreaming = false;
        this.requestUpdate();
      }
    } catch (err) {
        console.error('[AskView] Error in email send process:', err);
        
        // Display a generic error in the UI
        this.currentResponse = `❌ An unexpected error occurred while trying to send the email: ${err.message}`;
        this.isLoading = false;
        this.isStreaming = false;
        this.requestUpdate();
    }
  }
  
  /** Close the email form */
  closeEmailForm() {
    this.showEmailForm = false;
    this.requestUpdate();
  }
  
  /** Debug: Check available MCP tools */
  async checkAvailableTools() {
    try {
      const result = await window.api.mcp.getAvailableTools();
      if (result && result.success) {
        console.log('[AskView] Available MCP tools:', result.tools);
        const gmailTools = result.tools.filter(tool => 
          tool.name.toLowerCase().includes('gmail') || 
          tool.name.toLowerCase().includes('email') ||
          tool.name.toLowerCase().includes('send')
        );
        console.log('[AskView] Gmail-related tools:', gmailTools);
        return gmailTools;
      } else {
        console.log('[AskView] Failed to get tools:', result.error);
        return [];
      }
    } catch (error) {
      console.error('[AskView] Error checking tools:', error);
      return [];
    }
  }

    /**
     * Handle incoming MCP UI resources (like email composer)
     * @param {Object} data - The UI resource data
     */
    handleMCPUIResource(data) {
        console.log('[AskView] Handling MCP UI resource:', data);
        
        // Check if this is an email composer resource
        if (data.tool && data.tool.includes('GMAIL_SEND_EMAIL') && data.resource) {
            console.log('[AskView] Displaying email composer UI');
            
            // Extract email data from the HTML content if available
            try {
                const emailData = this.extractEmailDataFromResource(data.resource);
                
                // Show the email form with pre-filled data
                this.emailData = {
                    to: emailData.to || '',
                    subject: emailData.subject || '',
                    body: emailData.body || '',
                    cc: emailData.cc || '',
                    bcc: emailData.bcc || ''
                };
                
                this.showEmailForm = true;
                this.requestUpdate();
                
                // Adjust window height to accommodate the email form
                this.adjustWindowHeightThrottled();
                
            } catch (error) {
                console.error('[AskView] Error processing email UI resource:', error);
            }
        }
    }
    
    /**
     * Extract email data from UI resource HTML content
     * @param {Object} resource - The UI resource
     * @returns {Object} Extracted email data
     */
    extractEmailDataFromResource(resource) {
        const emailData = { to: '', subject: '', body: '', cc: '', bcc: '' };
        
        try {
            if (resource.text) {
                // Parse the HTML to extract pre-filled values
                const parser = new DOMParser();
                const doc = parser.parseFromString(resource.text, 'text/html');
                
                // Extract values from input fields
                const toInput = doc.querySelector('input[name="to"]');
                if (toInput) emailData.to = toInput.value;
                
                const subjectInput = doc.querySelector('input[name="subject"]');
                if (subjectInput) emailData.subject = subjectInput.value;
                
                const bodyTextarea = doc.querySelector('textarea[name="body"]');
                if (bodyTextarea) emailData.body = bodyTextarea.textContent || bodyTextarea.value;
                
                const ccInput = doc.querySelector('input[name="cc"]');
                if (ccInput) emailData.cc = ccInput.value;
                
                const bccInput = doc.querySelector('input[name="bcc"]');
                if (bccInput) emailData.bcc = bccInput.value;
            }
        } catch (error) {
            console.warn('[AskView] Could not parse email data from resource:', error);
        }
        
        return emailData;
    }
}

customElements.define('ask-view', AskView);
