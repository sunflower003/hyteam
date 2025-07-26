const conversationManager = require('../core/conversation-manager');
const contextManager = require('../core/context-manager');
const memoryService = require('../services/memory-service');
const ollamaService = require('../services/ollama-service').default;

// Enhanced rate limiting
const userRateLimit = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // Tăng lên vì Ollama local
const REQUEST_COOLDOWN = 1000; // Giảm xuống 1 second vì không có external API limit

// Enhanced streaming chat endpoint với Ollama và conversation memory
exports.chatStream = async (req, res) => {
  const startTime = Date.now();
  let conversationId = null;
  
  try {
    const { message, conversationId: clientConversationId } = req.body;
    const userKey = req.ip || 'default';
    
    // Validate input
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ 
        error: 'Valid message is required',
        details: 'Message must be a non-empty string'
      });
    }

    // Enhanced rate limiting (relaxed for local Ollama)
    const now = Date.now();
    const userLimit = userRateLimit.get(userKey) || { requests: [], lastRequest: 0 };
    
    // Clean old requests
    userLimit.requests = userLimit.requests.filter(time => now - time < RATE_LIMIT_WINDOW);
    
    // Check rate limit
    if (userLimit.requests.length >= RATE_LIMIT_MAX_REQUESTS) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Maximum ${RATE_LIMIT_MAX_REQUESTS} requests per minute.`,
        retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - userLimit.requests[0])) / 1000)
      });
    }

    // Check cooldown (reduced for Ollama)
    if (now - userLimit.lastRequest < REQUEST_COOLDOWN) {
      const waitTime = Math.ceil((REQUEST_COOLDOWN - (now - userLimit.lastRequest)) / 1000);
      return res.status(429).json({
        error: 'Too many requests',
        message: `Please wait ${waitTime} second before sending another message.`,
        waitTime: waitTime
      });
    }

    // Update rate limit
    userLimit.requests.push(now);
    userLimit.lastRequest = now;
    userRateLimit.set(userKey, userLimit);

    // Get or create conversation
    conversationId = clientConversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('=== 🦙 OLLAMA STREAMING REQUEST START ===');
    console.log(`✅ Conversation ID: ${conversationId}`);
    console.log(`✅ Message: ${message.substring(0, 100)}...`);

    // Validate Ollama setup
    const setupValid = await ollamaService.validateSetup();
    if (!setupValid) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Ollama service is not properly configured. Please check setup.',
        details: 'Run "ollama serve" and ensure models are pulled'
      });
    }

    // Add user message to conversation
    conversationManager.addMessage(conversationId, {
      sender: 'user',
      text: message.trim()
    });

    // Build context with conversation history
    const conversationHistory = conversationManager.getContext(conversationId);
    const systemPrompt = contextManager.buildSystemPrompt(conversationId);

    // Prepare messages for AI
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory
    ];

    console.log(`📋 Prepared ${messages.length} messages for Ollama (${conversationHistory.length} history + 1 system)`);

    // Set headers for Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    });

    let responseText = '';
    let processingStartTime = Date.now();
    
    try {
      console.log('📤 Starting Ollama response generation...');
      
      // Use Ollama synchronous method for simplicity
      responseText = await ollamaService.generateChatResponseSync(messages, {
        temperature: 0.7
      });

      const processingTime = Date.now() - processingStartTime;
      console.log(`✅ Ollama response completed in ${processingTime}ms: ${responseText.length} characters`);

      // Simulate streaming by sending response in chunks (optional)
      const chunkSize = 50;
      const chunks = [];
      for (let i = 0; i < responseText.length; i += chunkSize) {
        chunks.push(responseText.substring(i, i + chunkSize));
      }

      // Send chunks with small delays to simulate streaming
      for (let i = 0; i < chunks.length; i++) {
        res.write(`data: ${JSON.stringify({ 
          type: 'chunk', 
          content: chunks[i],
          conversationId: conversationId,
          chunkIndex: i + 1,
          totalChunks: chunks.length
        })}\n\n`);
        
        // Small delay between chunks to simulate streaming
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Save AI response to conversation
      conversationManager.addMessage(conversationId, {
        sender: 'ai',
        text: responseText
      });

      // Save conversation to memory service
      await memoryService.saveConversation(conversationId, 
        conversationManager.getConversation(conversationId).messages
      );
      
      // Send completion message
      res.write(`data: ${JSON.stringify({ 
        type: 'done', 
        fullText: responseText,
        conversationId: conversationId,
        totalChunks: chunks.length,
        processingTime: Date.now() - startTime,
        modelUsed: process.env.OLLAMA_MODEL || 'llama3.2:3b'
      })}\n\n`);
      res.end();

    } catch (streamError) {
      console.error('❌ OLLAMA STREAMING ERROR:', streamError);
      
      // Enhanced error categorization for Ollama
      let errorType = 'general_error';
      let errorMessage = 'Có lỗi xảy ra. Vui lòng thử lại.';
      
      const errorString = streamError.message || '';
      
      if (errorString === 'ollama_not_running') {
        errorType = 'ollama_not_running';
        errorMessage = '🦙 Ollama service chưa chạy. Vui lòng start Ollama: ollama serve';
        
      } else if (errorString === 'model_not_found') {
        errorType = 'model_not_found';
        errorMessage = `🔍 Model không tồn tại. Vui lòng pull model: ollama pull ${process.env.OLLAMA_MODEL || 'llama3.2:3b'}`;
        
      } else if (errorString.includes('ECONNREFUSED') || 
                 streamError.code === 'ECONNREFUSED') {
        errorType = 'connection_failed';
        errorMessage = '🔌 Không thể kết nối Ollama. Kiểm tra service đang chạy trên port 11434.';
        
      } else if (errorString.includes('timeout') || 
                 streamError.code === 'ETIMEDOUT') {
        errorType = 'timeout';
        errorMessage = '⏰ Ollama response timeout. Model có thể đang tải hoặc máy chậm.';
        
      } else if (errorString.includes('out of memory') || 
                 errorString.includes('OOM')) {
        errorType = 'out_of_memory';
        errorMessage = '💾 Không đủ RAM để chạy model. Thử model nhỏ hơn như llama3.2:1b';
        
      } else if (errorString.includes('model not loaded')) {
        errorType = 'model_not_loaded';
        errorMessage = '📦 Model chưa được load. Đang tải model, vui lòng thử lại sau...';
      }
      
      console.log(`🏷️ Error categorized as: ${errorType}`);
      console.log(`💬 Error message: ${errorMessage}`);
      
      // Send structured error response
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        errorType: errorType,
        message: errorMessage,
        conversationId: conversationId,
        processingTime: Date.now() - startTime,
        originalError: process.env.NODE_ENV === 'development' ? streamError.message : undefined,
        suggestion: this.getErrorSuggestion(errorType)
      })}\n\n`);
      res.end();
    }

  } catch (err) {
    console.error('❌ CONTROLLER ERROR:', err);
    
    // Last resort error handling
    if (!res.headersSent) {
      const errorResponse = {
        type: 'error',
        errorType: 'general_error',
        message: 'Có lỗi xảy ra. Vui lòng thử lại.',
        processingTime: Date.now() - startTime
      };

      if (conversationId) {
        errorResponse.conversationId = conversationId;
      }

      // Specific handling for common errors
      if (err.code === 'ECONNREFUSED') {
        errorResponse.errorType = 'ollama_connection_failed';
        errorResponse.message = '🦙 Không thể kết nối Ollama. Vui lòng chạy: ollama serve';
      }

      res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      res.end();
    }
  }
  
  console.log(`=== 🦙 OLLAMA STREAMING REQUEST END (${Date.now() - startTime}ms) ===`);
};

// Helper method for error suggestions
exports.getErrorSuggestion = function(errorType) {
  const suggestions = {
    'ollama_not_running': 'Chạy lệnh: ollama serve',
    'model_not_found': 'Chạy lệnh: ollama pull llama3.2:3b',
    'connection_failed': 'Kiểm tra Ollama đang chạy trên localhost:11434',
    'timeout': 'Thử model nhỏ hơn hoặc tăng RAM',
    'out_of_memory': 'Thử model nhỏ hơn: ollama pull llama3.2:1b',
    'model_not_loaded': 'Đợi model load xong, thường mất 30-60 giây lần đầu'
  };
  
  return suggestions[errorType] || 'Kiểm tra logs để biết thêm chi tiết';
};

// Original chat endpoint (deprecated but kept for compatibility)
exports.chat = async (req, res) => {
  console.log('=== 🤖 LEGACY CHAT REQUEST START ===');
  
  try {
    const { message, conversationId } = req.body;
    
    if (!message) {
      console.log('❌ No message in request body');
      return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log('✅ Received message:', message);
    
    // Check Ollama setup
    const setupValid = await ollamaService.validateSetup();
    if (!setupValid) {
      return res.status(503).json({ 
        error: 'Ollama service unavailable',
        message: 'Please ensure Ollama is running and models are available'
      });
    }
    
    // Use conversation context if available
    let messages;
    if (conversationId) {
      const conversationHistory = conversationManager.getContext(conversationId);
      const systemPrompt = contextManager.buildSystemPrompt(conversationId);
      
      messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory
      ];
    } else {
      messages = [
        {
          role: "system",
          content: "Bạn là Hypo, AI Assistant của team HYTEAM. Bạn thân thiện, hữu ích và chuyên về quản lý dự án. Hãy trả lời ngắn gọn và hữu ích."
        },
        { role: "user", content: message }
      ];
    }
    
    console.log('📤 Calling Ollama service...');
    const aiReply = await ollamaService.generateChatResponseSync(messages);
    console.log('📥 Ollama Reply:', aiReply);
    
    const response = { 
      message: aiReply,
      conversationId: conversationId || 'legacy',
      model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
      service: 'ollama'
    };
    res.json(response);
    
  } catch (err) {
    console.error('❌ OLLAMA ERROR:', err);
    
    let errorMessage = 'AI service error';
    let statusCode = 500;
    
    if (err.message === 'ollama_not_running') {
      errorMessage = 'Ollama service is not running';
      statusCode = 503;
    } else if (err.message === 'model_not_found') {
      errorMessage = 'Requested model is not available';
      statusCode = 404;
    }
    
    res.status(statusCode).json({ 
      error: errorMessage, 
      detail: err.message,
      suggestion: this.getErrorSuggestion(err.message)
    });
  }
  
  console.log('=== 🤖 LEGACY CHAT REQUEST END ===');
};

// New endpoint to get conversation history
exports.getConversationHistory = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 20 } = req.query;
    
    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }
    
    const history = await memoryService.getConversationHistory(conversationId, parseInt(limit));
    const summary = contextManager.buildContextSummary(conversationId);
    
    res.json({
      ...history,
      summary: summary,
      stats: conversationManager.getConversationSummary(conversationId),
      service: 'ollama',
      model: process.env.OLLAMA_MODEL || 'llama3.2:3b'
    });
    
  } catch (error) {
    console.error('❌ Error getting conversation history:', error);
    res.status(500).json({ error: 'Failed to get conversation history' });
  }
};

// New endpoint to clear conversation
exports.clearConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }
    
    const success = await memoryService.clearConversation(conversationId);
    
    if (success) {
      res.json({ 
        message: 'Conversation cleared successfully', 
        conversationId,
        service: 'ollama'
      });
    } else {
      res.status(404).json({ error: 'Conversation not found' });
    }
    
  } catch (error) {
    console.error('❌ Error clearing conversation:', error);
    res.status(500).json({ error: 'Failed to clear conversation' });
  }
};

// Health check endpoint with Ollama validation
exports.healthCheck = async (req, res) => {
  try {
    const memoryStats = memoryService.getMemoryStats();
    const ollamaHealth = await ollamaService.validateConnection();
    const availableModels = await ollamaService.listModels();
    
    const systemStats = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
    
    const healthStatus = {
      status: ollamaHealth.success ? 'healthy' : 'degraded',
      ai: {
        service: 'ollama',
        connection: ollamaHealth.success ? 'connected' : 'disconnected',
        models: availableModels.length,
        defaultModel: process.env.OLLAMA_MODEL || 'llama3.2:3b',
        modelList: availableModels.map(m => m.name),
        memory: memoryStats,
        system: systemStats
      }
    };
    
    const statusCode = ollamaHealth.success ? 200 : 503;
    res.status(statusCode).json(healthStatus);
    
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({ 
      status: 'unhealthy', 
      service: 'ollama',
      error: error.message 
    });
  }
};

// New endpoint to manage Ollama models
exports.manageModels = async (req, res) => {
  try {
    const { action, modelName } = req.body;
    
    switch (action) {
      case 'list':
        const models = await ollamaService.listModels();
        res.json({ models });
        break;
        
      case 'pull':
        if (!modelName) {
          return res.status(400).json({ error: 'Model name is required for pull action' });
        }
        
        const pullSuccess = await ollamaService.pullModel(modelName);
        if (pullSuccess) {
          res.json({ message: `Model ${modelName} pulled successfully` });
        } else {
          res.status(500).json({ error: `Failed to pull model ${modelName}` });
        }
        break;
        
      case 'check':
        if (!modelName) {
          return res.status(400).json({ error: 'Model name is required for check action' });
        }
        
        const exists = await ollamaService.isModelAvailable(modelName);
        res.json({ modelName, available: exists });
        break;
        
      default:
        res.status(400).json({ error: 'Invalid action. Use: list, pull, or check' });
    }
    
  } catch (error) {
    console.error('❌ Model management error:', error);
    res.status(500).json({ error: 'Model management failed' });
  }
};

// Stats endpoint for monitoring
exports.getStats = async (req, res) => {
  try {
    const memoryStats = memoryService.getMemoryStats();
    const ollamaHealth = await ollamaService.validateConnection();
    
    const stats = {
      service: 'ollama',
      model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
      connection: ollamaHealth.success,
      uptime: process.uptime(),
      memory: memoryStats,
      rateLimiting: {
        maxRequestsPerMinute: RATE_LIMIT_MAX_REQUESTS,
        cooldownMs: REQUEST_COOLDOWN,
        activeUsers: userRateLimit.size
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(stats);
    
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
};
