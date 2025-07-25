// Base agent class
class BaseAgent {
  constructor(name) {
    this.name = name;
  }

  performTask(task) {
    throw new Error('performTask method must be implemented');
  }
}

module.exports = BaseAgent;
