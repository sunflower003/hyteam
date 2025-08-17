const axios = require('axios');

class OllamaService {
  constructor() {
    this.baseURL = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.defaultModel = process.env.OLLAMA_MODEL || 'llama3:latest';
    this.timeout = 30000;
    this.maxRetries = 3;
    this.baseDelay = 2000;
  }

  // TRUE STREAMING - Real-time response generation
  async *generateChatResponseStream(messages, options = {}) {
    const {
      model = this.defaultModel,
      temperature = 0.7
    } = options;

    console.log(`🌊 Ollama True Streaming - Starting with model: ${model}`);

    try {
      const prompt = this.buildPrompt(messages);
      
      const response = await axios.post(`${this.baseURL}/api/generate`, {
        model: model,
        prompt: prompt,
        stream: true,
        options: {
          temperature: temperature,
          num_predict: 1000
        }
      }, {
        responseType: 'stream',
        timeout: this.timeout
      });

      let buffer = '';
      let chunkCount = 0;
      let totalLength = 0;

      // Process streaming data
      for await (const chunk of response.data) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        
        // Keep incomplete line in buffer
        buffer = lines.pop() || '';
        
        // Process complete JSON lines
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const data = JSON.parse(line);
            
            if (data.response && data.response.length > 0) {
              chunkCount++;
              totalLength += data.response.length;
              yield data.response; // Yield real-time chunk
            }
            
            if (data.done) {
              console.log(`✅ True streaming completed: ${chunkCount} chunks, ${totalLength} chars`);
              return;
            }
          } catch (parseError) {
            // Skip malformed JSON, continue streaming
            continue;
          }
        }
      }
    } catch (error) {
      console.error('❌ True streaming error:', error);
      throw this.handleError(error);
    }
  }

  // Fallback synchronous method
  async generateChatResponseSync(messages, options = {}) {
    const {
      model = this.defaultModel,
      temperature = 0.7
    } = options;

    console.log(`🦙 Ollama Sync - Generating with model: ${model}`);

    try {
      const prompt = this.buildPrompt(messages);
      
      const response = await axios.post(`${this.baseURL}/api/generate`, {
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: temperature,
          num_predict: 1000
        }
      }, {
        timeout: this.timeout
      });

      const result = response.data.response || '';
      console.log(`✅ Sync response generated: ${result.length} characters`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Sync response error:', error);
      throw this.handleError(error);
    }
  }

  buildPrompt(messages) {
    let prompt = '';
    
    for (const message of messages) {
      if (message.role === 'system') {
        prompt += `System: ${message.content}\n\n`;
      } else if (message.role === 'user') {
        prompt += `Human: ${message.content}\n\n`;
      } else if (message.role === 'assistant') {
        prompt += `Assistant: ${message.content}\n\n`;
      }
    }
    
    prompt += 'Assistant: ';
    return prompt;
  }

  handleError(error) {
    if (error.code === 'ECONNREFUSED') {
      const newError = new Error('ollama_not_running');
      newError.originalError = error;
      return newError;
    }
    
    if (error.response?.status === 404) {
      const newError = new Error('model_not_found');
      newError.originalError = error;
      return newError;
    }
    
    if (error.code === 'ETIMEDOUT') {
      const newError = new Error('timeout');
      newError.originalError = error;
      return newError;
    }
    
    return error;
  }

  async validateSetup() {
    try {
      console.log('🔍 Validating Ollama setup...');
      
      const health = await this.validateConnection();
      if (!health.success) {
        console.warn('⚠️ Ollama not running. Please run: ollama serve');
        return false;
      }
      
      const modelExists = await this.isModelAvailable(this.defaultModel);
      if (!modelExists) {
        console.warn(`⚠️ Model ${this.defaultModel} not found. Please run: ollama pull ${this.defaultModel}`);
        return false;
      }
      
      console.log(`✅ Model ${this.defaultModel} is available`);
      return true;
      
    } catch (error) {
      console.error('❌ Setup validation failed:', error);
      return false;
    }
  }

  async validateConnection() {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`, {
        timeout: 5000
      });
      
      return { 
        success: true, 
        models: response.data.models?.length || 0,
        version: response.data.version || 'unknown'
      };
      
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        code: error.code
      };
    }
  }

  async listModels() {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`);
      return response.data.models || [];
    } catch (error) {
      console.error('❌ Error listing models:', error);
      return [];
    }
  }

  async isModelAvailable(modelName) {
    const models = await this.listModels();
    return models.some(model => model.name === modelName);
  }
}

const ollamaService = new OllamaService();

module.exports = {
  default: ollamaService,
  OllamaService
};
