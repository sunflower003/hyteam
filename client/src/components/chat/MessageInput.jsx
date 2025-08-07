"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "../../context/ChatContext"
import api from "../../utils/api"
import styles from "../../styles/components/chat/MessageInput.module.css"

const MessageInput = ({ onSendMessage, replyingTo, onCancelReply }) => {
  const { startTyping, stopTyping } = useChat()
  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const inputRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Handle file upload
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await api.post("/api/chats/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      if (response.data.success) {
        // Send file message
        const fileMessage = `📎 ${response.data.data.filename}\n${response.data.data.url}`
        onSendMessage(fileMessage)
      }
    } catch (error) {
      console.error("File upload error:", error)
      alert("Không thể upload file. Vui lòng thử lại.")
    } finally {
      setUploading(false)
      e.target.value = "" // Reset input
    }
  }

  const handleInputChange = (e) => {
    setNewMessage(e.target.value)

    // Typing indicators
    if (e.target.value.trim() && !isTyping) {
      startTyping()
      setIsTyping(true)
    } else if (!e.target.value.trim() && isTyping) {
      stopTyping()
      setIsTyping(false)
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

    if (!newMessage.trim()) return

    try {
      onSendMessage(newMessage.trim(), replyingTo?._id)
      setNewMessage("")
      stopTyping()
      setIsTyping(false)
    } catch (error) {
      console.error("Error in MessageInput handleSubmit:", error)
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
    const input = inputRef.current
    if (input) {
      input.style.height = "auto"
      input.style.height = Math.min(input.scrollHeight, 144) + "px"
    }
  }, [newMessage])

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
      {/* Reply Preview */}
      {replyingTo && (
        <div className={styles.replyPreview}>
          <div className={styles.replyContent}>
            <i className="ri-reply-line"></i>
            <span>Đang trả lời: {replyingTo.content.substring(0, 50)}...</span>
          </div>
          <button onClick={onCancelReply} className={styles.cancelReply}>
            <i className="ri-close-line"></i>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.messageForm}>
        {/* File Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={styles.attachmentBtn}
          disabled={uploading}
          title="Đính kèm file"
        >
          {uploading ? <i className="ri-loader-4-line ri-spin"></i> : <i className="ri-add-circle-line"></i>}
        </button>

        {/* Message Input */}
        <div className={styles.inputWrapper}>
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Message..."
            className={styles.messageInput}
            rows={1}
            maxLength={2000}
            disabled={uploading}
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

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept="image/*,application/pdf,.doc,.docx,.txt"
          style={{ display: "none" }}
        />
      </form>

      {/* Character count (when approaching limit) */}
      {newMessage.length > 1800 && (
        <div className={`${styles.characterCount} ${newMessage.length > 1900 ? styles.danger : styles.warning}`}>
          {newMessage.length}/2000
        </div>
      )}
    </div>
  )
}

export default MessageInput
