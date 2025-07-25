const { OpenAI } = require('openai');

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Original non-streaming function với retry logic
async function generateOpenRouterChat(messages, retryCount = 0) {
  const maxRetries = 3;
  const baseDelay = 2000;
  
  console.log(`🤖 OPENROUTER SERVICE START (attempt ${retryCount + 1})`);
  
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set in environment variables');
  }
  
  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-exp:free",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    if (!completion.choices || !completion.choices[0]) {
      throw new Error('Invalid response format from OpenRouter API');
    }
    
    const text = completion.choices[0].message.content;
    console.log('✅ OpenRouter response:', text);
    
    return text;
    
  } catch (err) {
    console.error(`❌ OpenRouter error (attempt ${retryCount + 1}):`, err.message);
    
    if (err.response?.status === 429 && retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount);
      console.log(`⏳ Rate limited. Waiting ${delay}ms before retry...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return generateOpenRouterChat(messages, retryCount + 1);
    }
    
    throw err;
  }
}

// Enhanced streaming function với comprehensive error detection
async function generateOpenRouterChatStream(messages, onChunk, retryCount = 0) {
  const maxRetries = 3;
  const baseDelay = 2000;
  
  console.log(`🌊 OPENROUTER STREAMING START (attempt ${retryCount + 1})`);
  
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set in environment variables');
  }
  
  try {
    const stream = await client.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-exp:free",
      messages: messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1000,
    });

    let fullResponse = '';
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        onChunk(content);
      }
    }
    
    console.log('✅ Streaming completed:', fullResponse);
    return fullResponse;
    
  } catch (err) {
    console.error(`❌ Streaming error (attempt ${retryCount + 1}):`, err);
    
    // Enhanced error detection
    const errorMessage = err.message || '';
    const errorResponse = err.response?.data || {};
    const statusCode = err.response?.status || 0;
    
    console.log('🔍 Error details:', {
      message: errorMessage,
      status: statusCode,
      responseData: errorResponse
    });
    
    // Check for quota exceeded specifically
    if (errorMessage.includes('free-models-per-day') ||
        errorMessage.includes('Daily quota exceeded') ||
        errorMessage.includes('quota_exceeded') ||
        errorResponse.error?.message?.includes('quota') ||
        statusCode === 429) {
      
      console.log('🚫 Quota exceeded detected');
      throw new Error('Daily quota exceeded. Please try again tomorrow or upgrade your plan.');
    }
    
    // Regular rate limiting với retry
    if (statusCode === 429 && retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount);
      console.log(`⏳ Rate limited. Waiting ${delay}ms before retry...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return generateOpenRouterChatStream(messages, onChunk, retryCount + 1);
    }
    
    // Re-throw with original error for proper handling
    throw err;
  }
}

module.exports = { 
  generateOpenRouterChat, 
  generateOpenRouterChatStream 
};
