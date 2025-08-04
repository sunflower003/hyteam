"use client"
import { useChat } from "../../context/ChatContext"
import styles from "../../styles/components/chat/ConversationList.module.css"

const ConversationList = ({ conversations, activeConversation, onSelectConversation, activeFilter }) => {
  const { onlineUsers } = useChat()

  const filteredConversations = conversations.filter((conv) => {
    switch (activeFilter) {
      case "Unread":
        return conv.unreadCount > 0
      case "Groups":
        return conv.type === "group"
      case "Communities":
        return conv.type === "community"
      default:
        return true
    }
  })

  const formatTime = (date) => {
    const now = new Date()
    const messageDate = new Date(date)
    const diffInHours = (now - messageDate) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const minutes = Math.floor((now - messageDate) / (1000 * 60))
      return minutes < 1 ? "now" : `${minutes}m`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`
    } else {
      const days = Math.floor(diffInHours / 24)
      if (days === 1) return "1d"
      if (days < 7) return `${days}d`
      return messageDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }
  }

  const getLastMessagePreview = (message) => {
    if (!message) return "No messages yet"

    if (message.messageType === "image") return "📷 Photo"
    if (message.messageType === "file") return "📎 Attachment"

    return message.content.length > 50 ? message.content.substring(0, 50) + "..." : message.content
  }

  const isUserOnline = (conversation) => {
    if (conversation.type === "group") return false

    const otherParticipant = conversation.participants.find((p) => p.user._id !== "currentUserId")
    return otherParticipant && onlineUsers.has(otherParticipant.user._id)
  }

  return (
    <div className={styles.conversationList}>
      <div className={styles.conversationsContainer}>
        {filteredConversations.length === 0 ? (
          <div className={styles.noConversations}>
            <i className="ri-chat-3-line"></i>
            <p>No conversations found</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation._id}
              className={`${styles.conversationItem} ${
                activeConversation?._id === conversation._id ? styles.active : ""
              }`}
              onClick={() => onSelectConversation(conversation)}
            >
              {/* Avatar */}
              <div className={styles.avatarContainer}>
                {conversation.avatar ? (
                  <img src={conversation.avatar || "/placeholder.svg"} alt={conversation.name} />
                ) : (
                  <div className={styles.defaultAvatar}>{conversation.name.charAt(0).toUpperCase()}</div>
                )}

                {/* Online Status */}
                {isUserOnline(conversation) && <div className={styles.onlineIndicator}></div>}
              </div>

              {/* Conversation Info */}
              <div className={styles.conversationInfo}>
                <div className={styles.conversationHeader}>
                  <h4 className={styles.conversationName}>{conversation.name}</h4>
                  <span className={styles.lastMessageTime}>{formatTime(conversation.lastActivity)}</span>
                </div>

                <div className={styles.conversationFooter}>
                  <p className={styles.lastMessage}>{getLastMessagePreview(conversation.lastMessage)}</p>

                  {/* Unread Count */}
                  {conversation.unreadCount > 0 && (
                    <span className={styles.unreadBadge}>
                      {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ConversationList
