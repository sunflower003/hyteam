import { useState, useEffect, useRef } from 'react';
import styles from '../styles/components/Hypo.module.css';

const Hypo = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatHistoryRef = useRef(null);
  
  const images = [
    "/img/hypo/hypo.gif",
    "/img/hypo/hypo2.gif", 
  ];

  // Các phản hồi mẫu của Hypo AI
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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 7000);

    return () => clearInterval(interval);
  }, [images.length]);

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

  // Hàm xử lý gửi tin nhắn
  const handleSendMessage = () => {
    if (inputValue.trim() === '') return;

    // Thêm tin nhắn của user
    const userMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Giả lập phản hồi từ AI sau 1-2 giây
    setTimeout(() => {
      const randomResponse = sampleResponses[Math.floor(Math.random() * sampleResponses.length)];
      const aiMessage = {
        id: Date.now() + 1,
        text: randomResponse,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, Math.random() * 1000 + 1000); // Random delay 1-2 seconds
  };

  // Hàm xử lý nhấn Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Scroll xuống cuối khi có tin nhắn mới
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  // Hàm xử lý click suggestion
  const handleSuggestionClick = (suggestionText) => {
    // Thêm tin nhắn của user
    const userMessage = {
      id: Date.now(),
      text: suggestionText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages([userMessage]);
    setIsTyping(true);

    // Giả lập phản hồi từ AI sau 1-2 giây
    setTimeout(() => {
      const randomResponse = sampleResponses[Math.floor(Math.random() * sampleResponses.length)];
      const aiMessage = {
        id: Date.now() + 1,
        text: randomResponse,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, Math.random() * 1000 + 1000); // Random delay 1-2 seconds
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
            {/* Đây là lựa chọn gợi ý cho đoạn chat, sau khi mình nhập input và gửi cho Hypo AI và khi nhận được phản hồi cái này sẽ ẩn và hiện ra div message - chưa làm */}
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
            
            {/* Đây là nơi hiển thị các đoạn chat, sau khi mình nhập input và gửi cho Hypo AI */}
            {messages.length > 0 && (
              <div className={styles.chatHistory} ref={chatHistoryRef}>
                {messages.map((message) => (
                  <div key={message.id} className={`${styles.message} ${message.sender === 'user' ? styles.userMessage : styles.aiMessage}`}>
                    {message.sender === 'ai' && (
                      <img src="/img/hypo/hypochat.gif" alt="Hypo" className={styles.messageAvatar}/>
                    )}
                    <div className={styles.messageContent}>
                      <p className={styles.messageText}>{message.text}</p>
                      <span className={styles.messageTime}>
                        {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                ))}
                {isTyping && (
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
              </div>
            )}
            <div className={`${styles.inputChat} ${isInputFocused ? styles.inputChatFocused : ''}`}>
              <input 
                type="text" 
                placeholder="Ask Hypo AI anything..." 
                className={styles.inputField}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              <div className={styles.buttonList}>
                <div className={styles.attachButton}>
                  <i className="ri-notion-fill"></i>
                  <i className="ri-attachment-2"></i>
                  <i className="ri-at-line"></i>
                </div>
                <i className={`ri-send-plane-fill ${styles.sendButton}`} onClick={handleSendMessage}></i>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hypo;
