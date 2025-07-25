// Context manager for maintaining conversation context
class ContextManager {
  constructor() {
    this.contexts = new Map();
  }

  setContext(id, context) {
    this.contexts.set(id, context);
  }

  getContext(id) {
    return this.contexts.get(id);
  }

  clearContext(id) {
    this.contexts.delete(id);
  }
}

module.exports = ContextManager;
