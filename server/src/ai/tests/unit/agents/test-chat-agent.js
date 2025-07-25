// Unit test for Chat Agent
import ChatAgent from '../../../ai/agents/chat-agent';

describe('ChatAgent', () => {
  it('should handle a basic chat message', () => {
    const agent = new ChatAgent();
    const response = agent.handleMessage('Hello');
    expect(response).toBe('Response to: Hello');
  });
});
