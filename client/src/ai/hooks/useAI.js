import { useContext } from 'react';
import { AIContext } from '../context/AIContext';

export const useAI = () => {
  const context = useContext(AIContext);
  
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  
  return context;
};

// Additional hooks for specific AI features
export const useConversation = () => {
  const { messages, conversationId, clearConversation } = useAI();
  
  return {
    messages,
    conversationId,
    clearConversation,
    hasMessages: messages.length > 0,
    messageCount: messages.length
  };
};

export const useAIStatus = () => {
  const { loading, streamingMessageId } = useAI();
  
  return {
    isLoading: loading,
    isStreaming: !!streamingMessageId,
    canSendMessage: !loading
  };
};
