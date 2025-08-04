"use client"

import { useState, useEffect, useRef } from "react"
import { useChat } from "../../context/ChatContext"
import { useAuth } from "../../context/AuthContext"
import MessageInput from "./MessageInput"
import styles from "../../styles/components/chat/MessageThread.module.css"

const MessageThread = ({ conversation, messages, onBack, showBackButton, onToggleChatInfo }) => {
  const { sendMessage, typingUsers, onlineUsers } = useChat()
  const { user } = useAuth()
  const messagesEndRef = useRef(null)
  const [replyingTo, setReplyingTo] = useState(null)

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (content) => {
    try {
      if (!content?.trim()) {
        console.warn("Empty message content")
        return
      }

      if (!conversation?._id) {
        console.warn("No active conversation")
        return
      }

      console.log("Sending message:", content, "ReplyTo:", replyingTo)
      await sendMessage(content, replyingTo)
      setReplyingTo(null)
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const formatMessageTime = (date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const isUserOnline = () => {
    if (conversation.type === "group") return false

    const otherParticipant = conversation.participants.find((p) => p.user._id !== user.id)
    return otherParticipant && onlineUsers.has(otherParticipant.user._id)
  }

  const shouldShowAvatar = (message, index) => {
    if (index === 0) return true
    const prevMessage = messages[index - 1]
    return prevMessage.sender._id !== message.sender._id
  }

  const shouldShowHeader = (message, index) => {
    if (index === 0) return true
    const prevMessage = messages[index - 1]
    const timeDiff = new Date(message.createdAt) - new Date(prevMessage.createdAt)
    return prevMessage.sender._id !== message.sender._id || timeDiff > 5 * 60 * 1000 // 5 minutes
  }

  const renderMessage = (message, index) => {
    const isOwnMessage = message.sender._id === user.id
    const showAvatar = shouldShowAvatar(message, index)
    const showHeader = shouldShowHeader(message, index)

    return (
      <div
        key={message._id}
        className={`${styles.messageContainer} ${isOwnMessage ? styles.ownMessage : styles.otherMessage}`}
      >
        {/* Avatar - only show for others and when needed */}
        <div className={styles.messageAvatar}>
          {!isOwnMessage && showAvatar ? (
            message.sender.avatar ? (
              <img src={message.sender.avatar || "/placeholder.svg"} alt={message.sender.username} />
            ) : (
              <div className={styles.defaultAvatar}>{message.sender.username.charAt(0).toUpperCase()}</div>
            )
          ) : null}
        </div>

        <div className={styles.messageContent}>
          {/* Message Header - show sender name and time */}
          {!isOwnMessage && showHeader && (
            <div className={styles.messageHeader}>
              <span className={styles.senderName}>{message.sender.username}</span>
              <span className={styles.messageTimestamp}>{formatMessageTime(message.createdAt)}</span>
            </div>
          )}

          {/* Reply Context */}
          {message.replyTo && (
            <div className={styles.replyContext}>
              <div className={styles.replyLine}></div>
              <div className={styles.replyContent}>
                <small>{message.replyTo.sender.username}</small>
                <p>{message.replyTo.content}</p>
              </div>
            </div>
          )}

          {/* Message Content */}
          <div className={styles.messageBubble}>
            <p>{message.content}</p>
          </div>
        </div>

        {/* Message Actions */}
        <div className={styles.messageActions}>
          <button className={styles.replyBtn} onClick={() => setReplyingTo(message)} title="Reply">
            <i className="ri-reply-line"></i>
          </button>
          <button className={styles.emojiBtn} title="Add reaction">
            <i className="ri-emotion-line"></i>
          </button>
          <button className={styles.moreBtn} title="More">
            <i className="ri-more-line"></i>
          </button>
        </div>
      </div>
    )
  }

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
              <img src={conversation.avatar || "/placeholder.svg"} alt={conversation.name} />
            ) : (
              <div className={styles.defaultAvatar}>{conversation.name.charAt(0).toUpperCase()}</div>
            )}
            {isUserOnline() && <div className={styles.onlineIndicator}></div>}
          </div>

          <div className={styles.conversationDetails}>
            <h3>{conversation.name}</h3>
            <p className={styles.status}>{isUserOnline() ? "Active now" : "Offline"}</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.actionBtn} title="Voice call">
            <i className="ri-phone-line"></i>
          </button>
          <button className={styles.actionBtn} title="Video call">
            <i className="ri-vidicon-line"></i>
          </button>
          <button className={styles.actionBtn} onClick={onToggleChatInfo} title="Chat info">
            <i className="ri-information-line"></i>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.noMessages}>
            <div className={styles.noMessagesIcon}>💬</div>
            <h4>Start the conversation</h4>
            <p>Send your first message to begin chatting</p>
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
                <p>
                  {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                </p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Reply Context Bar */}
      {replyingTo && (
        <div className={styles.replyContextBar}>
          <div className={styles.replyPreview}>
            <div className={styles.replyLine}></div>
            <div className={styles.replyInfo}>
              <strong>Replying to {replyingTo.sender.username}</strong>
              <p>{replyingTo.content.substring(0, 100)}</p>
            </div>
          </div>
          <button className={styles.cancelReply} onClick={() => setReplyingTo(null)}>
            <i className="ri-close-line"></i>
          </button>
        </div>
      )}

      {/* Message Input */}
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  )
}

export default MessageThread
