const axios = require('axios');

class OllamaService {
  constructor() {
    this.baseURL = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.defaultModel = process.env.OLLAMA_MODEL || 'llama3:latest';
    this.timeout = 30000; // 30 seconds
    this.maxRetries = 3;
    this.baseDelay = 2000;
  }

  // Streaming generator method (advanced)
  async *generateChatResponse(messages, options = {}) {
    const {
      model = this.defaultModel,
      temperature = 0.7,
      stream = true
    } = options;

    console.log(`🦙 Ollama Service - Starting generation with model: ${model}`);

    try {
      const prompt = this.buildPrompt(messages);
      
      const response = await axios.post(`${this.baseURL}/api/generate`, {
        model: model,
        prompt: prompt,
        stream: stream,
        options: {
          temperature: temperature,
          num_predict: 1000
        }
      }, {
        responseType: 'stream',
        timeout: this.timeout
      });

      let fullResponse = '';
      let chunkCount = 0;

      return new Promise((resolve, reject) => {
        const chunks = [];
        
        response.data.on('data', (chunk) => {
          const lines = chunk.toString().split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              
              if (data.response) {
                fullResponse += data.response;
                chunkCount++;
                chunks.push(data.response);
              }
              
              if (data.done) {
                console.log(`✅ Ollama generation completed: ${chunkCount} chunks, ${fullResponse.length} characters`);
                // Return iterator for chunks
                resolve(chunks[Symbol.iterator]());
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete JSON
            }
          }
        });

        response.data.on('error', (error) => {
          console.error('❌ Ollama stream error:', error);
          reject(this.handleError(error));
        });
      });

    } catch (error) {
      console.error('❌ Ollama Service error:', error);
      throw this.handleError(error);
    }
  }

  // Synchronous method (simple but complete)
  async generateChatResponseSync(messages, options = {}) {
    const {
      model = this.defaultModel,
      temperature = 0.7
    } = options;

    console.log(`🦙 Ollama Service - Single response generation with model: ${model}`);

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
      console.log(`✅ Ollama single response generated: ${result.length} characters`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Ollama single response error:', error);
      throw this.handleError(error);
    }
  }

  // Build prompt from OpenAI format
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

  // Error handling with specific Ollama errors
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
    
    if (error.message?.includes('out of memory') || error.message?.includes('OOM')) {
      const newError = new Error('out_of_memory');
      newError.originalError = error;
      return newError;
    }
    
    return error;
  }

  // Model management
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

  async pullModel(modelName) {
    try {
      console.log(`📥 Pulling model: ${modelName}`);
      
      const response = await axios.post(`${this.baseURL}/api/pull`, {
        name: modelName
      }, {
        timeout: 600000 // 10 minutes for model download
      });
      
      console.log(`✅ Model ${modelName} pulled successfully`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error pulling model ${modelName}:`, error);
      return false;
    }
  }

  async deleteModel(modelName) {
    try {
      console.log(`🗑️ Deleting model: ${modelName}`);
      
      await axios.delete(`${this.baseURL}/api/delete`, {
        data: { name: modelName }
      });
      
      console.log(`✅ Model ${modelName} deleted successfully`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error deleting model ${modelName}:`, error);
      return false;
    }
  }

  // Health check and validation
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

  async validateSetup() {
    try {
      console.log('🔍 Validating Ollama setup...');
      
      // Check if Ollama is running
      const health = await this.validateConnection();
      if (!health.success) {
        console.warn('⚠️ Ollama not running. Please run: ollama serve');
        return false;
      }
      
      console.log(`✅ Ollama connected. Found ${health.models} models.`);
      
      // Check if default model exists
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

  // Performance and monitoring
  async getModelInfo(modelName) {
    try {
      const response = await axios.post(`${this.baseURL}/api/show`, {
        name: modelName
      });
      
      return response.data;
      
    } catch (error) {
      console.error(`❌ Error getting model info for ${modelName}:`, error);
      return null;
    }
  }

  async getSystemInfo() {
    try {
      // This endpoint might not exist in all Ollama versions
      const response = await axios.get(`${this.baseURL}/api/ps`);
      return response.data;
    } catch (error) {
      console.warn('⚠️ System info not available:', error.message);
      return null;
    }
  }

  // Retry mechanism with exponential backoff
  async retryWithBackoff(fn, maxRetries = this.maxRetries) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (error.message === 'ollama_not_running' || 
            error.message === 'model_not_found' ||
            attempt === maxRetries) {
          throw error;
        }
        
        const delay = this.baseDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Attempt ${attempt} failed, waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Advanced prompt engineering
  async generateWithCustomPrompt(customPrompt, options = {}) {
    const {
      model = this.defaultModel,
      temperature = 0.7,
      maxTokens = 1000
    } = options;

    try {
      const response = await axios.post(`${this.baseURL}/api/generate`, {
        model: model,
        prompt: customPrompt,
        stream: false,
        options: {
          temperature: temperature,
          num_predict: maxTokens
        }
      }, {
        timeout: this.timeout
      });

      return response.data.response || '';
      
    } catch (error) {
      console.error('❌ Custom prompt generation error:', error);
      throw this.handleError(error);
    }
  }

  // Embeddings (if supported by model)
  async generateEmbeddings(text, model = 'nomic-embed-text') {
    try {
      const response = await axios.post(`${this.baseURL}/api/embeddings`, {
        model: model,
        prompt: text
      });

      return response.data.embedding;
      
    } catch (error) {
      console.error('❌ Embeddings generation error:', error);
      throw this.handleError(error);
    }
  }

  // Batch processing
  async generateBatch(prompts, options = {}) {
    const results = [];
    const {
      model = this.defaultModel,
      temperature = 0.7,
      concurrent = 3 // Limit concurrent requests
    } = options;

    console.log(`🔄 Processing ${prompts.length} prompts in batches of ${concurrent}`);

    for (let i = 0; i < prompts.length; i += concurrent) {
      const batch = prompts.slice(i, i + concurrent);
      const batchPromises = batch.map(prompt => 
        this.generateWithCustomPrompt(prompt, { model, temperature })
      );

      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        console.log(`✅ Completed batch ${Math.floor(i/concurrent) + 1}/${Math.ceil(prompts.length/concurrent)}`);
        
        // Small delay between batches to avoid overwhelming Ollama
        if (i + concurrent < prompts.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ Batch ${Math.floor(i/concurrent) + 1} failed:`, error);
        results.push(...batch.map(() => null)); // Add nulls for failed batch
      }
    }

    return results;
  }

  // Configuration management
  getConfig() {
    return {
      baseURL: this.baseURL,
      defaultModel: this.defaultModel,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      baseDelay: this.baseDelay
    };
  }

  updateConfig(newConfig) {
    if (newConfig.baseURL) this.baseURL = newConfig.baseURL;
    if (newConfig.defaultModel) this.defaultModel = newConfig.defaultModel;
    if (newConfig.timeout) this.timeout = newConfig.timeout;
    if (newConfig.maxRetries) this.maxRetries = newConfig.maxRetries;
    if (newConfig.baseDelay) this.baseDelay = newConfig.baseDelay;
    
    console.log('🔧 Ollama service configuration updated:', this.getConfig());
  }

  // Performance monitoring
  async benchmarkModel(modelName = this.defaultModel, iterations = 3) {
    const testPrompt = "Explain quantum computing in simple terms.";
    const results = [];

    console.log(`📊 Benchmarking model ${modelName} with ${iterations} iterations...`);

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      
      try {
        const response = await this.generateWithCustomPrompt(testPrompt, { model: modelName });
        const duration = Date.now() - start;
        const tokensPerSecond = response.length / (duration / 1000);
        
        results.push({
          iteration: i + 1,
          duration,
          responseLength: response.length,
          tokensPerSecond: Math.round(tokensPerSecond)
        });
        
        console.log(`  Iteration ${i + 1}: ${duration}ms, ${response.length} chars, ~${Math.round(tokensPerSecond)} tokens/sec`);
        
      } catch (error) {
        console.error(`  Iteration ${i + 1} failed:`, error.message);
        results.push({
          iteration: i + 1,
          error: error.message
        });
      }
    }

    const successful = results.filter(r => !r.error);
    const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
    const avgTokensPerSecond = successful.reduce((sum, r) => sum + r.tokensPerSecond, 0) / successful.length;

    const benchmark = {
      model: modelName,
      iterations,
      successful: successful.length,
      failed: iterations - successful.length,
      averageDuration: Math.round(avgDuration),
      averageTokensPerSecond: Math.round(avgTokensPerSecond),
      results
    };

    console.log(`📊 Benchmark complete:`, benchmark);
    return benchmark;
  }
}

// Export singleton instance
const ollamaService = new OllamaService();

module.exports = {
  default: ollamaService,
  OllamaService
};
