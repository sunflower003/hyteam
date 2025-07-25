import { useState, useEffect, useRef } from 'react';
import { useAI } from '../hooks/useAI';
import { AIProvider } from '../context/AIContext';
import styles from '../styles/Hypo.module.css';

const HypoComponent = () => {
  // UI-only states
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // AI logic from context
  const { 
    messages, 
    sendMessage, 
    loading, 
    streamingMessageId,
    userScrolled,
    setUserScrolled,
    unreadMessages,
    setUnreadMessages,
    clearConversation
  } = useAI();

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

  // Smart auto-scroll effect
  useEffect(() => {
    const shouldAutoScroll = !userScrolled || streamingMessageId;
    
    if (shouldAutoScroll && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
      setUnreadMessages(0);
    } else if (userScrolled && !streamingMessageId) {
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

  // UI event handlers
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

  // Message sending
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading) return;
    
    const messageToSend = inputMessage;
    setInputMessage('');
    await sendMessage(messageToSend);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestionText) => {
    setInputMessage(suggestionText);
    setTimeout(() => {
      sendMessage(suggestionText);
    }, 100);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
            <div className={styles.headerInfo}>
              <i className="ri-robot-line"></i>
              <span>Hypo AI</span>
              {messages.length > 0 && (
                <button 
                  className={styles.clearButton}
                  onClick={clearConversation}
                  title="Clear conversation"
                >
                  <i className="ri-refresh-line"></i>
                </button>
              )}
            </div>
            <i className={`ri-close-line ${styles.closeIcon}`} onClick={closeChat}></i>
          </div>
          
          <div className={styles.content}>
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
            
            {messages.length > 0 && (
              <div className={styles.chatHistory} ref={chatHistoryRef} onScroll={handleScroll}>
                {messages.map((message) => (
                  <div key={message.id} className={`${styles.message} ${message.sender === 'user' ? styles.userMessage : styles.aiMessage}`}>
                    {message.sender === 'ai' && (
                      <img src="/img/hypo/hypochat.gif" alt="Hypo" className={styles.messageAvatar}/>
                    )}
                    <div className={styles.messageContent}>
                      {message.sender === 'ai' && message.streaming && !message.text ? (
                        <div className={styles.typingIndicator}>
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      ) : (
                        <p className={`${styles.messageText} ${message.isError ? styles.errorMessage : ''}`}>
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
                
                {showScrollToBottom && (
                  <button 
                    className={styles.scrollToBottomButton}
                    onClick={scrollToBottom}
                  >
                    <i className="ri-arrow-down-line"></i>
                    {unreadMessages > 0 && (
                      <span className={styles.unreadBadge}>{unreadMessages}</span>
                    )}
                  </button>
                )}
                
                <div ref={chatEndRef} />
              </div>
            )}
          </div>
          
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
              <i 
                className={`ri-send-plane-fill ${styles.sendButton} ${loading ? styles.disabled : ''}`} 
                onClick={handleSendMessage}
              ></i>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrap with Provider
const Hypo = () => (
  <AIProvider>
    <HypoComponent />
  </AIProvider>
);

export default Hypo;
