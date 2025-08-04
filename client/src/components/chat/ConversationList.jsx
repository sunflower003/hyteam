import { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import styles from '../../styles/components/chat/ConversationList.module.css';

const ConversationList = ({ conversations, activeConversation, onSelectConversation }) => {
  const { onlineUsers } = useChat();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const minutes = Math.floor((now - messageDate) / (1000 * 60));
      return minutes < 1 ? 'Vừa xong' : `${minutes}p`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else {
      return messageDate.toLocaleDateString('vi-VN');
    }
  };

  const getLastMessagePreview = (message) => {
    if (!message) return 'Chưa có tin nhắn nào';
    
    if (message.messageType === 'image') return '📷 Hình ảnh';
    if (message.messageType === 'file') return '📎 File đính kèm';
    
    return message.content.length > 50 
      ? message.content.substring(0, 50) + '...'
      : message.content;
  };

  const isUserOnline = (conversation) => {
    if (conversation.type === 'group') return false;
    
    const otherParticipant = conversation.participants.find(p => p.user._id !== 'currentUserId');
    return otherParticipant && onlineUsers.has(otherParticipant.user._id);
  };

  return (
    <div className={styles.conversationList}>
      {/* Search Bar */}
      <div className={styles.searchContainer}>
        <div className={styles.searchInputWrapper}>
          <i className="ri-search-line"></i>
          <input
            type="text"
            placeholder="Tìm kiếm cuộc trò chuyện..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Conversations */}
      <div className={styles.conversationsContainer}>
        {filteredConversations.length === 0 ? (
          <div className={styles.noConversations}>
            <p>Chưa có cuộc trò chuyện nào</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation._id}
              className={`${styles.conversationItem} ${
                activeConversation?._id === conversation._id ? styles.active : ''
              }`}
              onClick={() => onSelectConversation(conversation)}
            >
              {/* Avatar */}
              <div className={styles.avatarContainer}>
                {conversation.avatar ? (
                  <img src={conversation.avatar} alt={conversation.name} />
                ) : (
                  <div className={styles.defaultAvatar}>
                    {conversation.name.charAt(0).toUpperCase()}
                  </div>
                )}
                
                {/* Online Status */}
                {isUserOnline(conversation) && (
                  <div className={styles.onlineIndicator}></div>
                )}
              </div>

              {/* Conversation Info */}
              <div className={styles.conversationInfo}>
                <div className={styles.conversationHeader}>
                  <h4 className={styles.conversationName}>{conversation.name}</h4>
                  <span className={styles.lastMessageTime}>
                    {formatTime(conversation.lastActivity)}
                  </span>
                </div>
                
                <div className={styles.conversationFooter}>
                  <p className={styles.lastMessage}>
                    {getLastMessagePreview(conversation.lastMessage)}
                  </p>
                  
                  {/* Unread Count */}
                  {conversation.unreadCount > 0 && (
                    <span className={styles.unreadBadge}>
                      {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;