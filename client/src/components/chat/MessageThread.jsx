import { useState, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import MessageInput from './MessageInput';
import styles from '../../styles/components/chat/MessageThread.module.css';

const MessageThread = ({ conversation, messages, onBack, showBackButton }) => {
  const { sendMessage, typingUsers, onlineUsers } = useChat();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const [replyingTo, setReplyingTo] = useState(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content) => {
    try {
      await sendMessage(content);
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatMessageTime = (date) => {
    return new Date(date).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isUserOnline = () => {
    if (conversation.type === 'group') return false;
    
    const otherParticipant = conversation.participants.find(p => p.user._id !== user.id);
    return otherParticipant && onlineUsers.has(otherParticipant.user._id);
  };

  const renderMessage = (message, index) => {
    const isOwnMessage = message.sender._id === user.id;
    const showAvatar = index === 0 || messages[index - 1].sender._id !== message.sender._id;
    const isLastInGroup = index === messages.length - 1 || 
                         messages[index + 1].sender._id !== message.sender._id;

    return (
      <div
        key={message._id}
        className={`${styles.messageContainer} ${
          isOwnMessage ? styles.ownMessage : styles.otherMessage
        }`}
      >
        {/* Avatar - chỉ hiển thị cho tin nhắn đầu tiên trong nhóm */}
        {!isOwnMessage && showAvatar && (
          <div className={styles.messageAvatar}>
            {message.sender.avatar ? (
              <img src={message.sender.avatar} alt={message.sender.username} />
            ) : (
              <div className={styles.defaultAvatar}>
                {message.sender.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}

        <div className={styles.messageContent}>
          {/* Sender name - chỉ hiển thị trong group chat và cho tin nhắn đầu tiên */}
          {!isOwnMessage && showAvatar && conversation.type === 'group' && (
            <div className={styles.senderName}>{message.sender.username}</div>
          )}

          {/* Reply to message */}
          {message.replyTo && (
            <div className={styles.replyContext}>
              <div className={styles.replyLine}></div>
              <div className={styles.replyContent}>
                <small>{message.replyTo.sender.username}</small>
                <p>{message.replyTo.content}</p>
              </div>
            </div>
          )}

          {/* Message bubble */}
          <div 
            className={`${styles.messageBubble} ${
              isLastInGroup ? styles.lastInGroup : ''
            }`}
          >
            <p>{message.content}</p>
            
            {/* Message time - chỉ hiển thị cho tin nhắn cuối trong nhóm */}
            {isLastInGroup && (
              <div className={styles.messageTime}>
                {formatMessageTime(message.createdAt)}
                {isOwnMessage && (
                  <span className={styles.messageStatus}>
                    {/* TODO: Implement read status */}
                    ✓✓
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Message actions */}
        <div className={styles.messageActions}>
          <button 
            className={styles.replyBtn}
            onClick={() => setReplyingTo(message)}
            title="Trả lời"
          >
            <i className="ri-reply-line"></i>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.messageThread}>
      {/* Header */}
      <div className={styles.threadHeader}>
        {showBackButton && (
          <button className={styles.backBtn} onClick={onBack}>
            <i className="ri-arrow-left-line"></i>
          </button>
        )}
        
        <div className={styles.conversationInfo}>
          <div className={styles.avatarContainer}>
            {conversation.avatar ? (
              <img src={conversation.avatar} alt={conversation.name} />
            ) : (
              <div className={styles.defaultAvatar}>
                {conversation.name.charAt(0).toUpperCase()}
              </div>
            )}
            {isUserOnline() && <div className={styles.onlineIndicator}></div>}
          </div>
          
          <div className={styles.conversationDetails}>
            <h3>{conversation.name}</h3>
            <p className={styles.status}>
              {isUserOnline() ? 'Đang hoạt động' : 'Không hoạt động'}
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.actionBtn} title="Thông tin cuộc trò chuyện">
            <i className="ri-information-line"></i>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.noMessages}>
            <div className={styles.noMessagesIcon}>💬</div>
            <h4>Bắt đầu cuộc trò chuyện</h4>
            <p>Gửi tin nhắn đầu tiên để bắt đầu trò chuyện</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => renderMessage(message, index))}
            
            {/* Typing indicators */}
            {typingUsers.length > 0 && (
              <div className={styles.typingIndicator}>
                <div className={styles.typingDots}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <p>đang nhập...</p>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Reply Context */}
      {replyingTo && (
        <div className={styles.replyContext}>
          <div className={styles.replyPreview}>
            <div className={styles.replyLine}></div>
            <div className={styles.replyInfo}>
              <strong>Trả lời {replyingTo.sender.username}</strong>
              <p>{replyingTo.content.substring(0, 100)}</p>
            </div>
          </div>
          <button 
            className={styles.cancelReply}
            onClick={() => setReplyingTo(null)}
          >
            <i className="ri-close-line"></i>
          </button>
        </div>
      )}

      {/* Message Input */}
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
};

export default MessageThread;