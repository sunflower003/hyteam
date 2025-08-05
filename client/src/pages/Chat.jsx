"use client"

import { useState, useEffect } from "react"
import { useChat } from "../context/ChatContext"
import { useAuth } from "../context/AuthContext" // ✅ THÊM IMPORT NÀY
import ConversationList from "../components/chat/ConversationList"
import MessageThread from "../components/chat/MessageThread"
import UserSearch from "../components/chat/UserSearch"
import ChatInfo from "../components/chat/ChatInfo"
import styles from "../styles/pages/Chat.module.css"

const Chat = () => {
  const {
    conversations,
    activeConversation,
    messages,
    loading,
    error,
    fetchConversations,
    setActiveConversation,
    clearError,
  } = useChat()

  const { user } = useAuth() // ✅ LẤY user TỪ AuthContext

  const [showUserSearch, setShowUserSearch] = useState(false)
  const [showChatInfo, setShowChatInfo] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [activeFilter, setActiveFilter] = useState("All")
  const [hasInitialized, setHasInitialized] = useState(false) 

  useEffect(() => {
    // ✅ CHỈ FETCH 1 LẦN KHI COMPONENT MOUNT
    if (!hasInitialized && user?.id) {
      fetchConversations()
      setHasInitialized(true)
    }

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [user?.id, hasInitialized, fetchConversations])

  // ✅ SEPARATE ERROR HANDLING
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, clearError])

  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation)
  }

  const handleBackToList = () => {
    if (isMobile) {
      setActiveConversation(null)
    }
  }

  const handleNewChat = () => {
    setShowUserSearch(true)
  }

  const handleUserSelected = (user) => {
    console.log("User selected for chat:", user)
    setShowUserSearch(false)
  }

  const toggleChatInfo = () => {
    setShowChatInfo(!showChatInfo)
  }

  if (loading && conversations.length === 0) {
    return (
      <div className={styles.chatContainer}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <p>Đang tải tin nhắn...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.chatContainer}>
      {/* Error notification */}
      {error && (
        <div className={styles.errorNotification}>
          <div className={styles.errorContent}>
            <i className="ri-error-warning-line"></i>
            <span>{error}</span>
            <button onClick={clearError}>
              <i className="ri-close-line"></i>
            </button>
          </div>
        </div>
      )}

      <div className={styles.chatContent}>
        {/* Conversation Sidebar */}
        <div className={`${styles.conversationSidebar} ${isMobile && activeConversation ? styles.hidden : ""}`}>
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarTitle}>
              <h1>Chats</h1>
              <div className={styles.headerActions}>
                <button className={styles.headerBtn} title="More options">
                  <i className="ri-more-line"></i>
                </button>
                <button className={styles.headerBtn} onClick={handleNewChat} title="New message">
                  <i className="ri-edit-line"></i>
                </button>
              </div>
            </div>

            <div className={styles.searchContainer}>
              <div className={styles.searchInputWrapper}>
                <i className={`ri-search-line ${styles.searchIcon}`}></i>
                <input type="text" placeholder="Search Messenger" className={styles.searchInput} />
              </div>

              <div className={styles.filterTabs}>
                {["All", "Unread", "Groups", "Communities"].map((filter) => (
                  <button
                    key={filter}
                    className={`${styles.filterTab} ${activeFilter === filter ? styles.active : ""}`}
                    onClick={() => setActiveFilter(filter)}
                  >
                    {filter}
                    {filter === "Communities" && <sup>+</sup>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ConversationList
            conversations={conversations}
            activeConversation={activeConversation}
            onSelectConversation={handleSelectConversation}
            activeFilter={activeFilter}
          />
        </div>

        {/* Message Area */}
        <div className={`${styles.messageArea} ${!activeConversation ? styles.placeholder : ""}`}>
          {activeConversation ? (
            <MessageThread
              conversation={activeConversation}
              messages={messages}
              onBack={handleBackToList}
              showBackButton={isMobile}
              onToggleChatInfo={toggleChatInfo}
            />
          ) : (
            <div className={styles.noConversation}>
              <div className={styles.noConversationIcon}>💬</div>
              <h3>Chọn một cuộc trò chuyện</h3>
              <p>Chọn từ danh sách bên trái hoặc tạo cuộc trò chuyện mới</p>
              <button className={styles.startChatBtn} onClick={handleNewChat}>
                <i className="ri-add-line"></i>
                Bắt đầu trò chuyện
              </button>
            </div>
          )}
        </div>

        {/* Chat Info Sidebar */}
        {activeConversation && showChatInfo && !isMobile && (
          <div className={styles.chatInfoSidebar}>
            <ChatInfo conversation={activeConversation} onClose={() => setShowChatInfo(false)} />
          </div>
        )}
      </div>

      {/* User Search Modal */}
      {showUserSearch && <UserSearch onClose={() => setShowUserSearch(false)} onSelectUser={handleUserSelected} />}
    </div>
  )
}

export default Chat
