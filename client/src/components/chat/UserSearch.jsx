"use client"

import { useState, useEffect, useRef } from "react"
import { useChat } from "../../context/ChatContext"
import styles from "../../styles/components/chat/UserSearch.module.css"

const UserSearch = ({ onClose, onSelectUser }) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { searchUsers, createOrGetConversation, setActiveConversation } = useChat()
  const searchTimeoutRef = useRef(null)
  const inputRef = useRef(null)

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Debounced search with better error handling
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        setLoading(true)
        setError("")

        try {
          console.log("Searching for users:", searchQuery)
          const results = await searchUsers(searchQuery.trim())
          console.log("Search results:", results)

          setSearchResults(Array.isArray(results) ? results : [])

          if (!results || results.length === 0) {
            setError("Không tìm thấy người dùng nào phù hợp")
          }
        } catch (error) {
          console.error("Search error:", error)
          setError(error.message || "Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại.")
          setSearchResults([])
        } finally {
          setLoading(false)
        }
      }, 500) // Tăng debounce time để giảm API calls
    } else {
      setSearchResults([])
      setError("")
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, searchUsers])

  const handleSelectUser = async (user) => {
    try {
      setLoading(true)
      setError("")

      console.log("Creating conversation with user:", user)

      // Create or get existing conversation
      const conversation = await createOrGetConversation(user._id)
      console.log("Conversation created/found:", conversation)

      // Set as active conversation
      await setActiveConversation(conversation)

      // Call callback if provided
      if (onSelectUser) {
        onSelectUser(user)
      }

      // Close modal
      onClose()
    } catch (error) {
      console.error("Error creating conversation:", error)
      setError(error.message || "Không thể tạo cuộc trò chuyện. Vui lòng thử lại.")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setSearchQuery(value)

    // Clear results immediately if query is too short
    if (value.trim().length < 2) {
      setSearchResults([])
      setError("")
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Escape") {
      onClose()
    }
  }

  const renderUserAvatar = (user) => {
    if (user.avatar && user.avatar !== "https://example.com/default-avatar.png") {
      return (
        <img
          src={user.avatar || "/placeholder.svg"}
          alt={user.username}
          onError={(e) => {
            // Fallback to default avatar if image fails to load
            e.target.style.display = "none"
            e.target.nextSibling.style.display = "flex"
          }}
        />
      )
    }

    return null
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Tin nhắn mới</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="ri-close-line"></i>
          </button>
        </div>

        <div className={styles.modalContent}>
          {/* Search Input */}
          <div className={styles.searchContainer}>
            <div className={styles.searchInputWrapper}>
              <i className="ri-search-line"></i>
              <input
                ref={inputRef}
                type="text"
                placeholder="Tìm kiếm theo tên hoặc email..."
                value={searchQuery}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                className={styles.searchInput}
                disabled={loading}
              />
              {loading && (
                <div className={styles.inputSpinner}>
                  <i className="ri-loader-4-line ri-spin"></i>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className={styles.errorMessage}>
              <i className="ri-error-warning-line"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Search Results */}
          <div className={styles.resultsContainer}>
            {loading && searchQuery.trim().length >= 2 ? (
              <div className={styles.loading}>
                <div className={styles.loadingSpinner}></div>
                <p>Đang tìm kiếm...</p>
              </div>
            ) : searchQuery.trim().length < 2 ? (
              <div className={styles.placeholder}>
                <i className="ri-search-line"></i>
                <h4>Tìm kiếm người dùng</h4>
                <p>Nhập ít nhất 2 ký tự để bắt đầu tìm kiếm</p>
              </div>
            ) : searchResults.length === 0 && !error && !loading ? (
              <div className={styles.noResults}>
                <i className="ri-user-search-line"></i>
                <h4>Không tìm thấy kết quả</h4>
                <p>Thử tìm kiếm với từ khóa khác</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className={styles.usersList}>
                <div className={styles.resultsHeader}>
                  <span>{searchResults.length} kết quả tìm thấy</span>
                </div>

                {searchResults.map((user) => (
                  <div key={user._id} className={styles.userItem} onClick={() => handleSelectUser(user)}>
                    <div className={styles.userAvatar}>
                      {renderUserAvatar(user)}
                      <div className={styles.defaultAvatar}>
                        {user.username ? user.username.charAt(0).toUpperCase() : "?"}
                      </div>

                      {/* Online status indicator */}
                      {user.isActive && <div className={styles.onlineIndicator}></div>}
                    </div>

                    <div className={styles.userInfo}>
                      <h4>{user.username || "Unknown User"}</h4>
                      <p>{user.email || "No email"}</p>
                    </div>

                    <button className={styles.chatBtn} disabled={loading}>
                      <i className="ri-chat-1-line"></i>
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserSearch
