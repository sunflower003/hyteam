"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "../../context/ChatContext"
import styles from "../../styles/components/chat/MessageInput.module.css"

const MessageInput = ({ onSendMessage, placeholder = "Message..." }) => {
  const [message, setMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const { startTyping, stopTyping } = useChat()
  const inputRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const handleInputChange = (e) => {
    setMessage(e.target.value)

    // Typing indicators
    if (!isTyping && e.target.value.trim()) {
      setIsTyping(true)
      startTyping()
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing
    if (e.target.value.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
        stopTyping()
      }, 1000)
    } else {
      setIsTyping(false)
      stopTyping()
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!message.trim()) return

    onSendMessage(message.trim())
    setMessage("")

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false)
      stopTyping()
    }

    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    const textarea = inputRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = Math.min(textarea.scrollHeight, 144) + "px"
    }
  }, [message])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (isTyping) {
        stopTyping()
      }
    }
  }, [])

  return (
    <div className={styles.messageInputContainer}>
      <form onSubmit={handleSubmit} className={styles.messageForm}>
        {/* Attachment Button */}
        <button type="button" className={styles.attachmentBtn} title="Attach file">
          <i className="ri-add-circle-line"></i>
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
        </div>

        {/* Input Actions */}
        <div className={styles.inputActions}>
          <button type="button" className={styles.emojiBtn} title="Choose emoji">
            <i className="ri-emotion-line"></i>
          </button>

          <button type="button" className={styles.gifBtn} title="Choose GIF">
            <i className="ri-file-gif-line"></i>
          </button>

          <button type="button" className={styles.stickerBtn} title="Choose sticker">
            <i className="ri-sticker-line"></i>
          </button>
        </div>
      </form>

      {/* Character count (when approaching limit) */}
      {message.length > 1800 && (
        <div className={`${styles.characterCount} ${message.length > 1900 ? styles.danger : styles.warning}`}>
          {message.length}/2000
        </div>
      )}
    </div>
  )
}

export default MessageInput
