const conversationManager = require('../core/conversation-manager');
const contextManager = require('../core/context-manager');

class MemoryService {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 100;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  async saveConversation(conversationId, messages) {
    try {
      // In a real app, this would save to database
      // For now, we rely on conversation manager's in-memory storage
      
      const conversation = conversationManager.getConversation(conversationId);
      conversation.savedAt = new Date();
      
      // Cache recent conversations
      this.addToCache(conversationId, conversation);
      
      console.log(`💾 Saved conversation ${conversationId} with ${messages.length} messages`);
      return conversationId;
      
    } catch (error) {
      console.error('❌ Error saving conversation:', error);
      throw error;
    }
  }

  async loadConversation(conversationId) {
    try {
      // Check cache first
      if (this.cache.has(conversationId)) {
        this.cacheHits++;
        console.log(`⚡ Cache hit for conversation ${conversationId}`);
        return this.cache.get(conversationId);
      }

      this.cacheMisses++;
      
      // Load from conversation manager
      const conversation = conversationManager.getConversation(conversationId);
      
      // Add to cache for future requests
      this.addToCache(conversationId, conversation);
      
      console.log(`📖 Loaded conversation ${conversationId} from memory`);
      return conversation;
      
    } catch (error) {
      console.error('❌ Error loading conversation:', error);
      throw error;
    }
  }

  async getConversationHistory(conversationId, limit = 10) {
    try {
      const conversation = await this.loadConversation(conversationId);
      const messages = conversation.messages || [];
      
      // Return recent messages first
      const recentMessages = messages.slice(-limit);
      
      return {
        conversationId,
        messages: recentMessages,
        totalMessages: messages.length,
        hasMore: messages.length > limit
      };
      
    } catch (error) {
      console.error('❌ Error getting conversation history:', error);
      return { conversationId, messages: [], totalMessages: 0, hasMore: false };
    }
  }

  async clearConversation(conversationId) {
    try {
      // Remove from cache
      this.cache.delete(conversationId);
      
      // Remove from conversation manager
      conversationManager.deleteConversation(conversationId);
      
      console.log(`🗑️ Cleared conversation ${conversationId}`);
      return true;
      
    } catch (error) {
      console.error('❌ Error clearing conversation:', error);
      return false;
    }
  }

  addToCache(conversationId, conversation) {
    // Implement LRU cache
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(conversationId, {
      ...conversation,
      cachedAt: new Date()
    });
  }

  getMemoryStats() {
    const hitRate = this.cacheHits / (this.cacheHits + this.cacheMisses) * 100;
    
    return {
      cacheSize: this.cache.size,
      maxCacheSize: this.maxCacheSize,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: hitRate.toFixed(2) + '%',
      conversationStats: conversationManager.getStats()
    };
  }

  // Method to extract and store important information from conversations
  async extractKeyInsights(conversationId) {
    try {
      const conversation = await this.loadConversation(conversationId);
      const messages = conversation.messages || [];
      
      const insights = {
        userPreferences: [],
        frequentTopics: [],
        commonQuestions: [],
        helpfulResponses: []
      };

      // Analyze user messages for preferences
      const userMessages = messages.filter(m => m.sender === 'user');
      userMessages.forEach(msg => {
        const topics = contextManager.extractTopics([msg]);
        insights.frequentTopics.push(...topics);
      });

      // Count topic frequency
      const topicCounts = {};
      insights.frequentTopics.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });

      insights.topTopics = Object.entries(topicCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([topic, count]) => ({ topic, count }));

      return insights;
      
    } catch (error) {
      console.error('❌ Error extracting insights:', error);
      return null;
    }
  }
}

module.exports = new MemoryService();
