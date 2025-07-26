class ConversationManager {
  constructor() {
    this.conversations = new Map();
    this.maxContextLength = 20; // Giữ 20 tin nhắn gần nhất
    this.cleanupInterval = 60 * 60 * 1000; // Cleanup mỗi giờ
    
    // Auto cleanup old conversations
    setInterval(() => this.cleanupOldConversations(), this.cleanupInterval);
  }

  getConversation(conversationId) {
    if (!conversationId) {
      throw new Error('Conversation ID is required');
    }

    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, {
        id: conversationId,
        messages: [],
        context: {},
        createdAt: new Date(),
        lastActivity: new Date()
      });
      console.log(`🆕 Created new conversation: ${conversationId}`);
    }

    // Update last activity
    const conversation = this.conversations.get(conversationId);
    conversation.lastActivity = new Date();
    
    return conversation;
  }

  addMessage(conversationId, message) {
    const conversation = this.getConversation(conversationId);
    
    const messageWithMetadata = {
      ...message,
      id: message.id || Date.now(),
      timestamp: new Date(),
      conversationId: conversationId
    };

    conversation.messages.push(messageWithMetadata);

    // Trim old messages to maintain context window
    if (conversation.messages.length > this.maxContextLength * 2) {
      const keepMessages = this.maxContextLength * 2;
      conversation.messages = conversation.messages.slice(-keepMessages);
      console.log(`✂️ Trimmed conversation ${conversationId} to ${keepMessages} messages`);
    }

    console.log(`💬 Added message to conversation ${conversationId}. Total: ${conversation.messages.length}`);
    return conversation;
  }

  getContext(conversationId, includeSystemMessage = false) {
    const conversation = this.getConversation(conversationId);
    
    let messages = conversation.messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    // Filter out empty messages
    messages = messages.filter(msg => msg.content && msg.content.trim());

    console.log(`📋 Retrieved ${messages.length} context messages for conversation ${conversationId}`);
    return messages;
  }

  getConversationSummary(conversationId) {
    const conversation = this.getConversation(conversationId);
    const messageCount = conversation.messages.length;
    const userMessages = conversation.messages.filter(m => m.sender === 'user').length;
    const aiMessages = conversation.messages.filter(m => m.sender === 'ai').length;

    return {
      id: conversationId,
      messageCount,
      userMessages,
      aiMessages,
      createdAt: conversation.createdAt,
      lastActivity: conversation.lastActivity,
      duration: Date.now() - conversation.createdAt.getTime()
    };
  }

  deleteConversation(conversationId) {
    const deleted = this.conversations.delete(conversationId);
    console.log(`🗑️ ${deleted ? 'Deleted' : 'Attempted to delete'} conversation: ${conversationId}`);
    return deleted;
  }

  cleanupOldConversations() {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    let cleanedCount = 0;

    for (const [id, conversation] of this.conversations) {
      const age = now - conversation.lastActivity.getTime();
      if (age > maxAge) {
        this.conversations.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old conversations`);
    }
  }

  getStats() {
    return {
      totalConversations: this.conversations.size,
      conversations: Array.from(this.conversations.values()).map(conv => 
        this.getConversationSummary(conv.id)
      )
    };
  }
}

module.exports = new ConversationManager();
