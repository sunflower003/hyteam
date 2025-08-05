import { createContext, useState, useEffect, useCallback } from 'react';

export const AIContext = createContext();

export const AIProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [aiServiceStatus, setAiServiceStatus] = useState('unknown'); // ollama, openrouter, offline

  // Initialize conversation on mount
  useEffect(() => {
    initializeConversation();
    checkAIServiceStatus();
  }, []);

  const initializeConversation = useCallback(() => {
    try {
      const savedConversation = localStorage.getItem('hypo_conversation');
      if (savedConversation) {
        const { id, messages: savedMessages, timestamp } = JSON.parse(savedConversation);
        
        // Check if conversation is less than 24 hours old
        const isRecentConversation = Date.now() - timestamp < 24 * 60 * 60 * 1000;
        
        if (isRecentConversation && savedMessages?.length > 0) {
          setConversationId(id);
          setMessages(savedMessages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
          console.log('✅ Loaded saved conversation:', id);
          return;
        }
      }
      
      // Create new conversation
      const newId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setConversationId(newId);
      setMessages([]);
      console.log('🆕 Created new conversation:', newId);
      
    } catch (error) {
      console.error('❌ Error initializing conversation:', error);
      // Fallback to new conversation
      const newId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setConversationId(newId);
      setMessages([]);
    }
  }, []);

  // Check AI service status (Sonar, Ollama, OpenRouter)
  const checkAIServiceStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/hypo/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const health = await response.json();
      
      if (health.ai?.service === 'sonar' && health.ai?.connection === 'connected') {
        setAiServiceStatus('sonar');
        console.log('🌐 Sonar AI service detected and ready');
      } else if (health.ai?.service === 'ollama' && health.ai?.connection === 'connected') {
        setAiServiceStatus('ollama');
        console.log('🦙 Ollama service detected and ready');
      } else if (health.ai?.service === 'openrouter') {
        setAiServiceStatus('openrouter');
        console.log('🌐 OpenRouter service detected');
      } else {
        setAiServiceStatus('offline');
        console.log('⚠️ AI service unavailable');
      }
      
    } catch (error) {
      console.error('❌ Error checking AI service status:', error);
      setAiServiceStatus('offline');
    }
  }, []);

  // Save conversation to localStorage whenever messages change
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      try {
        const conversationData = {
          id: conversationId,
          messages: messages,
          timestamp: Date.now(),
          aiService: aiServiceStatus
        };
        localStorage.setItem('hypo_conversation', JSON.stringify(conversationData));
        console.log('💾 Saved conversation to localStorage');
      } catch (error) {
        console.error('❌ Error saving conversation:', error);
      }
    }
  }, [messages, conversationId, aiServiceStatus]);

  const sendMessage = useCallback(async (message) => {
    if (!message?.trim() || loading || !conversationId) return;

    setLoading(true);
    setUserScrolled(false);
    setUnreadMessages(0);

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: message.trim(),
      timestamp: new Date()
    };

    const aiMsg = {
      id: Date.now() + 1,
      sender: 'ai',
      text: '',
      timestamp: new Date(),
      streaming: true
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setStreamingMessageId(aiMsg.id);

    try {
      const response = await fetch('/api/ai/hypo/chat-stream', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({ 
          message: message.trim(),
          conversationId: conversationId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'chunk') {
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMsg.id 
                    ? { ...msg, text: msg.text + data.content }
                    : msg
                ));
              } else if (data.type === 'done') {
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMsg.id 
                    ? { 
                        ...msg, 
                        streaming: false,
                        modelUsed: data.modelUsed,
                        processingTime: data.processingTime
                      }
                    : msg
                ));
                setStreamingMessageId(null);
                
                // Update AI service status if provided
                if (data.service) {
                  setAiServiceStatus(data.service);
                } else if (data.modelUsed) {
                  // Fallback logic for older responses
                  if (data.modelUsed.includes('sonar') || data.service === 'sonar') {
                    setAiServiceStatus('sonar');
                  } else if (data.modelUsed.includes('llama')) {
                    setAiServiceStatus('ollama');
                  } else {
                    setAiServiceStatus('openrouter');
                  }
                }
                
              } else if (data.type === 'error') {
                let errorMessage = data.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
                
                // Enhanced error handling for multiple services
                if (data.errorType === 'sonar_api_error') {
                  errorMessage = '🌐 Sonar API error. Kiểm tra API key hoặc thử lại sau.';
                  setAiServiceStatus('offline');
                  
                } else if (data.errorType === 'sonar_rate_limit') {
                  errorMessage = '⏳ Sonar rate limit exceeded. Vui lòng đợi một chút.';
                  
                } else if (data.errorType === 'ollama_not_running') {
                  errorMessage = '🦙 Ollama service chưa chạy. Vui lòng start Ollama: ollama serve';
                  setAiServiceStatus('offline');
                  
                } else if (data.errorType === 'model_not_found') {
                  errorMessage = '🔍 Model không tồn tại. Vui lòng pull model: ollama pull llama3.2:3b';
                  setAiServiceStatus('offline');
                  
                } else if (data.errorType === 'connection_failed') {
                  errorMessage = '🔌 Không thể kết nối AI service. Kiểm tra cấu hình.';
                  setAiServiceStatus('offline');
                  
                } else if (data.errorType === 'out_of_memory') {
                  errorMessage = '💾 Không đủ RAM để chạy model. Thử model nhỏ hơn: ollama pull llama3.2:1b';
                  
                } else if (data.errorType === 'timeout') {
                  errorMessage = '⏰ AI response timeout. Model có thể đang tải hoặc mạng chậm.';
                  
                } else if (data.errorType === 'model_not_loaded') {
                  errorMessage = '📦 Model chưa được load. Đang tải model, vui lòng thử lại sau 30-60 giây...';
                  
                } else if (data.errorType === 'quota_exceeded') {
                  errorMessage = '🚫 OpenRouter đã đạt giới hạn requests hôm nay. Sẽ reset vào 7:00 AM mai.';
                  setAiServiceStatus('openrouter');
                  
                } else if (data.errorType === 'rate_limited') {
                  errorMessage = '⏳ Quá nhiều requests. Vui lòng đợi 30 giây trước khi thử lại.';
                  
                } else if (data.errorType === 'provider_rate_limited') {
                  errorMessage = '🚫 Google Gemini đang quá tải. Vui lòng thử lại sau 1-2 phút hoặc đổi sang Ollama.';
                  setAiServiceStatus('openrouter');
                }
                
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMsg.id 
                    ? { 
                        ...msg, 
                        text: errorMessage, 
                        streaming: false, 
                        isError: true,
                        errorType: data.errorType,
                        suggestion: data.suggestion
                      }
                    : msg
                ));
                setStreamingMessageId(null);
              }
            } catch (parseError) {
              console.error('❌ Parse error:', parseError);
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ Send message error:', error);
      
      let errorMessage = 'Có lỗi xảy ra. Vui lòng thử lại.';
      let errorType = 'network_error';
      
      if (error.message.includes('429')) {
        errorMessage = '⏳ Quá nhiều yêu cầu. Vui lòng đợi một chút.';
        errorType = 'rate_limited';
      } else if (error.message.includes('500')) {
        errorMessage = '🔧 Server tạm thời gặp sự cố. Vui lòng thử lại.';
        errorType = 'server_error';
      } else if (error.message.includes('503')) {
        errorMessage = '🦙 AI service không khả dụng. Kiểm tra Ollama hoặc thử OpenRouter.';
        errorType = 'service_unavailable';
        setAiServiceStatus('offline');
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = '🌐 Lỗi kết nối mạng. Kiểm tra internet và thử lại.';
        errorType = 'network_error';
      }
      
      setMessages(prev => prev.map(msg => 
        msg.id === aiMsg.id 
          ? { 
              ...msg, 
              text: errorMessage, 
              streaming: false, 
              isError: true,
              errorType: errorType
            }
          : msg
      ));
      setStreamingMessageId(null);
    } finally {
      setLoading(false);
    }
  }, [loading, conversationId]);

  const clearConversation = useCallback(async () => {
    try {
      // Clear from server if conversation exists
      if (conversationId && messages.length > 0) {
        await fetch(`/api/ai/hypo/conversation/${conversationId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to clear conversation from server:', error);
    } finally {
      // Always clear locally
      localStorage.removeItem('hypo_conversation');
      setMessages([]);
      const newId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setConversationId(newId);
      setStreamingMessageId(null);
      setUserScrolled(false);
      setUnreadMessages(0);
      console.log('🗑️ Cleared conversation, created new:', newId);
    }
  }, [conversationId, messages.length]);

  const retryLastMessage = useCallback(async () => {
    if (messages.length < 2) return;
    
    // Find the last user message
    const lastUserMessage = [...messages].reverse().find(msg => msg.sender === 'user');
    if (!lastUserMessage) return;
    
    // Remove the last AI response (if any) and retry
    setMessages(prev => {
      const lastAiIndex = prev.map(m => m.sender).lastIndexOf('ai');
      if (lastAiIndex !== -1) {
        return prev.slice(0, lastAiIndex);
      }
      return prev;
    });
    
    // Resend the last user message
    await sendMessage(lastUserMessage.text);
  }, [messages, sendMessage]);

  const switchAIService = useCallback(async () => {
    try {
      // This could be implemented to switch between Ollama and OpenRouter
      // For now, just refresh the status
      await checkAIServiceStatus();
    } catch (error) {
      console.error('❌ Error switching AI service:', error);
    }
  }, [checkAIServiceStatus]);

  const getConversationStats = useCallback(() => {
    const userMessages = messages.filter(m => m.sender === 'user').length;
    const aiMessages = messages.filter(m => m.sender === 'ai' && !m.isError).length;
    const errorMessages = messages.filter(m => m.isError).length;
    
    return {
      totalMessages: messages.length,
      userMessages,
      aiMessages,
      errorMessages,
      conversationId,
      aiService: aiServiceStatus,
      hasConversation: messages.length > 0
    };
  }, [messages, conversationId, aiServiceStatus]);

  const value = {
    // Core state
    messages,
    conversationId,
    loading,
    streamingMessageId,
    aiServiceStatus,
    
    // Scroll and UI state
    userScrolled,
    setUserScrolled,
    unreadMessages,
    setUnreadMessages,
    
    // Core actions
    sendMessage,
    clearConversation,
    retryLastMessage,
    
    // Service management
    checkAIServiceStatus,
    switchAIService,
    
    // Utilities
    getConversationStats,
    
    // Computed values
    hasMessages: messages.length > 0,
    canSendMessage: !loading && conversationId,
    isSonarReady: aiServiceStatus === 'sonar',
    isOllamaReady: aiServiceStatus === 'ollama',
    isOffline: aiServiceStatus === 'offline'
  };

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
};

// Additional context for AI service status
export const AIStatusContext = createContext();

export const AIStatusProvider = ({ children }) => {
  const [serviceHealth, setServiceHealth] = useState({
    sonar: false,
    ollama: false,
    openrouter: false,
    lastCheck: null
  });

  const checkAllServices = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/hypo/health');
      const health = await response.json();
      
      setServiceHealth({
        perplexity: health.ai?.service === 'perplexity' && health.ai?.connection === 'connected',
        ollama: health.ai?.service === 'ollama' && health.ai?.connection === 'connected',
        openrouter: health.ai?.service === 'openrouter' && health.status === 'healthy',
        lastCheck: new Date()
      });
      
    } catch (error) {
      console.error('❌ Error checking service health:', error);
      setServiceHealth(prev => ({
        ...prev,
        perplexity: false,
        ollama: false,
        openrouter: false,
        lastCheck: new Date()
      }));
    }
  }, []);

  useEffect(() => {
    checkAllServices();
    
    // Check every 30 seconds
    const interval = setInterval(checkAllServices, 30000);
    return () => clearInterval(interval);
  }, [checkAllServices]);

  return (
    <AIStatusContext.Provider value={{ serviceHealth, checkAllServices }}>
      {children}
    </AIStatusContext.Provider>
  );
};
