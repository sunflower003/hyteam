const { OpenAI } = require('openai');

class PerplexityService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.PERPLEXITY_API_KEY,
      baseURL: 'https://api.perplexity.ai',
    });
    
    this.defaultModel = process.env.PERPLEXITY_MODEL || 'sonar';
    this.maxRetries = 3;
    this.baseDelay = 2000;
    
    // Available Sonar models - 2025 updated names
    this.sonarModels = {
      'sonar': 'sonar', // Main model (lightweight, cost-effective)
      'sonar-pro': 'sonar-pro', // Pro version
      'sonar-reasoning': 'sonar-reasoning', // Fast reasoning model
      'sonar-deep-research': 'sonar-deep-research' // Expert research model
    };
    
    this.currentModel = this.defaultModel;
  }

  // Get service name for branding
  getServiceName() {
    return 'sonar';
  }

  // Get display name
  getDisplayName() {
    return 'Sonar';
  }

  // Check if service is available
  async isAvailable() {
    try {
      if (!process.env.PERPLEXITY_API_KEY) {
        console.log('[Sonar] API key not configured');
        return false;
      }

      console.log('[Sonar] Checking service availability...');
      
      // Simple test call to verify the service
      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 10,
        stream: false
      });

      const available = response && response.choices && response.choices.length > 0;
      console.log(`[Sonar] Service ${available ? 'available' : 'unavailable'}`);
      return available;
    } catch (error) {
      console.error('[Sonar] Service check failed:', error.message);
      return false;
    }
  }

  // Generate streaming response
  async *generateStream(prompt, options = {}) {
    const model = options.model || this.currentModel;
    const maxTokens = options.maxTokens || 1024;
    const temperature = options.temperature || 0.7;

    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      console.log(`[Sonar] Starting stream with model: ${model}`);
      
      const stream = await this.client.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
        stream: true
      });

      let fullResponse = '';
      
      for await (const chunk of stream) {
        if (chunk.choices?.[0]?.delta?.content) {
          const content = String(chunk.choices[0].delta.content); // Convert to string
          fullResponse += content;
          yield {
            type: 'content',
            content: content,
            model: model,
            service: 'sonar'
          };
        }
      }

      console.log(`[Sonar] Stream completed. Response length: ${fullResponse.length}`);
      
      yield {
        type: 'done',
        content: '',
        model: model,
        service: 'sonar'
      };

    } catch (error) {
      console.error('[Sonar] Stream error:', error);
      yield {
        type: 'error',
        content: `Sonar error: ${error.message}`,
        model: model,
        service: 'sonar'
      };
    }
  }

  // Generate single response (non-streaming)
  async generate(prompt, options = {}) {
    const model = options.model || this.currentModel;
    const maxTokens = options.maxTokens || 1024;
    const temperature = options.temperature || 0.7;

    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      console.log(`[Sonar] Generating response with model: ${model}`);
      
      const response = await this.client.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
        stream: false
      });

      if (response?.choices?.[0]?.message?.content) {
        const content = response.choices[0].message.content;
        console.log(`[Sonar] Response generated. Length: ${content.length}`);
        
        return {
          content: content,
          model: model,
          service: 'sonar',
          citations: response.citations || [],
          search_results: response.search_results || []
        };
      } else {
        throw new Error('No response content received');
      }
    } catch (error) {
      console.error('[Sonar] Generation error:', error);
      throw new Error(`Sonar generation failed: ${error.message}`);
    }
  }

  // Get available models
  getAvailableModels() {
    return Object.keys(this.sonarModels).map(key => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      fullName: this.sonarModels[key],
      service: 'sonar'
    }));
  }

  // Switch model
  async switchModel(modelName) {
    if (this.sonarModels[modelName]) {
      this.currentModel = this.sonarModels[modelName];
      console.log(`[Sonar] Switched to model: ${modelName} (${this.currentModel})`);
      return true;
    } else {
      console.log(`[Sonar] Model ${modelName} not found`);
      return false;
    }
  }

  // Get current model info
  getCurrentModel() {
    const modelKey = Object.keys(this.sonarModels).find(
      key => this.sonarModels[key] === this.currentModel
    ) || 'sonar';
    
    return {
      id: modelKey,
      name: modelKey.charAt(0).toUpperCase() + modelKey.slice(1),
      fullName: this.currentModel,
      service: 'sonar'
    };
  }

  // Validate setup
  async validateSetup() {
    return await this.isAvailable();
  }

  // Validate connection
  async validateConnection() {
    try {
      const available = await this.isAvailable();
      return {
        success: available,
        service: 'sonar',
        model: this.getCurrentModel(),
        timestamp: new Date().toISOString(),
        apiKeyConfigured: !!process.env.PERPLEXITY_API_KEY
      };
    } catch (error) {
      return {
        success: false,
        service: 'sonar',
        error: error.message,
        timestamp: new Date().toISOString(),
        apiKeyConfigured: !!process.env.PERPLEXITY_API_KEY
      };
    }
  }

  // Health check
  async healthCheck() {
    try {
      const available = await this.isAvailable();
      const currentModel = this.getCurrentModel();
      
      return {
        service: 'sonar',
        status: available ? 'online' : 'offline',
        model: currentModel,
        timestamp: new Date().toISOString(),
        apiKeyConfigured: !!process.env.PERPLEXITY_API_KEY
      };
    } catch (error) {
      return {
        service: 'sonar',
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
        apiKeyConfigured: !!process.env.PERPLEXITY_API_KEY
      };
    }
  }

  // Chat with conversation history
  async chat(messages, options = {}) {
    const model = options.model || this.currentModel;
    const maxTokens = options.maxTokens || 1024;
    const temperature = options.temperature || 0.7;

    try {
      console.log(`[Sonar] Chat with ${messages.length} messages using model: ${model}`);
      
      const response = await this.client.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
        stream: false
      });

      if (response?.choices?.[0]?.message?.content) {
        const content = response.choices[0].message.content;
        
        return {
          content: content,
          model: model,
          service: 'sonar',
          citations: response.citations || [],
          search_results: response.search_results || []
        };
      } else {
        throw new Error('No response content received');
      }
    } catch (error) {
      console.error('[Sonar] Chat error:', error);
      throw new Error(`Sonar chat failed: ${error.message}`);
    }
  }

  // Generate chat response stream (for compatibility with controller)
  async *generateChatResponseStream(messages, options = {}) {
    yield* this.chatStream(messages, options);
  }

  // Stream chat with conversation history
  async *chatStream(messages, options = {}) {
    const model = options.model || this.currentModel;
    const maxTokens = options.maxTokens || 1024;
    const temperature = options.temperature || 0.7;

    try {
      console.log(`[Sonar] Chat stream with ${messages.length} messages using model: ${model}`);
      
      const requestOptions = {
        model: model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
        stream: true
      };

      // Add search control parameter to disable automatic web search
      if (model === 'sonar') {
        requestOptions.return_citations = false;
        requestOptions.return_images = false;
        requestOptions.search_domain_filter = [];
        requestOptions.search_recency_filter = "month";
      }
      
      const stream = await this.client.chat.completions.create(requestOptions);

      let fullResponse = '';
      
      for await (const chunk of stream) {
        if (chunk.choices?.[0]?.delta?.content) {
          const content = String(chunk.choices[0].delta.content); // Convert to string
          fullResponse += content;
          yield {
            type: 'content',
            content: content,
            model: model,
            service: 'sonar'
          };
        }
      }

      console.log(`[Sonar] Chat stream completed. Response length: ${fullResponse.length}`);
      
      yield {
        type: 'done',
        content: '',
        model: model,
        service: 'sonar'
      };

    } catch (error) {
      console.error('[Sonar] Chat stream error:', error);
      yield {
        type: 'error',
        content: `Sonar chat error: ${error.message}`,
        model: model,
        service: 'sonar'
      };
    }
  }
}

module.exports = PerplexityService;
module.exports.default = new PerplexityService();
