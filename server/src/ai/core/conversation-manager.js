// Conversation manager for handling conversations
class ConversationManager {
  constructor() {
    this.conversations = new Map();
  }

  startConversation(id, context) {
    this.conversations.set(id, context);
  }

  getConversation(id) {
    return this.conversations.get(id);
  }

  endConversation(id) {
    this.conversations.delete(id);
  }
}

module.exports = ConversationManager;
