// factory.js

/**
 * @typedef {object} ModelOption
 * @property {string} id 
 * @property {string} name
 */

/**
 * @typedef {object} Provider
 * @property {string} name
 * @property {() => any} handler
 * @property {ModelOption[]} llmModels
 * @property {ModelOption[]} sttModels
 */

/**
 * @type {Object.<string, Provider>}
 */
const PROVIDERS = {
  'openai': {
      name: 'OpenAI',
      handler: () => require("./providers/openai"),
      llmModels: [
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'gpt-4o', name: 'GPT-4o' },
      ],
      sttModels: [
          { id: 'gpt-4o-mini-transcribe', name: 'GPT-4o Mini Transcribe' }
      ],
  },

      'openai-leviousa': {
        name: 'OpenAI (Leviousa)',
      handler: () => require("./providers/openai"),
      llmModels: [
                      { id: 'gpt-4o-mini-leviousa', name: 'GPT-4o Mini (leviousa)' },
      ],
      sttModels: [
                      { id: 'gpt-4o-mini-transcribe-leviousa', name: 'GPT-4o Mini Transcribe (leviousa)' }
      ],
  },
  'gemini': {
      name: 'Gemini',
      handler: () => require("./providers/gemini"),
      llmModels: [
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      ],
      sttModels: [
          { id: 'gemini-live-2.5-flash-preview', name: 'Gemini Live 2.5 Flash' }
      ],
  },
  'anthropic': {
      name: 'Anthropic',
      handler: () => require("./providers/anthropic"),
      llmModels: [
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      ],
      sttModels: [],
  },
  'deepgram': {
    name: 'Deepgram',
    handler: () => require("./providers/deepgram"),
    llmModels: [],
    sttModels: [
        { id: 'nova-3', name: 'Nova-3 (General)' },
        ],
    },
  'perplexity': {
    name: 'Perplexity',
    handler: () => require("./providers/perplexity"),
    llmModels: [
        { id: 'sonar', name: 'Sonar (Lightweight Search)' },
        { id: 'sonar-reasoning', name: 'Sonar Reasoning (Fast)' },
        { id: 'sonar-deep-research', name: 'Sonar Deep Research (Expert)' },
    ],
    sttModels: [],
  },

};

function sanitizeModelId(model) {
      return (typeof model === 'string') ? model.replace(/-leviousa$/, '') : model;
}

function createSTT(provider, opts) {
  if (provider === 'openai-leviousa') provider = 'openai';
  
  const handler = PROVIDERS[provider]?.handler();
  if (!handler?.createSTT) {
      throw new Error(`STT not supported for provider: ${provider}`);
  }
  if (opts && opts.model) {
    opts = { ...opts, model: sanitizeModelId(opts.model) };
  }
  return handler.createSTT(opts);
}

function createLLM(provider, opts) {
  if (provider === 'openai-leviousa') provider = 'openai';

  const handler = PROVIDERS[provider]?.handler();
  if (!handler?.createLLM) {
      throw new Error(`LLM not supported for provider: ${provider}`);
  }
  if (opts && opts.model) {
    opts = { ...opts, model: sanitizeModelId(opts.model) };
  }
  return handler.createLLM(opts);
}

function createStreamingLLM(provider, opts) {
  if (provider === 'openai-leviousa') provider = 'openai';
  
  const handler = PROVIDERS[provider]?.handler();
  if (!handler?.createStreamingLLM) {
      throw new Error(`Streaming LLM not supported for provider: ${provider}`);
  }
  if (opts && opts.model) {
    opts = { ...opts, model: sanitizeModelId(opts.model) };
  }
  return handler.createStreamingLLM(opts);
}

function getProviderClass(providerId) {
    const providerConfig = PROVIDERS[providerId];
    if (!providerConfig) return null;
    
    // Handle special cases for leviousa providers
    let actualProviderId = providerId;
    if (providerId === 'openai-leviousa') {
        actualProviderId = 'openai';
    }
    
    // The handler function returns the module, from which we get the class.
    const module = providerConfig.handler();
    
    // Map provider IDs to their actual exported class names
    const classNameMap = {
        'openai': 'OpenAIProvider',
        'anthropic': 'AnthropicProvider',
        'gemini': 'GeminiProvider',
        'deepgram': 'DeepgramProvider',
        'perplexity': 'PerplexityProvider',
        'ollama': 'OllamaProvider',
        'whisper': 'WhisperProvider'
    };
    
    const className = classNameMap[actualProviderId];
    return className ? module[className] : null;
}

function getAvailableProviders() {
  const stt = [];
  const llm = [];
  for (const [id, provider] of Object.entries(PROVIDERS)) {
      if (provider.sttModels.length > 0) stt.push(id);
      if (provider.llmModels.length > 0) llm.push(id);
  }
  return { stt: [...new Set(stt)], llm: [...new Set(llm)] };
}

module.exports = {
  PROVIDERS,
  createSTT,
  createLLM,
  createStreamingLLM,
  getProviderClass,
  getAvailableProviders,
};