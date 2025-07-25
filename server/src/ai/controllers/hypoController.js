const { generateOpenRouterChatStream } = require('../services/openrouter-service');

// Simple in-memory rate limiting
const lastRequestTime = new Map();
const REQUEST_COOLDOWN = 3000; // 3 seconds between requests per user

// Original chat endpoint (keep for compatibility)
exports.chat = async (req, res) => {
  console.log('=== 🤖 AI CHAT REQUEST START ===');
  
  try {
    const { message } = req.body;
    
    if (!message) {
      console.log('❌ No message in request body');
      return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log('✅ Received message:', message);
    
    const messages = [
      {
        role: "system",
        content: "Bạn là Hypo, AI Assistant của team HYTEAM. Bạn thân thiện, hữu ích và chuyên về quản lý dự án. Hãy trả lời ngắn gọn và hữu ích."
      },
      {
        role: "user", 
        content: message
      }
    ];
    
    console.log('📤 Calling OpenRouter API...');
    const aiReply = await generateOpenRouterChat(messages);
    console.log('📥 AI Reply:', aiReply);
    
    const response = { message: aiReply };
    res.json(response);
    
  } catch (err) {
    console.error('❌ AI ERROR:', err);
    res.status(500).json({ 
      error: 'AI service error', 
      detail: err.message
    });
  }
  
  console.log('=== 🤖 AI CHAT REQUEST END ===');
};

// Enhanced streaming chat endpoint với comprehensive error handling
exports.chatStream = async (req, res) => {
  try {
    const { message } = req.body;
    const userKey = req.ip || 'default';
    
    // Check rate limiting
    const now = Date.now();
    const lastTime = lastRequestTime.get(userKey) || 0;
    
    if (now - lastTime < REQUEST_COOLDOWN) {
      const waitTime = Math.ceil((REQUEST_COOLDOWN - (now - lastTime)) / 1000);
      return res.status(429).json({ 
        error: 'Too many requests', 
        message: `Please wait ${waitTime} seconds before sending another message.`,
        waitTime: waitTime
      });
    }
    
    lastRequestTime.set(userKey, now);
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log('=== 🌊 AI STREAMING REQUEST START ===');
    console.log('✅ Received streaming message:', message);
    
    // Set headers for Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const messages = [
      {
        role: "system",
        content: "Bạn là Hypo, AI Assistant của team HYTEAM. Bạn thân thiện, hữu ích và chuyên về quản lý dự án. Hãy trả lời ngắn gọn và hữu ích."
      },
      {
        role: "user", 
        content: message
      }
    ];

    let responseText = '';
    
    try {
      console.log('📤 Starting streaming response...');
      
      await generateOpenRouterChatStream(messages, (chunk) => {
        responseText += chunk;
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      });

      console.log('✅ Streaming completed');
      res.write(`data: ${JSON.stringify({ type: 'done', fullText: responseText })}\n\n`);
      res.end();

    } catch (streamError) {
      console.error('❌ STREAMING ERROR:', streamError);
      
      // Enhanced error categorization
      let errorType = 'general_error';
      let errorMessage = 'Có lỗi xảy ra. Vui lòng thử lại.';
      
      // Check for specific quota errors
      if (streamError.message?.includes('free-models-per-day') || 
          streamError.message?.includes('Daily quota exceeded') ||
          streamError.message?.includes('quota_exceeded') ||
          streamError.message?.includes('rate limit exceeded for free tier')) {
        errorType = 'quota_exceeded';
        errorMessage = '🚫 AI đã đạt giới hạn requests hôm nay. Sẽ reset vào 7:00 AM mai. Vui lòng thử lại sau!';
        
      } else if (streamError.message?.includes('rate_limit') ||
                 streamError.message?.includes('too_many_requests') ||
                 streamError.response?.status === 429) {
        errorType = 'rate_limited';
        errorMessage = '⏳ Quá nhiều requests. Vui lòng đợi 30 giây trước khi thử lại.';
        
      } else if (streamError.message?.includes('model_unavailable') ||
                 streamError.message?.includes('service_unavailable')) {
        errorType = 'model_unavailable';
        errorMessage = '🔧 AI model tạm thời không khả dụng. Vui lòng thử lại sau.';
        
      } else if (streamError.message?.includes('context_length_exceeded')) {
        errorType = 'context_too_long';
        errorMessage = '📝 Cuộc trò chuyện quá dài. Vui lòng bắt đầu chat mới.';
      }
      
      console.log(`🏷️ Error categorized as: ${errorType}`);
      console.log(`💬 Error message: ${errorMessage}`);
      
      // Send structured error response
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        errorType: errorType,
        message: errorMessage,
        originalError: streamError.message
      })}\n\n`);
      res.end();
    }

  } catch (err) {
    console.error('❌ CONTROLLER ERROR:', err);
    
    // Last resort error handling
    if (!res.headersSent) {
      if (err.response?.status === 429 || err.message?.includes('quota exceeded')) {
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          errorType: 'quota_exceeded',
          message: '🚫 AI đã đạt giới hạn requests hôm nay. Sẽ reset vào 7:00 AM mai. Vui lòng thử lại sau!' 
        })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          errorType: 'general_error',
          message: 'Có lỗi xảy ra. Vui lòng thử lại.' 
        })}\n\n`);
      }
      res.end();
    }
  }
  
  console.log('=== 🌊 AI STREAMING REQUEST END ===');
};
