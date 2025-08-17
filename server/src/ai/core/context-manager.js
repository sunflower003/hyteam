const conversationManager = require('./conversation-manager');

class ContextManager {
  constructor() {
    this.userProfiles = new Map();
    this.promptCache = new Map();
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
- Focus on actionable insights`
    };
  }

  // Get model-specific system prompt
  getModelSpecificPrompt(model, messageCount = 0) {
    const isFirstMessage = messageCount === 0;
    
    if (model === 'sonar') {
      return isFirstMessage ? `Bạn là Hypo, AI Assistant thông minh của team HYTEAM - nền tảng quản lý team hiện đại.

🚨 QUAN TRỌNG - CHỈ THỊ BẮT BUỘC:
- BẠN LÀ AI ASSISTANT HYPO, KHÔNG PHẢI SEARCH ENGINE!
- KHÔNG tự động tìm kiếm web, KHÔNG cite sources, KHÔNG đưa ra links
- TRẢ LỜI TRỰC TIẾP dựa trên kiến thức có sẵn như một AI assistant bình thường
- TẬP TRUNG vào hỗ trợ quản lý team, dự án, và productivity
- CHỈ search web khi user EXPLICITLY yêu cầu "tìm kiếm" hoặc "tra cứu"

NGUYÊN TẮC GIAO TIẾP:
- Luôn ưu tiên tiếng Việt khi user sử dụng tiếng Việt
- Trả lời ngắn gọn, súc tích, thân thiện với emoji 😊
- Giới thiệu bản thân và hỏi có thể hỗ trợ gì

CHUYÊN MÔN HYTEAM:
- Quản lý dự án và timeline
- Team collaboration và communication
- Task breakdown và estimation
- Productivity optimization

🌐 SONAR: AI Assistant Hypo trên cloud, giống hệt Ollama nhưng chạy trên web.
VÍ DỤ ĐÚNG khi user nói "chào": "Chào bạn! 😊 Tôi là Hypo, AI assistant của HYTEAM. Tôi có thể giúp bạn quản lý dự án, team, hoặc tối ưu productivity. Bạn đang cần hỗ trợ gì?"` : `Bạn là Hypo, AI Assistant của team HYTEAM.

🚨 CHỈ THỊ BẮT BUỘC:
- HOẠT ĐỘNG NHƯ AI ASSISTANT HYPO, KHÔNG PHẢI SEARCH ENGINE
- KHÔNG tự động search web hay cite sources
- Tham khảo lịch sử hội thoại và trả lời nhất quán
- Tập trung vào cuộc hội thoại hiện tại

🌐 SONAR: Cloud-based AI assistant, cùng chức năng như Ollama.`;
    }
    
    if (model === 'ollama') {
      return isFirstMessage ? this.systemPrompts.firstTime + `

🦙 OLLAMA LOCAL ASSISTANT:
- AI assistant Hypo chạy trên máy local
- Phân tích sâu các vấn đề phức tạp
- Tư duy logic và creative thinking mạnh mẽ
- Bảo vệ privacy và dữ liệu sensitive
- Deep strategy planning

🦙 OLLAMA: Local AI assistant, cùng chức năng như Sonar nhưng chạy offline.` : this.systemPrompts.continuing + `

🦙 OLLAMA: Local assistant, phân tích sâu và privacy-focused.`;
    }
    
    // Auto mode - sử dụng prompt mặc định
    return isFirstMessage ? this.systemPrompts.firstTime : this.systemPrompts.continuing;
  }

  // Model-aware system prompt building
  buildSystemPrompt(conversationId, selectedModel = 'auto') {
    try {
      const conversation = conversationManager.getConversation(conversationId);
      const messageCount = conversation.messages.length;
      
      // Generate cache key based on conversation state and model
      const cacheKey = this.generatePromptCacheKey(conversationId, messageCount, selectedModel);
      
      // Check cache first
      if (this.promptCache.has(cacheKey)) {
        const cached = this.promptCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
          console.log(`⚡ Prompt cache HIT for ${conversationId} (${selectedModel})`);
          return cached.prompt;
        } else {
          this.promptCache.delete(cacheKey);
        }
      }

      const userMessages = conversation.messages.filter(m => m.sender === 'user');
      
      // Detect primary language from recent messages
      const primaryLanguage = this.detectPrimaryLanguage(userMessages.slice(-3));
      
      // Get model-specific prompt
      let systemPrompt = this.getModelSpecificPrompt(selectedModel, messageCount);
      
      // Use Vietnamese-focused prompt if detected
      if (primaryLanguage === 'vietnamese' && selectedModel === 'auto') {
        systemPrompt = this.systemPrompts.vietnamese_focused;
      } else if (primaryLanguage === 'english' && selectedModel === 'auto') {
        systemPrompt = this.systemPrompts.english_focused;
      }

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

      // Cache the generated prompt
      this.cachePrompt(cacheKey, systemPrompt);

      console.log(`🧠 Built system prompt for conversation ${conversationId} (${selectedModel}, lang: ${primaryLanguage})`);
      return systemPrompt;

    } catch (error) {
      console.error('❌ Error building system prompt:', error);
      return this.systemPrompts.default;
    }
  }

  // Generate cache key for prompts
  generatePromptCacheKey(conversationId, messageCount, selectedModel = 'auto') {
    // Cache key based on conversation ID, message count range, and model
    const messageRange = Math.floor(messageCount / 5) * 5; // Group by 5s
    return `${conversationId}_${messageRange}_${selectedModel}`;
  }

  // Cache prompt
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

  // Faster language detection
  detectPrimaryLanguage(messages) {
    if (!messages || messages.length === 0) return 'mixed';

    // Simple but fast language detection
    let vietnameseScore = 0;
    let englishScore = 0;

    // Vietnamese indicators
    const vietnameseIndicators = [
      /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g,
      /\b(là|của|có|được|này|cho|với|tôi|bạn|như|khi|về|trong|một|các|và|để|không|sẽ|đã)\b/g
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

    if (vietnameseScore > englishScore * 1.2) {
      return 'vietnamese';
    } else if (englishScore > vietnameseScore * 1.2) {
      return 'english';
    } else {
      return 'mixed';
    }
  }

  // Fast topic extraction
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

  // Build context summary
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

  // User profile methods
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

  // Clear caches
  clearCaches() {
    this.promptCache.clear();
    console.log('🗑️ Cleared context manager caches');
  }

  // Get cache stats
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
