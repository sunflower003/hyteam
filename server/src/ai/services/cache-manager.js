const crypto = require('crypto');

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100;
    this.defaultTTL = 300000; // 5 minutes
    this.hitCount = 0;
    this.missCount = 0;
  }

  // Generate cache key from messages and model
  generateKey(messages, selectedModel = 'auto') {
    try {
      // Lấy 3 tin nhắn cuối cùng để tạo context key
      const recentMessages = messages.slice(-3);
      const contextString = recentMessages
        .map(msg => `${msg.role}:${msg.content}`)
        .join('|');
      
      // Include model in cache key for separate caching per model
      const keyString = `${selectedModel}:${contextString}`;
      
      // Create hash for consistent key
      return crypto
        .createHash('md5')
        .update(keyString.toLowerCase())
        .digest('hex')
        .substring(0, 16);
    } catch (error) {
      console.error('❌ Error generating cache key:', error);
      return null;
    }
  }

  // Get cached response
  get(messages, selectedModel = 'auto') {
    try {
      const key = this.generateKey(messages, selectedModel);
      if (!key) return null;

      const cached = this.cache.get(key);
      
      if (cached && Date.now() - cached.timestamp < this.defaultTTL) {
        cached.hitCount++;
        this.hitCount++;
        console.log(`⚡ Cache HIT for key: ${key} (${selectedModel}) (hits: ${cached.hitCount})`);
        return {
          response: cached.response,
          fromCache: true,
          hitCount: cached.hitCount,
          model: selectedModel
        };
      }

      // Remove expired cache
      if (cached) {
        this.cache.delete(key);
        console.log(`🗑️ Removed expired cache: ${key}`);
      }

      this.missCount++;
      return null;
    } catch (error) {
      console.error('❌ Error getting from cache:', error);
      return null;
    }
  }

  // Set cache
  set(messages, response, selectedModel = 'auto', customTTL = null) {
    try {
      if (!response || response.length < 10) return false; // Don't cache very short responses

      const key = this.generateKey(messages, selectedModel);
      if (!key) return false;

      // Implement LRU eviction
      if (this.cache.size >= this.maxSize) {
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
        console.log(`🗑️ Evicted oldest cache: ${oldestKey}`);
      }

      this.cache.set(key, {
        response,
        timestamp: Date.now(),
        ttl: customTTL || this.defaultTTL,
        hitCount: 0,
        size: response.length,
        model: selectedModel
      });

      console.log(`💾 Cached response for key: ${key} (${selectedModel}) (${response.length} chars)`);
      return true;
    } catch (error) {
      console.error('❌ Error setting cache:', error);
      return false;
    }
  }

  // Advanced similarity check for partial matches
  findSimilar(messages, threshold = 0.7) {
    try {
      const currentKey = this.generateKey(messages);
      if (!currentKey) return null;

      const currentContext = messages.slice(-2).map(m => m.content.toLowerCase()).join(' ');
      
      for (const [key, cached] of this.cache) {
        if (Date.now() - cached.timestamp > this.defaultTTL) continue;
        
        // Simple similarity check based on common words
        const similarity = this.calculateSimilarity(currentContext, cached.originalContext || '');
        
        if (similarity > threshold) {
          console.log(`🔍 Found similar cache: ${key} (similarity: ${similarity.toFixed(2)})`);
          return {
            response: cached.response,
            fromCache: true,
            similarity: similarity
          };
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Error finding similar cache:', error);
      return null;
    }
  }

  calculateSimilarity(text1, text2) {
    const words1 = new Set(text1.split(' ').filter(w => w.length > 3));
    const words2 = new Set(text2.split(' ').filter(w => w.length > 3));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  // Clear cache
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ Cleared ${size} cached items`);
  }

  // Get statistics
  getStats() {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests * 100).toFixed(2) : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: `${hitRate}%`,
      totalRequests
    };
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.cache) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }

    return cleanedCount;
  }
}

// Auto cleanup every 10 minutes
const cacheManager = new CacheManager();
setInterval(() => {
  cacheManager.cleanup();
}, 600000);

module.exports = {
  default: cacheManager,
  CacheManager
};
