import OpenAI from 'openai';

class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required');
    }
    
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.model = 'gpt-3.5-turbo';
    this.maxTokens = 150;
    this.temperature = 0.7;
  }

  async *generateChatResponse(messages) {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        stream: true,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate response from OpenAI');
    }
  }

  async generateSingleResponse(messages) {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate response from OpenAI');
    }
  }
}

export default new OpenAIService();
