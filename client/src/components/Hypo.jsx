import { useState, useEffect, useRef } from 'react';
import styles from '../styles/components/Hypo.module.css';

const Hypo = () => {
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
  
  const chatEndRef = useRef(null);
  const chatHistoryRef = useRef(null);
  
  const images = [
    "/img/hypo/hypo.gif",
    "/img/hypo/hypo2.gif", 
  ];

  // Cleanup function để prevent memory leaks
  useEffect(() => {
    return () => {
      // Cleanup any timeouts if needed
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
      // If user has scrolled and there are new messages, increment unread count
      if (messages.length > 0) {
        setUnreadMessages(prev => prev + 1);
      }
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

  // Enhanced streaming message sender
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
      // Simulate streaming response for demo
      const sampleResponses = [
        "Xin chào! Tôi là Hypo AI, trợ lý thông minh của bạn. Tôi có thể giúp bạn với nhiều câu hỏi khác nhau.",
        "Tôi hiểu bạn đang tìm kiếm thông tin. Hãy để tôi giúp bạn tìm hiểu về điều đó.",
        "Đó là một câu hỏi thú vị! Dựa trên hiểu biết của tôi, tôi có thể chia sẻ một số thông tin hữu ích.",
        "Tôi đang xử lý câu hỏi của bạn. Dưới đây là những gì tôi có thể giúp bạn:",
        "Cảm ơn bạn đã tin tưởng Hypo AI. Tôi sẽ cố gắng đưa ra câu trả lời tốt nhất.",
        "Tôi có thể giúp bạn giải quyết vấn đề này. Hãy để tôi phân tích và đưa ra gợi ý.",
        "Rất vui được trò chuyện với bạn! Tôi luôn sẵn sàng hỗ trợ bạn 24/7.",
        "Based on your question, I can provide some insights that might be helpful to you."
      ];

      const responseText = sampleResponses[Math.floor(Math.random() * sampleResponses.length)];
      
      // Simulate typing effect
      let currentText = '';
      const words = responseText.split(' ');
      
      for (let i = 0; i < words.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
        currentText += (i > 0 ? ' ' : '') + words[i];
        
        setMessages(prev => prev.map(msg => 
          msg.id === aiMsg.id 
            ? { ...msg, text: currentText }
            : msg
        ));
      }

      // Mark as complete
      setMessages(prev => prev.map(msg => 
        msg.id === aiMsg.id 
          ? { ...msg, streaming: false }
          : msg
      ));

    } catch (err) {
      console.error('Error sending message:', err);
      
      if (retryCount < maxRetries) {
        console.log(`Retrying... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return sendStreamingMessage(retryCount + 1);
      }

      setMessages(prev => prev.map(msg => 
        msg.id === aiMsg.id 
          ? { 
              ...msg, 
              text: 'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.', 
              streaming: false,
              isError: true 
            }
          : msg
      ));
    } finally {
      setLoading(false);
      setStreamingMessageId(null);
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
                      <p className={styles.messageText}>
                        {message.text}
                        {message.streaming && (
                          <span className={styles.typingCursor}>|</span>
                        )}
                      </p>
                      <span className={styles.messageTime}>
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
                
                {loading && !streamingMessageId && (
                  <div className={`${styles.message} ${styles.aiMessage}`}>
                    <img src="/img/hypo/hypochat.gif" alt="Hypo" className={styles.messageAvatar}/>
                    <div className={styles.messageContent}>
                      <div className={styles.typingIndicator}>
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>
            )}
            
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
                <i className={`ri-send-plane-fill ${styles.sendButton} ${loading ? styles.loading : ''}`} 
                   onClick={sendStreamingMessage}></i>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hypo;
