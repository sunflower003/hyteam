const conversationManager = require('./conversation-manager');

class ContextManager {
  constructor() {
    this.userProfiles = new Map();
    this.promptCache = new Map(); // 🆕 Cache cho system prompts
    this.maxCacheSize = 50;
    this.systemPrompts = {
      default: `Bạn là Hypo, AI Assistant thông minh của team HYTEAM - nền tảng quản lý team hiện đại.

NGUYÊN TẮC GIAO TIẾP:
- Luôn ưu tiên tiếng Việt khi user sử dụng tiếng Việt
- Chỉ dùng tiếng Anh khi user chủ động nói tiếng Anh
- Trả lời ngắn gọn, súc tích nhưng đầy đủ thông tin
- Sử dụng emoji phù hợp để tạo cảm giác thân thiện 😊
- Nhớ và tham khảo context cuộc hội thoại để trả lời nhất quán

CHUYÊN MÔN:
- Quản lý dự án và timeline
- Team management và collaboration  
- Task breakdown và estimation
- Risk analysis và mitigation
- Productivity optimization
- Agile/Scrum methodologies

PHONG CÁCH:
- Thân thiện, professional nhưng gần gũi
- Đưa ra gợi ý thực tế, có thể áp dụng ngay
- Giải thích rõ ràng, dễ hiểu
- Hỏi lại khi cần làm rõ yêu cầu`,

      continuing: `Bạn là Hypo, AI Assistant của team HYTEAM.

NGUYÊN TẮC TIẾP TỤC HỘI THOẠI:
- Luôn dùng ngôn ngữ chính user đã sử dụng (Việt/Anh)
- Tham khảo lịch sử hội thoại để trả lời phù hợp và nhất quán
- KHÔNG lặp lại thông tin đã nói, thay vào đó mở rộng hoặc làm rõ thêm
- Thể hiện bạn nhớ những gì đã thảo luận trước đó
- Kết nối câu trả lời với context đã có

VÍ DỤ CÁCH NÓI:
- "Như tôi đã đề cập trước đó về..."
- "Tiếp tục từ vấn đề [X] chúng ta vừa bàn..."
- "Dựa trên thông tin bạn cung cấp lúc nãy..."`,

      firstTime: `Bạn là Hypo, AI Assistant của team HYTEAM.

CHÀO ĐÓN LẦN ĐẦU:
- Phát hiện ngôn ngữ user sử dụng và phản hồi bằng ngôn ngữ đó
- Giới thiệu bản thân ngắn gọn, thân thiện
- Hỏi xem có thể hỗ trợ gì để tạo sự tương tác
- Không quá dài dòng, tập trung vào việc sẵn sàng hỗ trợ

NGÔN NGỮ TIẾNG VIỆT ĐƯỢC ƯU TIÊN khi user nói tiếng Việt.`,

      vietnamese_focused: `Bạn là Hypo, AI Assistant của HYTEAM.

QUAN TRỌNG: User đang sử dụng tiếng Việt, bạn PHẢI trả lời bằng tiếng Việt hoàn toàn.

- Sử dụng từ ngữ tiếng Việt thuần túy
- Tránh lẫn lộn tiếng Anh không cần thiết  
- Giải thích thuật ngữ kỹ thuật bằng tiếng Việt
- Emoji và cách diễn đạt phù hợp văn hóa Việt Nam
- Thể hiện sự am hiểu về môi trường làm việc Việt Nam`,

      english_focused: `You are Hypo, AI Assistant for HYTEAM.

IMPORTANT: User is communicating in English, respond in English.

- Use clear, professional English
- Provide practical advice for project management
- Maintain friendly but professional tone
- Use relevant emojis appropriately
- Focus on actionable insights`,

      // 🆕 Optimized prompt for faster processing
      speed_optimized: `Bạn là Hypo, AI Assistant của HYTEAM. 

🚀 ĐÃ TỐI ỰU TỐC ĐỘ:
- Trả lời ngắn gọn, đi thẳng vào vấn đề
- Tránh lặp lại, tập trung vào thông tin mới
- Sử dụng tiếng Việt thuần túy khi user dùng tiếng Việt

Chuyên môn: Quản lý dự án, team work, productivity.`,

      // 🌐 Sonar-optimized prompt for real-time web search
      sonar_online: `Bạn là Hypo, AI Assistant thông minh với khả năng tìm kiếm web real-time của team HYTEAM.

🌐 SONAR ONLINE CAPABILITIES:
- Tích hợp thông tin web real-time và cập nhật
- Kết hợp kiến thức từ internet với expertise về quản lý dự án
- Cung cấp thông tin mới nhất về công nghệ, tools, trends
- So sánh và đánh giá các giải pháp hiện có trên thị trường

NGUYÊN TẮC:
- Ưu tiên tiếng Việt khi user sử dụng tiếng Việt
- Kết hợp thông tin web với chuyên môn HYTEAM
- Cite sources khi cần thiết
- Đưa ra insights thực tế, cập nhật

CHUYÊN MÔN + WEB SEARCH:
- Project management tools và best practices mới nhất
- Tech trends và emerging technologies
- Market research và competitor analysis
- Real-time data và statistics
- Current events ảnh hưởng đến business`,

      // 💬 Sonar chat-optimized for pure conversation
      sonar_chat: `Bạn là Hypo, AI Assistant chuyên về hội thoại của team HYTEAM.

💬 SONAR CHAT FOCUS:
- Tập trung vào hội thoại tự nhiên, không cần web search
- Sử dụng kiến thức training data để tư vấn chuyên sâu
- Phân tích và giải quyết vấn đề dựa trên context
- Brainstorming và creative thinking

PHONG CÁCH:
- Thân thiện, conversational
- Deep thinking và analytical
- Practical advice based on proven methods
- Encourage collaboration và teamwork

Chuyên môn: Quản lý dự án, leadership, team dynamics, productivity.`
    };
  }

  // 🆕 IMPROVED: Cached system prompt building
  buildSystemPrompt(conversationId) {
    try {
      const conversation = conversationManager.getConversation(conversationId);
      const messageCount = conversation.messages.length;
      
      // 🚀 Generate cache key based on conversation state
      const cacheKey = this.generatePromptCacheKey(conversationId, messageCount);
      
      // Check cache first
      if (this.promptCache.has(cacheKey)) {
        const cached = this.promptCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
          console.log(`⚡ Prompt cache HIT for ${conversationId}`);
          return cached.prompt;
        } else {
          this.promptCache.delete(cacheKey);
        }
      }

      const userMessages = conversation.messages.filter(m => m.sender === 'user');
      
      // Detect primary language from recent messages
      const primaryLanguage = this.detectPrimaryLanguage(userMessages.slice(-3));
      let promptType = this.selectPromptType(messageCount, primaryLanguage);

      let systemPrompt = this.systemPrompts[promptType];

      // Add conversation context
      if (userMessages.length > 0) {
        const recentTopics = this.extractTopics(userMessages.slice(-3));
        if (recentTopics.length > 0) {
          const topicsText = primaryLanguage === 'vietnamese' 
            ? `\n\nChủ đề gần đây: ${recentTopics.join(', ')}`
            : `\n\nRecent topics: ${recentTopics.join(', ')}`;
          systemPrompt += topicsText;
        }
      }

      // Add conversation stats (simplified for speed)
      if (messageCount > 5) {
        const statsText = primaryLanguage === 'vietnamese'
          ? `\n\nCuộc trò chuyện: ${messageCount} tin nhắn.`
          : `\n\nConversation: ${messageCount} messages.`;
        systemPrompt += statsText;
      }

      // Add language preference reminder
      if (primaryLanguage === 'vietnamese') {
        systemPrompt += `\n\n⚠️ QUAN TRỌNG: Trả lời hoàn toàn bằng tiếng Việt.`;
      } else if (primaryLanguage === 'english') {
        systemPrompt += `\n\n⚠️ IMPORTANT: Respond entirely in English.`;
      }

      // 💾 Cache the generated prompt
      this.cachePrompt(cacheKey, systemPrompt);

      console.log(`🧠 Built system prompt for conversation ${conversationId} (${promptType}, lang: ${primaryLanguage})`);
      return systemPrompt;

    } catch (error) {
      console.error('❌ Error building system prompt:', error);
      return this.systemPrompts.default;
    }
  }

  // 🆕 Generate cache key for prompts
  generatePromptCacheKey(conversationId, messageCount) {
    // Cache key based on conversation ID and message count range
    const messageRange = Math.floor(messageCount / 5) * 5; // Group by 5s
    return `${conversationId}_${messageRange}`;
  }

  // 🆕 Cache prompt
  cachePrompt(key, prompt) {
    // Implement LRU eviction
    if (this.promptCache.size >= this.maxCacheSize) {
      const oldestKey = this.promptCache.keys().next().value;
      this.promptCache.delete(oldestKey);
    }

    this.promptCache.set(key, {
      prompt,
      timestamp: Date.now()
    });
  }

  // 🆕 IMPROVED: Faster prompt type selection with Sonar model awareness
  selectPromptType(messageCount, primaryLanguage) {
    // Check if we're using Perplexity Sonar models
    const perplexityService = require('../services/perplexity-service').default;
    const currentModel = perplexityService.defaultModel;
    
    if (currentModel && currentModel.includes('sonar')) {
      if (currentModel.includes('online')) {
        // Use web-search optimized prompt for online models
        return 'sonar_online';
      } else if (currentModel.includes('chat')) {
        // Use conversation-optimized prompt for chat models
        return 'sonar_chat';
      }
    }
    
    // Fallback to original logic
    if (messageCount === 0) {
      return 'firstTime';
    } else if (messageCount > 10) {
      // Use speed-optimized prompt for long conversations
      return 'speed_optimized';
    } else if (primaryLanguage === 'vietnamese' && messageCount > 0) {
      return 'vietnamese_focused';
    } else if (primaryLanguage === 'english' && messageCount > 0) {
      return 'english_focused';
    } else if (messageCount > 2) {
      return 'continuing';
    }
    return 'default';
  }

  // 🆕 OPTIMIZED: Faster language detection with caching
  detectPrimaryLanguage(messages) {
    if (!messages || messages.length === 0) return 'mixed';

    // Simple but fast language detection
    let vietnameseScore = 0;
    let englishScore = 0;

    // Optimized Vietnamese indicators
    const vietnameseIndicators = [
      /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g,
      /\b(là|của|có|được|này|cho|với|tôi|bạn|như|khi|về|trong|một|các|và|để|không|sẽ|đã)\b/g,
      /\b(dự án|công việc|nhóm|team|làm việc|quản lý|thời gian|chào|cảm ơn|vậy|rồi)\b/g
    ];

    const englishIndicators = [
      /\b(the|and|is|are|was|were|have|has|had|will|would|could|should|can|may|might)\b/gi,
      /\b(project|team|work|manage|time|task|meeting|development|github)\b/gi
    ];

    messages.forEach(msg => {
      const text = msg.text.toLowerCase();
      
      vietnameseIndicators.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) vietnameseScore += matches.length;
      });

      englishIndicators.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) englishScore += matches.length;
      });
    });

    console.log(`🔍 Language detection - VN: ${vietnameseScore}, EN: ${englishScore}`);

    if (vietnameseScore > englishScore * 1.2) {
      return 'vietnamese';
    } else if (englishScore > vietnameseScore * 1.2) {
      return 'english';
    } else {
      return 'mixed';
    }
  }

  // 🆕 OPTIMIZED: Faster topic extraction
  extractTopics(messages) {
    if (!messages || messages.length === 0) return [];

    const topics = new Set();
    
    // Simplified topic detection for speed
    const topicPatterns = {
      'dự án': /dự án|project|kế hoạch|plan/gi,
      'nhóm': /team|nhóm|thành viên|member/gi,
      'công việc': /task|công việc|nhiệm vụ|job|work/gi,
      'deadline': /deadline|hạn chót|thời hạn|due date/gi,
      'họp': /meeting|họp|cuộc họp|gặp mặt/gi,
      'phát triển': /development|phát triển|code|lập trình/gi,
      'github': /github|git|repository|repo/gi,
      'quản lý': /quản lý|management|manage|điều hành/gi
    };

    const combinedText = messages.map(m => m.text).join(' ').toLowerCase();

    Object.entries(topicPatterns).forEach(([topic, pattern]) => {
      if (pattern.test(combinedText)) {
        topics.add(topic);
      }
    });

    return Array.from(topics).slice(0, 5); // Limit to 5 topics for speed
  }

  // 🆕 Simplified entity extraction for performance
  extractEntities(message) {
    const entities = {
      dates: [],
      times: [],
      people: []
    };

    // Simplified patterns for better performance
    const patterns = {
      dates: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi,
      times: /\b\d{1,2}:\d{2}\b/gi,
      people: /@([a-zA-Z0-9_]+)/g
    };

    Object.entries(patterns).forEach(([type, pattern]) => {
      const matches = message.match(pattern) || [];
      entities[type] = matches.slice(0, 3); // Limit results for speed
    });

    return entities;
  }

  // 🆕 OPTIMIZED: Faster context summary
  buildContextSummary(conversationId) {
    try {
      const conversation = conversationManager.getConversation(conversationId);
      const messages = conversation.messages;
      
      if (messages.length === 0) {
        return "Cuộc trò chuyện mới bắt đầu.";
      }

      const userMessages = messages.filter(m => m.sender === 'user');
      if (userMessages.length === 0) {
        return "Chưa có tin nhắn từ user.";
      }

      const lastUserMessage = userMessages[userMessages.length - 1];
      const language = this.detectPrimaryLanguage(userMessages.slice(-2));
      
      // Simplified summary for better performance
      if (language === 'english') {
        return `Conversation: ${messages.length} messages. Latest: "${lastUserMessage.text.substring(0, 30)}..."`;
      } else {
        return `Cuộc trò chuyện: ${messages.length} tin nhắn. Gần nhất: "${lastUserMessage.text.substring(0, 30)}..."`;
      }

    } catch (error) {
      console.error('❌ Error building context summary:', error);
      return "Không thể tạo tóm tắt ngữ cảnh.";
    }
  }

  // Keep existing methods
  updateUserProfile(userId, data) {
    if (!this.userProfiles.has(userId)) {
      this.userProfiles.set(userId, {
        id: userId,
        preferences: {},
        topics: new Set(),
        lastSeen: new Date(),
        messageCount: 0,
        preferredLanguage: 'mixed'
      });
    }

    const profile = this.userProfiles.get(userId);
    Object.assign(profile, data);
    profile.lastSeen = new Date();
    profile.messageCount += 1;

    return profile;
  }

  getUserProfile(userId) {
    return this.userProfiles.get(userId) || null;
  }

  // 🆕 Clear caches
  clearCaches() {
    this.promptCache.clear();
    console.log('🗑️ Cleared context manager caches');
  }

  // 🆕 Get cache stats
  getCacheStats() {
    return {
      promptCacheSize: this.promptCache.size,
      promptCacheMax: this.maxCacheSize,
      userProfilesCount: this.userProfiles.size
    };
  }

  async validateSetup() {
    return true;
  }
}

module.exports = new ContextManager();
