import { useState, useEffect, useRef } from 'react';
import styles from '../styles/Hypo.module.css';

const Hypo = () => {
  // States từ component gốc (đơn giản)
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  
  // States cho AI logic (giữ nguyên từ AI component)
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  const chatEndRef = useRef(null);
  const chatHistoryRef = useRef(null);
  
  const images = [
    "/img/hypo/hypo.gif",
    "/img/hypo/hypo2.gif", 
  ];

  // Image rotation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 7000);

    return () => clearInterval(interval);
  }, [images.length]);

  // Smart auto-scroll effect (từ AI component)
  useEffect(() => {
    const shouldAutoScroll = !userScrolled || streamingMessageId;
    
    if (shouldAutoScroll && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
      setUnreadMessages(0);
    } else if (userScrolled) {
      setUnreadMessages(prev => prev + 1);
    }
  }, [messages, userScrolled, streamingMessageId]);

  // Scroll event handler (từ AI component)
  const handleScroll = () => {
    if (!chatHistoryRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = chatHistoryRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    setUserScrolled(!isAtBottom);
    setShowScrollToBottom(!isAtBottom);
    
    if (isAtBottom) {
      setUnreadMessages(0);
    }
  };

  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
      setUserScrolled(false);
      setShowScrollToBottom(false);
      setUnreadMessages(0);
    }
  };

  // Giao diện đơn giản (từ component gốc)
  const toggleChat = () => {
    setIsChatVisible(!isChatVisible);
  };

  const closeChat = () => {
    setIsChatVisible(false);
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
  };

  // Logic AI streaming (giữ nguyên từ AI component)
  const sendStreamingMessage = async (retryCount = 0) => {
    if (!inputMessage.trim() || loading) return;

    const maxRetries = 2;
    setUserScrolled(false);
    setUnreadMessages(0);

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: inputMessage,
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
    setLoading(true);

    const currentInput = inputMessage;
    setInputMessage('');

    try {
      const response = await fetch('/api/ai/hypo/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput })
      });

      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        
        if (retryCount < maxRetries && errorData.waitTime) {
          const waitTime = errorData.waitTime * 1000;
          
          setMessages(prev => prev.map(msg => 
            msg.id === aiMsg.id 
              ? { ...msg, text: `Đang chờ ${errorData.waitTime} giây để thử lại...`, streaming: true }
              : msg
          ));
          
          setTimeout(() => {
            setMessages(prev => prev.filter(msg => msg.id !== aiMsg.id));
            setInputMessage(currentInput);
            setLoading(false);
            setStreamingMessageId(null);
            sendStreamingMessage(retryCount + 1);
          }, waitTime);
          
          return;
        } else {
          throw new Error('RATE_LIMITED');
        }
      }

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
                    ? { ...msg, streaming: false }
                    : msg
                ));
                setStreamingMessageId(null);
              } else if (data.type === 'error') {
                console.log('🚨 Received error data:', data);
                
                let errorMessage = 'Có lỗi xảy ra. Vui lòng thử lại.'; // Default
                
                // Enhanced error message selection based on errorType
                if (data.errorType === 'quota_exceeded') {
                  errorMessage = '🚫 AI đã đạt giới hạn requests hôm nay. Sẽ reset vào 7:00 AM mai. Vui lòng thử lại sau!';
                } else if (data.errorType === 'rate_limited') {
                  errorMessage = '⏳ Quá nhiều requests. Vui lòng đợi 30 giây trước khi thử lại.';
                } else if (data.errorType === 'model_unavailable') {
                  errorMessage = '🔧 AI model tạm thời không khả dụng. Vui lòng thử lại sau.';
                } else if (data.errorType === 'context_too_long') {
                  errorMessage = '📝 Cuộc trò chuyện quá dài. Vui lòng bắt đầu chat mới.';
                } else if (data.message) {
                  // Use the message from backend if no specific type matched
                  errorMessage = data.message;
                }
                
                console.log('💬 Final error message:', errorMessage);
                
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMsg.id 
                    ? { ...msg, text: errorMessage, streaming: false, isError: true }
                    : msg
                ));
                setStreamingMessageId(null);
              }
            } catch (e) {
              console.error('❌ Parse error:', e);
              console.error('📝 Problematic line:', line);
              
              setMessages(prev => prev.map(msg => 
                msg.id === aiMsg.id 
                  ? { ...msg, text: '🔧 Lỗi xử lý dữ liệu. Vui lòng thử lại.', streaming: false, isError: true }
                  : msg
              ));
              setStreamingMessageId(null);
            }
          }
        }
      }

    } catch (err) {
      console.error('❌ Request error:', err);
      
      let errorMessage;
      if (err.message === 'RATE_LIMITED') {
        errorMessage = '⏳ Quá nhiều yêu cầu. Vui lòng đợi một chút trước khi gửi tin nhắn tiếp theo.';
      } else if (err.message.includes('429')) {
        errorMessage = '🚫 AI đang bận. Vui lòng thử lại sau vài giây.';
      } else if (err.message.includes('500') || err.message.includes('502') || err.message.includes('503')) {
        errorMessage = '🔧 Server tạm thời gặp sự cố. Đang thử lại...';
      } else if (err.message.includes('timeout') || err.message.includes('TIMEOUT')) {
        errorMessage = '⏰ Kết nối timeout. Vui lòng thử lại.';
      } else if (err.message.includes('network') || err.message.includes('fetch')) {
        errorMessage = '🌐 Lỗi kết nối mạng. Kiểm tra internet và thử lại.';
      } else {
        errorMessage = `⚠️ Lỗi không xác định: ${err.message}`;
      }
      
      setMessages(prev => prev.map(msg => 
        msg.id === aiMsg.id 
          ? { ...msg, text: errorMessage, streaming: false, isError: true }
          : msg
      ));
      setStreamingMessageId(null);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendStreamingMessage();
    }
  };

  // Hàm xử lý click suggestion
  const handleSuggestionClick = (suggestionText) => {
    setInputMessage(suggestionText);
    // Auto send the message
    setTimeout(() => {
      sendStreamingMessage();
    }, 100);
  };

  return (
    <div>
      <img 
        src={images[currentImageIndex]} 
        alt="Hypo Logo" 
        className={styles.hypo} 
        onClick={toggleChat}
      />
      {isChatVisible && (
        <div className={styles.boxchat}>
          <div className={styles.header}>
              <i className="ri-timer-2-line"></i>
              <i className={`ri-close-line ${styles.closeIcon}`} onClick={closeChat}></i>
          </div>
          <div className={styles.content}>
            {/* Đây là lựa chọn gợi ý cho đoạn chat */}
            {messages.length === 0 && (
              <div className={styles.suggestion}>
                  <img src="/img/hypo/hypochat.gif" alt="Hypo" className={styles.hypoIcon}/>
                  <h3 className={styles.title}>How can I help you today?</h3>
                  <ul className={styles.list}>
                      <li className={styles.listItem} onClick={() => handleSuggestionClick("Can you help me with GitHub integration?")}>
                        <i className="ri-github-line"></i>Get answers from connected apps
                      </li>
                      <li className={styles.listItem} onClick={() => handleSuggestionClick("Please summarize this page for me")}>
                        <i className="ri-list-check"></i>Summarize this page
                      </li>
                      <li className={styles.listItem} onClick={() => handleSuggestionClick("Can you translate this page?")}>
                        <i className="ri-translate-2"></i>Translate this page
                      </li>
                  </ul>
              </div>
            )}
            
            {/* Đây là nơi hiển thị các đoạn chat */}
            {messages.length > 0 && (
              <div className={styles.chatHistory} ref={chatHistoryRef} onScroll={handleScroll}>
                {messages.map((message) => (
                  <div key={message.id} className={`${styles.message} ${message.sender === 'user' ? styles.userMessage : styles.aiMessage}`}>
                    {message.sender === 'ai' && (
                      <img src="/img/hypo/hypochat.gif" alt="Hypo" className={styles.messageAvatar}/>
                    )}
                    <div className={styles.messageContent}>
                      {/* Hiển thị 3 chấm nhảy khi AI đang streaming và chưa có text */}
                      {message.sender === 'ai' && message.streaming && !message.text ? (
                        <div className={styles.typingIndicator}>
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      ) : (
                        <p className={styles.messageText}>
                          {message.text}
                          {message.streaming && message.text && (
                            <span className={styles.typingCursor}>|</span>
                          )}
                        </p>
                      )}
                      <span className={styles.messageTime}>
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
                
                <div ref={chatEndRef} />
              </div>
            )}
          </div>
          
          {/* Input area moved outside content to stick to bottom */}
          <div className={`${styles.inputChat} ${isInputFocused ? styles.inputChatFocused : ''}`}>
            <input 
              type="text" 
              placeholder="Ask Hypo AI anything..." 
              className={styles.inputField}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              disabled={loading}
            />
            <div className={styles.buttonList}>
              <div className={styles.attachButton}>
                <i className="ri-notion-fill"></i>
                <i className="ri-attachment-2"></i>
                <i className="ri-at-line"></i>
              </div>
              <i className={`ri-send-plane-fill ${styles.sendButton}`} 
                 onClick={sendStreamingMessage}></i>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hypo;
