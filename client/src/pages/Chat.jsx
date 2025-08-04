import { useState, useEffect, useRef } from 'react';
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
    error,
    setActiveConversation,
    fetchConversations,
    createOrGetConversation
  } = useChat();

  const [showUserSearch, setShowUserSearch] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const hasFetched = useRef(false); // Add ref to prevent multiple fetches

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Only fetch once when component mounts
  useEffect(() => {
    console.log("📱 Chat component mounted");
    if (!hasFetched.current && conversations.length === 0 && !loading) {
      console.log("🔄 Triggering initial fetch");
      hasFetched.current = true;
      fetchConversations?.();
    }
  }, []); // Empty dependency array

  const handleSelectConversation = async (conversation) => {
    console.log("🎯 Selecting conversation:", conversation);
    await setActiveConversation(conversation);
  };

  const handleBackToList = () => {
    if (isMobile) {
      setActiveConversation(null);
    }
  };

  const handleSelectUser = async (user) => {
    try {
      console.log("👤 Creating conversation with user:", user);
      const conversation = await createOrGetConversation(user._id);
      await setActiveConversation(conversation);
      setShowUserSearch(false);
    } catch (error) {
      console.error("❌ Error creating conversation:", error);
      alert("Không thể tạo cuộc trò chuyện. Vui lòng thử lại.");
    }
  };

  // Manual refresh function
  const handleRefresh = () => {
    hasFetched.current = false;
    fetchConversations?.();
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

  if (error) {
    return (
      <div className={styles.chatContainer}>
        <div className={styles.error}>
          <h3>⚠️ Có lỗi xảy ra</h3>
          <p>{error}</p>
          <button onClick={handleRefresh}>
            Thử lại
          </button>
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
        {/* Conversation List */}
        <div className={`${styles.conversationSidebar} ${
          isMobile && activeConversation ? styles.hidden : ''
        }`}>
          <ConversationList
            conversations={conversations}
            activeConversation={activeConversation}
            onSelectConversation={handleSelectConversation}
          />
          
          {/* Debug info - only show conversation count */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{ padding: '10px', fontSize: '12px', color: '#666' }}>
              Conversations: {conversations.length}
              <button 
                onClick={handleRefresh} 
                style={{ marginLeft: '10px', fontSize: '10px' }}
              >
                Refresh
              </button>
            </div>
          )}
        </div>

        {/* Message Thread */}
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
          onSelectUser={handleSelectUser}
        />
      )}
    </div>
  );
};

export default Chat;