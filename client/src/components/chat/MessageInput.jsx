import { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import styles from '../../styles/components/chat/MessageInput.module.css';

const MessageInput = ({ onSendMessage, placeholder = "Nhập tin nhắn..." }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { startTyping, stopTyping } = useChat();
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    
    // Typing indicators
    if (!isTyping) {
      setIsTyping(true);
      startTyping();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping();
    }, 1000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    onSendMessage(message.trim());
    setMessage('');
    
    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      stopTyping();
    }
    
    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [message]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping) {
        stopTyping();
      }
    };
  }, []);

  return (
    <div className={styles.messageInputContainer}>
      <form onSubmit={handleSubmit} className={styles.messageForm}>
        {/* Attachment Button */}
        <button 
          type="button" 
          className={styles.attachmentBtn}
          title="Đính kèm file"
        >
          <i className="ri-attachment-2"></i>
        </button>

        {/* Message Input */}
        <div className={styles.inputWrapper}>
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className={styles.messageInput}
            rows={1}
            maxLength={2000}
          />
          
          {/* Emoji Button */}
          <button 
            type="button" 
            className={styles.emojiBtn}
            title="Chọn emoji"
          >
            <i className="ri-emotion-line"></i>
          </button>
        </div>

        {/* Send Button */}
        <button 
          type="submit" 
          className={`${styles.sendBtn} ${message.trim() ? styles.active : ''}`}
          disabled={!message.trim()}
          title="Gửi tin nhắn"
        >
          <i className="ri-send-plane-2-fill"></i>
        </button>
      </form>

      {/* Character count (when approaching limit) */}
      {message.length > 1800 && (
        <div className={styles.characterCount}>
          {message.length}/2000
        </div>
      )}
    </div>
  );
};

export default MessageInput;