"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useChat } from "../context/ChatContext"
import { useAuth } from "../context/AuthContext" // ✅ THÊM IMPORT NÀY
import ConversationList from "../components/chat/ConversationList" // kept for potential direct desktop usage (list inside ChatSidebar)
import MessageThread from "../components/chat/MessageThread"
import UserSearch from "../components/chat/UserSearch"
import ChatInfo from "../components/chat/ChatInfo"
import ChatSidebar from "../components/chat/ChatSidebar"
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

  // Router helpers
  const { conversationId } = useParams()
  const navigate = useNavigate()

  const { user } = useAuth() // ✅ LẤY user TỪ AuthContext

  const [showUserSearch, setShowUserSearch] = useState(false)
  const [showChatInfo, setShowChatInfo] = useState(false)
  // Width-based (responsive breakpoint)
  const [isNarrowWidth, setIsNarrowWidth] = useState(false)
  // Device detection (force mobile UX even on large screen phones / tablets)
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [activeFilter, setActiveFilter] = useState("All")
  const [hasInitialized, setHasInitialized] = useState(false) 

  useEffect(() => {
    // Fetch conversations once
    if (!hasInitialized && user?.id) {
      fetchConversations()
      setHasInitialized(true)
    }
    const updateSizes = () => {
      if (typeof window !== 'undefined') {
        setIsNarrowWidth(window.innerWidth < 768)
      }
    }
    updateSizes()
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent
      const mobileRegex = /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i
      setIsMobileDevice(mobileRegex.test(ua))
    }
    window.addEventListener('resize', updateSizes)
    return () => window.removeEventListener('resize', updateSizes)
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
    if ((isMobileDevice || isNarrowWidth) && conversation?._id) {
      // Always route first; activeConversation will sync in effect from param
      navigate(`/chat/${conversation._id}`)
    } else {
      setActiveConversation(conversation)
    }
  }

  const handleBackToList = () => {
    if (isMobileDevice || isNarrowWidth) {
      navigate('/chat')
      // clear after navigation so list re-renders properly
      setActiveConversation(null)
    }
  }
  
  const handleNewChat = () => {
    setShowUserSearch(true)
  }

  const handleUserSelected = (user) => {
    // Future: create or get conversation then navigate
    setShowUserSearch(false)
  }

  const toggleChatInfo = () => {
    setShowChatInfo(!showChatInfo)
  }

  // Sync route param -> activeConversation when refreshing direct thread link
  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find(c => c._id === conversationId)
      if (conv && (!activeConversation || activeConversation._id !== conv._id)) {
        setActiveConversation(conv)
      }
    } else if (!conversationId && activeConversation) {
      // Only clear on mobile layout where we rely on route to distinguish list vs thread.
      if (isMobileDevice || isNarrowWidth) {
        setActiveConversation(null)
      }
    }
  }, [conversationId, conversations, activeConversation, setActiveConversation, isMobileDevice, isNarrowWidth])

  // Opt-in body/html scroll lock ONLY while inside chat route to preserve previous UX without leaking to other pages.
  useEffect(() => {
    document.documentElement.removeAttribute('data-chat-lock')
    document.body.removeAttribute('data-chat-lock')
    // Apply lock only on chat pages (list or thread) and only on mobile-width to mimic old intention
    if (location.pathname.startsWith('/chat') && (isMobileDevice || isNarrowWidth)) {
      document.documentElement.setAttribute('data-chat-lock', 'true')
      document.body.setAttribute('data-chat-lock', 'true')
    }
    return () => {
      document.documentElement.removeAttribute('data-chat-lock')
      document.body.removeAttribute('data-chat-lock')
    }
  }, [location.pathname, isMobileDevice, isNarrowWidth])

  // Removed previous global body scroll lock to allow other pages (Hyfeed, Notifications) to scroll normally.
  // If you need a conditional lock just for keyboard open inside thread, implement it locally inside MessageThread instead.
  // Defensive cleanup in case old lock persisted from a hot reload.
  useEffect(() => {
    const body = document.body
    if (body.style.position === 'fixed' && body.style.height === '100dvh') {
      body.style.overflow = ''
      body.style.position = ''
      body.style.width = ''
      body.style.height = ''
    }
  }, [])

  return (
    <div className={styles.chatContainer}>
      {loading && conversations.length === 0 && (
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <p>Đang tải tin nhắn...</p>
        </div>
      )}

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

      {/* --- MOBILE LIST PAGE (no conversation selected) --- */}
      {(isMobileDevice || isNarrowWidth) && !conversationId && !activeConversation && (
        <ChatSidebar
          conversations={conversations}
          activeConversation={activeConversation}
          onSelectConversation={handleSelectConversation}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          onNewChat={handleNewChat}
          showUserSearch={showUserSearch}
          onCloseUserSearch={() => setShowUserSearch(false)}
          onUserSelected={handleUserSelected}
          fullWidth
        />
      )}

      {/* --- MOBILE THREAD PAGE (conversation selected) --- */}
      {(isMobileDevice || isNarrowWidth) && conversationId && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          {activeConversation && (
            <MessageThread
              conversation={activeConversation}
              messages={messages}
              onBack={handleBackToList}
              showBackButton={true}
              onToggleChatInfo={toggleChatInfo}
              compact
              fixedInput
            />
          )}
          {showUserSearch && <UserSearch onClose={() => setShowUserSearch(false)} onSelectUser={handleUserSelected} />}
        </div>
      )}

      {/* --- DESKTOP / WIDE LAYOUT --- */}
      {!(isMobileDevice || isNarrowWidth) && (
        <div className={styles.chatContent}>
          <ChatSidebar
            conversations={conversations}
            activeConversation={activeConversation}
            onSelectConversation={handleSelectConversation}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            onNewChat={handleNewChat}
            showUserSearch={showUserSearch}
            onCloseUserSearch={() => setShowUserSearch(false)}
            onUserSelected={handleUserSelected}
          />
          <div className={`${styles.messageArea} ${!activeConversation ? styles.placeholder : ""}`}>
            {activeConversation ? (
              <MessageThread
                conversation={activeConversation}
                messages={messages}
                onBack={handleBackToList}
                showBackButton={false}
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
          {activeConversation && showChatInfo && (
            <div className={styles.chatInfoSidebar}>
              <ChatInfo conversation={activeConversation} onClose={() => setShowChatInfo(false)} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Chat
