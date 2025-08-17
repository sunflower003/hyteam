require('dotenv').config();
const { OpenAI } = require('openai');

const client = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: 'https://api.perplexity.ai',
});

async function test() {
  try {
    console.log('Testing Perplexity API...');
    console.log('API Key:', process.env.PERPLEXITY_API_KEY ? 'Found' : 'Missing');
    console.log('Model:', process.env.PERPLEXITY_MODEL);
    
    const response = await client.chat.completions.create({
      model: process.env.PERPLEXITY_MODEL || 'llama-3.1-sonar-small-128k-online',
      messages: [{ role: 'user', content: 'Hello, just testing. Reply with "OK"' }],
      max_tokens: 10
    });
    
    console.log('✅ API works!');
    console.log('Response:', response.choices[0].message.content);
  } catch (error) {
    console.log('❌ API error:', error.message);
    if (error.status) {
      console.log('Status:', error.status);
    }
  }
}

test();
