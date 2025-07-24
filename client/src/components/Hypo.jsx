import { useState, useEffect } from 'react';
import styles from '../styles/components/Hypo.module.css';

const Hypo = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  
  const images = [
    "/img/hypo/hypo.gif",
    "/img/hypo/hypo2.gif", 
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
            <div className={styles.suggestion}>
                <img src="/img/hypo/hypochat.gif" alt="Hypo" className={styles.hypoIcon}/>
                <h3 className={styles.title}>How can I help you today?</h3>
                <ul className={styles.list}>
                    <li className={styles.listItem}><i className="ri-github-line"></i>Get answers from connected apps</li>
                    <li className={styles.listItem}><i className="ri-list-check"></i>Summarize this page</li>
                    <li className={styles.listItem}><i className="ri-translate-2"></i>Translate this page</li>
                </ul>
            </div>
            {/* Đây là nơi hiển thị các đoạn chat, sau khi mình nhập input và gửi cho Hypo AI */}
            <div className={styles.chatHistory}>
              {/* Các đoạn chat sẽ được hiển thị ở đây */}
            </div>
            <div className={`${styles.inputChat} ${isInputFocused ? styles.inputChatFocused : ''}`}>
              <input 
                type="text" 
                placeholder="Ask Hypo AI anything..." 
                className={styles.inputField}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              <div className={styles.buttonList}>
                <div className={styles.attachButton}>
                  <i className="ri-notion-fill"></i>
                  <i className="ri-attachment-2"></i>
                  <i className="ri-at-line"></i>
                </div>
                <i className={`ri-send-plane-fill ${styles.sendButton}`}></i>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hypo;
