const { OpenAI } = require('openai');

class OpenRouterService {
  constructor() {
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    });
    
    this.defaultModel = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-exp:free";
    this.maxRetries = 3;
    this.baseDelay = 2000;
  }

  async *generateChatResponse(messages, options = {}) {
    const {
      model = this.defaultModel,
      temperature = 0.7,
      maxTokens = 1000,
      stream = true
    } = options;

    console.log(`🤖 OpenRouter Service - Starting generation with model: ${model}`);
    
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not set in environment variables');
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: model,
        messages: messages,
        stream: stream,
        temperature: temperature,
        max_tokens: maxTokens,
      });

      let fullResponse = '';
      let chunkCount = 0;

      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          chunkCount++;
          yield content;
        }
      }

      console.log(`✅ Generation completed: ${chunkCount} chunks, ${fullResponse.length} characters`);
      
    } catch (error) {
      console.error('❌ OpenRouter Service error:', error);
      
      // Enhanced error handling
      const errorMessage = error.message || '';
      const statusCode = error.response?.status || 0;
      
      if (errorMessage.includes('free-models-per-day') ||
          errorMessage.includes('Daily quota exceeded') ||
          errorMessage.includes('quota_exceeded') ||
          statusCode === 429) {
        throw new Error('quota_exceeded');
      }
      
      if (statusCode === 503 || errorMessage.includes('service_unavailable')) {
        throw new Error('model_unavailable');
      }
      
      if (errorMessage.includes('context_length_exceeded')) {
        throw new Error('context_too_long');
      }
      
      throw error;
    }
  }

  async generateSingleResponse(messages, options = {}) {
    const {
      model = this.defaultModel,
      temperature = 0.7,
      maxTokens = 1000
    } = options;

    console.log(`🤖 OpenRouter Service - Single response generation`);

    try {
      const completion = await this.client.chat.completions.create({
        model: model,
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens,
      });

      const response = completion.choices[0]?.message?.content || '';
      console.log(`✅ Single response generated: ${response.length} characters`);
      
      return response;
      
    } catch (error) {
      console.error('❌ Single response error:', error);
      throw error;
    }
  }

  async validateConnection() {
    try {
      const testMessages = [
        { role: "user", content: "Hello, this is a test message." }
      ];
      
      const response = await this.generateSingleResponse(testMessages, {
        maxTokens: 10
      });
      
      return { success: true, response: response };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Keep backward compatibility with existing functions
  async generateOpenRouterChatStream(messages, onChunk) {
    try {
      for await (const chunk of this.generateChatResponse(messages)) {
        if (onChunk) onChunk(chunk);
      }
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
const openRouterService = new OpenRouterService();

module.exports = {
  default: openRouterService,
  OpenRouterService,
  // Keep backward compatibility
  generateOpenRouterChatStream: openRouterService.generateOpenRouterChatStream.bind(openRouterService)
};
