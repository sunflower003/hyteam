const conversationManager = require('./conversation-manager');

class ContextManager {
  constructor() {
    this.userProfiles = new Map();
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

  buildSystemPrompt(conversationId) {
    try {
      const conversation = conversationManager.getConversation(conversationId);
      const messageCount = conversation.messages.length;
      const userMessages = conversation.messages.filter(m => m.sender === 'user');
      
      // Detect primary language from recent messages
      const primaryLanguage = this.detectPrimaryLanguage(userMessages.slice(-3));
      let promptType = 'default';
      
      if (messageCount === 0) {
        promptType = 'firstTime';
      } else if (messageCount > 2) {
        promptType = 'continuing';
      }

      // Override with language-specific prompt if detected
      if (primaryLanguage === 'vietnamese' && messageCount > 0) {
        promptType = 'vietnamese_focused';
      } else if (primaryLanguage === 'english' && messageCount > 0) {
        promptType = 'english_focused';
      }

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

      // Add conversation stats
      if (messageCount > 5) {
        const statsText = primaryLanguage === 'vietnamese'
          ? `\n\nBạn đã trò chuyện ${messageCount} tin nhắn với user này.`
          : `\n\nYou have exchanged ${messageCount} messages with this user.`;
        systemPrompt += statsText;
      }

      // Add language preference reminder
      if (primaryLanguage === 'vietnamese') {
        systemPrompt += `\n\n⚠️ QUAN TRỌNG: User đang dùng tiếng Việt, bạn PHẢI trả lời hoàn toàn bằng tiếng Việt.`;
      } else if (primaryLanguage === 'english') {
        systemPrompt += `\n\n⚠️ IMPORTANT: User is using English, respond entirely in English.`;
      }

      console.log(`🧠 Built system prompt for conversation ${conversationId} (${promptType}, lang: ${primaryLanguage})`);
      return systemPrompt;

    } catch (error) {
      console.error('❌ Error building system prompt:', error);
      return this.systemPrompts.default;
    }
  }

  // NEW: Language detection method
  detectPrimaryLanguage(messages) {
    if (!messages || messages.length === 0) return 'mixed';

    let vietnameseScore = 0;
    let englishScore = 0;
    let totalChars = 0;

    const vietnameseKeywords = [
      'là', 'của', 'có', 'được', 'này', 'cho', 'với', 'tôi', 'bạn', 'như',
      'khi', 'về', 'trong', 'một', 'các', 'và', 'để', 'không', 'sẽ', 'đã',
      'dự án', 'công việc', 'nhóm', 'team', 'làm việc', 'quản lý', 'thời gian',
      'chào', 'xin chào', 'cảm ơn', 'vậy', 'rồi', 'nè', 'nhé', 'ạ', 'em', 'anh'
    ];

    const vietnameseChars = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi;

    messages.forEach(msg => {
      const text = msg.text.toLowerCase();
      totalChars += text.length;

      // Check Vietnamese diacritics
      const vietnameseCharMatches = text.match(vietnameseChars);
      if (vietnameseCharMatches) {
        vietnameseScore += vietnameseCharMatches.length * 3; // Weight diacritics heavily
      }

      // Check Vietnamese keywords
      vietnameseKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          vietnameseScore += keyword.length * 2;
        }
      });

      // Check English patterns
      const englishWords = text.match(/\b[a-z]+\b/g) || [];
      englishWords.forEach(word => {
        if (word.length > 3 && !vietnameseKeywords.includes(word)) {
          englishScore += 1;
        }
      });
    });

    // Calculate ratios
    const vietnameseRatio = vietnameseScore / Math.max(totalChars, 1);
    const englishRatio = englishScore / Math.max(totalChars, 1);

    console.log(`🔍 Language detection - VN: ${vietnameseRatio.toFixed(3)}, EN: ${englishRatio.toFixed(3)}`);

    if (vietnameseRatio > englishRatio * 1.5) {
      return 'vietnamese';
    } else if (englishRatio > vietnameseRatio * 1.5) {
      return 'english';
    } else {
      return 'mixed';
    }
  }

  extractTopics(messages) {
    if (!messages || messages.length === 0) return [];

    const topics = new Set();
    
    // Enhanced keywords with Vietnamese focus
    const keywords = {
      'dự án': ['dự án', 'project', 'kế hoạch', 'plan', 'planning'],
      'nhóm': ['team', 'nhóm', 'thành viên', 'member', 'đồng đội', 'cộng sự'],
      'công việc': ['task', 'công việc', 'nhiệm vụ', 'việc', 'job', 'work'],
      'deadline': ['deadline', 'hạn chót', 'thời hạn', 'due date', 'hạn nộp'],
      'họp': ['meeting', 'họp', 'cuộc họp', 'gặp mặt', 'thảo luận'],
      'phát triển': ['development', 'phát triển', 'develop', 'code', 'lập trình'],
      'github': ['github', 'git', 'repository', 'repo', 'version control'],
      'quản lý': ['quản lý', 'management', 'manage', 'điều hành', 'vận hành'],
      'báo cáo': ['report', 'báo cáo', 'reporting', 'thống kê', 'dashboard'],
      'khách hàng': ['client', 'khách hàng', 'customer', 'user', 'người dùng']
    };

    messages.forEach(msg => {
      const text = msg.text.toLowerCase();
      Object.entries(keywords).forEach(([topic, terms]) => {
        if (terms.some(term => text.includes(term.toLowerCase()))) {
          topics.add(topic);
        }
      });
    });

    return Array.from(topics);
  }

  // Enhanced entity extraction with Vietnamese support
  extractEntities(message) {
    const entities = {
      dates: [],
      times: [],
      people: [],
      projects: [],
      tasks: [],
      organizations: []
    };

    const patterns = {
      dates: /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+(tháng\s+)?\d{1,2}|ngày\s+\d{1,2})\b/gi,
      times: /\b(\d{1,2}:\d{2}|\d{1,2}h\d{0,2}|\d{1,2}\s*giờ)\b/gi,
      people: /@([a-zA-Z0-9_]+)|anh\s+([A-Z][a-z]+)|chị\s+([A-Z][a-z]+)/g,
      projects: /dự án\s+([a-zA-Z0-9\s]+)|project\s+([a-zA-Z0-9\s]+)/gi,
      organizations: /công ty\s+([A-Z][a-zA-Z\s]+)|team\s+([A-Z][a-zA-Z\s]+)/gi
    };

    Object.entries(patterns).forEach(([type, pattern]) => {
      const matches = message.match(pattern);
      if (matches) {
        entities[type] = matches.map(match => match.trim());
      }
    });

    return entities;
  }

  // Rest of the methods remain the same...
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

  buildContextSummary(conversationId) {
    try {
      const conversation = conversationManager.getConversation(conversationId);
      const messages = conversation.messages;
      
      if (messages.length === 0) {
        return "Cuộc trò chuyện mới bắt đầu.";
      }

      const userMessages = messages.filter(m => m.sender === 'user');
      const topics = this.extractTopics(userMessages);
      const lastUserMessage = userMessages[userMessages.length - 1];
      const language = this.detectPrimaryLanguage(userMessages.slice(-3));
      
      if (language === 'english') {
        let summary = `Conversation has ${messages.length} messages. `;
        if (topics.length > 0) {
          summary += `Topics: ${topics.join(', ')}. `;
        }
        if (lastUserMessage) {
          summary += `Latest question about: "${lastUserMessage.text.substring(0, 50)}..."`;
        }
        return summary;
      } else {
        let summary = `Cuộc trò chuyện có ${messages.length} tin nhắn. `;
        if (topics.length > 0) {
          summary += `Chủ đề: ${topics.join(', ')}. `;
        }
        if (lastUserMessage) {
          summary += `Câu hỏi gần nhất về: "${lastUserMessage.text.substring(0, 50)}..."`;
        }
        return summary;
      }

    } catch (error) {
      console.error('❌ Error building context summary:', error);
      return "Không thể tạo tóm tắt ngữ cảnh.";
    }
  }

  async validateSetup() {
    return true;
  }
}

module.exports = new ContextManager();
