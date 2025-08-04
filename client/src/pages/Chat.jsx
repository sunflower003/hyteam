import { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import ConversationList from '../components/chat/ConversationList';
import MessageThread from '../components/chat/MessageThread';
import UserSearch from '../components/chat/UserSearch';
import styles from '../styles/pages/Chat.module.css';

const Chat = () => {
  const {
    conversations,
    activeConversation,
    messages,
    loading,
    setActiveConversation
    // 🚫 Remove state, fetchConversations - causing infinite loop
  } = useChat();

  const [showUserSearch, setShowUserSearch] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Only handle resize - Remove all fetchConversations calls
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 🚫 REMOVE both useEffect with fetchConversations
  // Let ChatContext handle fetching automatically

  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation);
  };

  const handleBackToList = () => {
    if (isMobile) {
      setActiveConversation(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.chatContainer}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <p>Đang tải tin nhắn...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chatContainer}>
      {/* Header */}
      <div className={styles.chatHeader}>
        <div className={styles.headerLeft}>
          <h1>💬 Chat</h1>
          <p>Nhắn tin với team của bạn</p>
        </div>
        <button 
          className={styles.newChatBtn}
          onClick={() => setShowUserSearch(true)}
        >
          <i className="ri-add-line"></i>
          Tin nhắn mới
        </button>
      </div>

      <div className={styles.chatContent}>
        {/* Conversation List - Ẩn trên mobile khi có active conversation */}
        <div className={`${styles.conversationSidebar} ${
          isMobile && activeConversation ? styles.hidden : ''
        }`}>
          <ConversationList
            conversations={conversations}
            activeConversation={activeConversation}
            onSelectConversation={handleSelectConversation}
          />
        </div>

        {/* Message Thread - Hiển thị khi có active conversation */}
        <div className={`${styles.messageArea} ${
          !activeConversation ? styles.placeholder : ''
        }`}>
          {activeConversation ? (
            <MessageThread
              conversation={activeConversation}
              messages={messages}
              onBack={handleBackToList}
              showBackButton={isMobile}
            />
          ) : (
            <div className={styles.noConversation}>
              <div className={styles.noConversationIcon}>💬</div>
              <h3>Chọn một cuộc trò chuyện</h3>
              <p>Chọn từ danh sách bên trái hoặc tạo cuộc trò chuyện mới</p>
              <button 
                className={styles.startChatBtn}
                onClick={() => setShowUserSearch(true)}
              >
                Bắt đầu trò chuyện
              </button>
            </div>
          )}
        </div>
      </div>

      {/* User Search Modal */}
      {showUserSearch && (
        <UserSearch 
          onClose={() => setShowUserSearch(false)}
          onSelectUser={(user) => {
            // Logic để tạo conversation và chuyển đến đó
            setShowUserSearch(false);
          }}
        />
      )}
    </div>
  );
};

export default Chat;