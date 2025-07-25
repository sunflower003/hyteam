import { useState, useEffect, useRef } from 'react';
import styles from '../styles/Hypo.module.css';

const Hypo = () => {
  // Existing states...
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  // Enhanced animation states với better control
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState('idle');
  const [shouldRender, setShouldRender] = useState(false);
  
  const chatEndRef = useRef(null);
  const chatHistoryRef = useRef(null);
  const animationTimeoutRef = useRef(null);

  const images = [
    "/img/hypo/hypo.gif",
    "/img/hypo/hypo2.gif",
  ];

  // Cleanup function để prevent memory leaks
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  // Image rotation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 7000);
    return () => clearInterval(interval);
  }, [images.length]);

  // Smart auto-scroll effect
  useEffect(() => {
    const shouldAutoScroll = !userScrolled || streamingMessageId;
    
    if (shouldAutoScroll && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
      setUnreadMessages(0);
    } else if (userScrolled) {
      setUnreadMessages(prev => prev + 1);
    }
  }, [messages, userScrolled, streamingMessageId]);

  // Scroll event handler
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

  // Enhanced toggle chat với better state control
  const toggleChat = () => {
    if (isAnimating) {
      console.log('🚫 Animation in progress, ignoring click');
      return;
    }
    
    if (!isChatVisible) {
      console.log('📱 Opening chat instantly...');
      setShouldRender(true);
      setIsChatVisible(true);
      setUserScrolled(false);
      setUnreadMessages(0);
      
    } else {
      console.log('🎭 Starting enhanced closing animation...');
      
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      
      setIsAnimating(true);
      setAnimationPhase('closing');
      
      animationTimeoutRef.current = setTimeout(() => {
        console.log('✅ Closing animation completed');
        setIsChatVisible(false);
        setShouldRender(false);
        setAnimationPhase('idle');
        setIsAnimating(false);
        animationTimeoutRef.current = null;
      }, 450);
    }
  };

  // Enhanced close chat function
  const closeChat = () => {
    if (isAnimating) {
      console.log('🚫 Already closing, ignoring');
      return;
    }
    
    console.log('🎭 Enhanced close via button...');
    
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    
    setIsAnimating(true);
    setAnimationPhase('closing');
    
    animationTimeoutRef.current = setTimeout(() => {
      console.log('✅ Close button animation completed');
      setIsChatVisible(false);
      setShouldRender(false);
      setAnimationPhase('idle');
      setIsAnimating(false);
      animationTimeoutRef.current = null;
    }, 450);
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
  };

  // Enhanced streaming message sender với better error handling
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

  return (
    <div>
      {/* Avatar Hypo với enhanced state checking */}
      <img
        src={images[currentImageIndex]}
        alt="Hypo Logo"
        className={`${styles.hypo} ${
          animationPhase === 'closing' ? styles.hypoClosing : ''
        }`}
        onClick={toggleChat}
      />

      {/* Enhanced conditional rendering với shouldRender control */}
      {shouldRender && (
        <div className={`${styles.boxchat} ${
          animationPhase === 'closing' ? styles.chatClosing : styles.chatVisible
        }`}>
          <div className={styles.header}>
            <div className={styles.headerInfo}>
              <div className={styles.headerAvatar}>
                <img src="/img/hypo/hypo.gif" alt="Hypo" />
                <div className={styles.onlineIndicator}></div>
              </div>
              <div className={styles.headerText}>
                <h4>Hypo AI</h4>
                <span className={styles.status}>Always here to help</span>
              </div>
            </div>
            <i
              className={`ri-close-line ${styles.closeIcon}`}
              onClick={closeChat}
            />
          </div>

          <div className={styles.content}>
            {messages.length === 0 && (
              <div className={styles.suggestion}>
                <div className={styles.welcomeAvatar}>
                  <img src="/img/hypo/hypochat.gif" alt="Hypo" />
                </div>
                <h3>How can I help you today?</h3>
                <div className={styles.suggestionList}>
                  <div className={styles.suggestionItem} onClick={() => setInputMessage("Hướng dẫn quản lý dự án")}>
                    <i className="ri-list-check"></i>
                    <span>Quản lý dự án</span>
                  </div>
                  <div className={styles.suggestionItem} onClick={() => setInputMessage("Giải thích HYTEAM là gì")}>
                    <i className="ri-team-line"></i>
                    <span>Về HYTEAM</span>
                  </div>
                  <div className={styles.suggestionItem} onClick={() => setInputMessage("Hỗ trợ kỹ thuật")}>
                    <i className="ri-tools-line"></i>
                    <span>Hỗ trợ kỹ thuật</span>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.chatHistoryContainer}>
              <div 
                className={styles.chatHistory}
                ref={chatHistoryRef}
                onScroll={handleScroll}
              >
                {messages.map((msg) => (
                  <div key={msg.id} className={styles.messageContainer}>
                    <div className={`${styles.messageGroup} ${
                      msg.sender === 'ai' ? styles.messageGroupAI : styles.messageGroupUser
                    }`}>
                      {msg.sender === 'ai' && (
                        <div className={styles.messageAvatar}>
                          <img src="/img/hypo/hypo.gif" alt="Hypo" />
                        </div>
                      )}
                      
                      <div className={styles.messageContent}>
                        <div className={`${styles.messageBubble} ${
                          msg.sender === 'ai' ? styles.bubbleAI : styles.bubbleUser
                        } ${msg.isError ? styles.errorBubble : ''}`}>
                          <span className={styles.messageText}>
                            {msg.text}
                            {msg.streaming && (
                              <span className={styles.typingCursor}>|</span>
                            )}
                          </span>
                        </div>
                        <div className={styles.messageTime}>
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {loading && !streamingMessageId && (
                  <div className={styles.messageContainer}>
                    <div className={`${styles.messageGroup} ${styles.messageGroupAI}`}>
                      <div className={styles.messageAvatar}>
                        <img src="/img/hypo/hypo.gif" alt="Hypo" />
                      </div>
                      <div className={styles.typingIndicator}>
                        <div className={styles.typingDots}>
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {showScrollToBottom && (
                <div className={styles.scrollToBottomContainer}>
                  <button 
                    className={styles.scrollToBottomButton}
                    onClick={scrollToBottom}
                    title="Scroll to bottom"
                  >
                    <i className="ri-arrow-down-line"></i>
                    {unreadMessages > 0 && (
                      <span className={styles.unreadBadge}>{unreadMessages}</span>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className={`${styles.inputChat} ${isInputFocused ? styles.inputChatFocused : ''}`}>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  placeholder="Type a message..."
                  className={styles.inputField}
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  onKeyDown={handleInputKeyDown}
                  disabled={loading}
                />
                <div className={styles.inputActions}>
                  <div className={styles.attachButtons}>
                    <i className="ri-emotion-happy-line" title="Emoji"></i>
                    <i className="ri-attachment-2" title="Attach file"></i>
                  </div>
                  <button
                    className={`${styles.sendButton} ${loading ? styles.loading : ''}`}
                    onClick={sendStreamingMessage}
                    disabled={loading || !inputMessage.trim()}
                    title="Send message"
                  >
                    <i className="ri-send-plane-fill"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hypo;
