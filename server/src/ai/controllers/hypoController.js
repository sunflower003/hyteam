const conversationManager = require('../core/conversation-manager');
const contextManager = require('../core/context-manager');
const memoryService = require('../services/memory-service');
const ollamaService = require('../services/ollama-service').default;
const cacheManager = require('../services/cache-manager').default;

// Enhanced rate limiting
const userRateLimit = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // Increased for local Ollama
const REQUEST_COOLDOWN = 500; // Reduced cooldown for better UX

// Main streaming endpoint with cache + true streaming
exports.chatStream = async (req, res) => {
  const startTime = Date.now();
  let conversationId = null;
  
  try {
    const { message, conversationId: clientConversationId } = req.body;
    const userKey = req.ip || 'default';
    
    // Input validation
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ 
        error: 'Valid message is required',
        details: 'Message must be a non-empty string'
      });
    }

    // Enhanced rate limiting
    const now = Date.now();
    const userLimit = userRateLimit.get(userKey) || { requests: [], lastRequest: 0 };
    
    userLimit.requests = userLimit.requests.filter(time => now - time < RATE_LIMIT_WINDOW);
    
    if (userLimit.requests.length >= RATE_LIMIT_MAX_REQUESTS) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Maximum ${RATE_LIMIT_MAX_REQUESTS} requests per minute.`,
        retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - userLimit.requests[0])) / 1000)
      });
    }

    if (now - userLimit.lastRequest < REQUEST_COOLDOWN) {
      const waitTime = Math.ceil((REQUEST_COOLDOWN - (now - userLimit.lastRequest)) / 1000);
      return res.status(429).json({
        error: 'Too many requests',
        message: `Please wait ${waitTime} second before sending another message.`,
        waitTime: waitTime
      });
    }

    userLimit.requests.push(now);
    userLimit.lastRequest = now;
    userRateLimit.set(userKey, userLimit);

    // Get or create conversation
    conversationId = clientConversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('=== 🚀 OPTIMIZED AI STREAMING START ===');
    console.log(`✅ Conversation ID: ${conversationId}`);
    console.log(`✅ Message: ${message.substring(0, 100)}...`);

    // Validate Ollama setup
    if (!(await ollamaService.validateSetup())) {
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
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory
    ];

    console.log(`📋 Prepared ${messages.length} messages for AI`);

    // 🚀 CHECK CACHE FIRST
    const cachedResult = cacheManager.get(messages);
    if (cachedResult) {
      console.log('⚡ CACHE HIT - Serving from cache');
      
      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      // Send cached response as chunks for consistent UX
      const response = cachedResult.response;
      const chunkSize = 30;
      
      for (let i = 0; i < response.length; i += chunkSize) {
        const chunk = response.substring(i, i + chunkSize);
        res.write(`data: ${JSON.stringify({ 
          type: 'chunk', 
          content: chunk,
          conversationId: conversationId,
          fromCache: true,
          chunkIndex: Math.floor(i / chunkSize) + 1
        })}\n\n`);
        
        // Small delay for natural feeling
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      // Save AI response to conversation
      conversationManager.addMessage(conversationId, {
        sender: 'ai',
        text: response
      });

      // Send completion
      res.write(`data: ${JSON.stringify({ 
        type: 'done', 
        fullText: response,
        conversationId: conversationId,
        fromCache: true,
        processingTime: Date.now() - startTime
      })}\n\n`);
      res.end();
      return;
    }

    // 🌊 TRUE STREAMING if not in cache
    console.log('💭 CACHE MISS - Generating new response with true streaming');
    
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    let fullResponse = '';
    let chunkCount = 0;
    
    try {
      console.log('🌊 Starting TRUE streaming response...');
      
      // Use true streaming generator
      for await (const chunk of ollamaService.generateChatResponseStream(messages)) {
        fullResponse += chunk;
        chunkCount++;
        
        // Send real-time chunk
        res.write(`data: ${JSON.stringify({ 
          type: 'chunk', 
          content: chunk,
          conversationId: conversationId,
          chunkIndex: chunkCount,
          fromCache: false
        })}\n\n`);
      }

      console.log(`✅ True streaming completed: ${chunkCount} chunks, ${fullResponse.length} chars`);

      // Save AI response to conversation
      conversationManager.addMessage(conversationId, {
        sender: 'ai',
        text: fullResponse
      });

      // 💾 CACHE THE RESPONSE for future use
      cacheManager.set(messages, fullResponse);

      // Save conversation to memory service
      await memoryService.saveConversation(conversationId, 
        conversationManager.getConversation(conversationId).messages
      );
      
      // Send completion message
      res.write(`data: ${JSON.stringify({ 
        type: 'done', 
        fullText: fullResponse,
        conversationId: conversationId,
        totalChunks: chunkCount,
        processingTime: Date.now() - startTime,
        modelUsed: process.env.OLLAMA_MODEL || 'llama3.2:1b',
        fromCache: false
      })}\n\n`);
      res.end();

    } catch (streamError) {
      console.error('❌ STREAMING ERROR:', streamError);
      
      // Enhanced error handling
      let errorType = 'general_error';
      let errorMessage = 'Có lỗi xảy ra. Vui lòng thử lại.';
      
      const errorString = streamError.message || '';
      
      if (errorString === 'ollama_not_running') {
        errorType = 'ollama_not_running';
        errorMessage = '🦙 Ollama service chưa chạy. Vui lòng start Ollama: ollama serve';
      } else if (errorString === 'model_not_found') {
        errorType = 'model_not_found';
        errorMessage = `🔍 Model không tồn tại. Vui lòng pull model: ollama pull ${process.env.OLLAMA_MODEL}`;
      } else if (errorString.includes('ECONNREFUSED')) {
        errorType = 'connection_failed';
        errorMessage = '🔌 Không thể kết nối Ollama. Kiểm tra service đang chạy.';
      } else if (errorString.includes('timeout')) {
        errorType = 'timeout';
        errorMessage = '⏰ Ollama response timeout. Thử model nhỏ hơn hoặc restart Ollama.';
      }
      
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        errorType: errorType,
        message: errorMessage,
        conversationId: conversationId,
        processingTime: Date.now() - startTime
      })}\n\n`);
      res.end();
    }

  } catch (err) {
    console.error('❌ CONTROLLER ERROR:', err);
    
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

      res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      res.end();
    }
  }
  
  console.log(`=== 🚀 OPTIMIZED AI STREAMING END (${Date.now() - startTime}ms) ===`);
};

// Health check with cache stats
exports.healthCheck = async (req, res) => {
  try {
    const memoryStats = memoryService.getMemoryStats();
    const ollamaHealth = await ollamaService.validateConnection();
    const availableModels = await ollamaService.listModels();
    const cacheStats = cacheManager.getStats();
    
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
        defaultModel: process.env.OLLAMA_MODEL || 'llama3.2:1b',
        cache: cacheStats,
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

// Cache management endpoint
exports.managCache = async (req, res) => {
  try {
    const { action } = req.body;
    
    switch (action) {
      case 'stats':
        res.json({ cache: cacheManager.getStats() });
        break;
        
      case 'clear':
        cacheManager.clear();
        res.json({ message: 'Cache cleared successfully' });
        break;
        
      case 'cleanup':
        const cleaned = cacheManager.cleanup();
        res.json({ message: `Cleaned ${cleaned} expired entries` });
        break;
        
      default:
        res.status(400).json({ error: 'Invalid action. Use: stats, clear, or cleanup' });
    }
    
  } catch (error) {
    console.error('❌ Cache management error:', error);
    res.status(500).json({ error: 'Cache management failed' });
  }
};

// Keep other methods (getConversationHistory, clearConversation) unchanged
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
      cache: cacheManager.getStats()
    });
    
  } catch (error) {
    console.error('❌ Error getting conversation history:', error);
    res.status(500).json({ error: 'Failed to get conversation history' });
  }
};

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
