"use client"

import { useState } from "react"
import { useAuth } from "../../context/AuthContext"
import api from "../../utils/api"
import styles from "../../styles/components/chat/MessageItem.module.css"

const MessageItem = ({ message, onReply, onEdit, onDelete }) => {
  const { user } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [loading, setLoading] = useState(false)

  const isOwnMessage = message.sender._id === user?.id
  const isFileMessage = message.content.includes("📎")

  const handleEdit = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false)
      return
    }

    setLoading(true)
    try {
      const response = await api.put(`/api/chats/messages/${message._id}`, {
        content: editContent.trim(),
      })

      if (response.data.success) {
        onEdit?.(response.data.data)
        setIsEditing(false)
      }
    } catch (error) {
      console.error("Edit message error:", error)
      alert("Không thể chỉnh sửa tin nhắn")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc muốn xóa tin nhắn này?")) return

    setLoading(true)
    try {
      const response = await api.delete(`/api/chats/messages/${message._id}`)

      if (response.data.success) {
        onDelete?.(message._id)
      }
    } catch (error) {
      console.error("Delete message error:", error)
      alert("Không thể xóa tin nhắn")
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const renderFilePreview = (content) => {
    if (!content.includes("📎")) return content

    const lines = content.split("\n")
    const filename = lines[0].replace("📎 ", "")
    const url = lines[1]

    if (url && url.match(/\.(jpg|jpeg|png|gif)$/i)) {
      return (
        <div className={styles.fileMessage}>
          <img src={url || "/placeholder.svg"} alt={filename} className={styles.imagePreview} />
          <span className={styles.filename}>{filename}</span>
        </div>
      )
    }

    return (
      <div className={styles.fileMessage}>
        <i className="ri-file-line"></i>
        <a href={url} download={filename} className={styles.fileLink}>
          {filename}
        </a>
      </div>
    )
  }

  return (
    <div className={`${styles.message} ${isOwnMessage ? styles.sent : styles.received}`}>
      {!isOwnMessage && (
        <img
          src={message.sender.avatar || "/placeholder.svg?height=32&width=32"}
          alt={message.sender.username}
          className={styles.senderAvatar}
        />
      )}

      <div className={styles.messageContent}>
        {/* Reply reference */}
        {message.replyTo && (
          <div className={styles.replyReference}>
            <i className="ri-reply-line"></i>
            <span>{message.replyTo.content.substring(0, 30)}...</span>
          </div>
        )}

        {/* Message body */}
        {isEditing ? (
          <div className={styles.editMode}>
            <input
              type="text"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleEdit()}
              className={styles.editInput}
              autoFocus
            />
            <div className={styles.editActions}>
              <button onClick={handleEdit} disabled={loading}>
                <i className="ri-check-line"></i>
              </button>
              <button onClick={() => setIsEditing(false)}>
                <i className="ri-close-line"></i>
              </button>
            </div>
          </div>
        ) : (
          <div
            className={styles.messageText}
            onContextMenu={(e) => {
              e.preventDefault()
              setShowMenu(!showMenu)
            }}
          >
            {isFileMessage ? renderFilePreview(message.content) : message.content}

            {message.isEdited && <span className={styles.editedLabel}>(đã chỉnh sửa)</span>}
          </div>
        )}

        {/* Message info */}
        <div className={styles.messageInfo}>
          <span className={styles.timestamp}>{formatTime(message.createdAt)}</span>

          {isOwnMessage && (
            <button onClick={() => setShowMenu(!showMenu)} className={styles.menuBtn}>
              <i className="ri-more-line"></i>
            </button>
          )}
        </div>

        {/* Context Menu */}
        {showMenu && (
          <div className={styles.contextMenu}>
            <button
              onClick={() => {
                onReply?.(message)
                setShowMenu(false)
              }}
            >
              <i className="ri-reply-line"></i>
              Trả lời
            </button>

            {isOwnMessage && (
              <>
                <button
                  onClick={() => {
                    setIsEditing(true)
                    setShowMenu(false)
                  }}
                >
                  <i className="ri-edit-line"></i>
                  Chỉnh sửa
                </button>

                <button onClick={handleDelete} className={styles.deleteBtn}>
                  <i className="ri-delete-bin-line"></i>
                  Xóa
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageItem
