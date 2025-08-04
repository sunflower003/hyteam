import { useState, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import styles from '../../styles/components/chat/UserSearch.module.css';

const UserSearch = ({ onClose, onSelectUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { searchUsers, createOrGetConversation, setActiveConversation } = useChat();
  const searchTimeoutRef = useRef(null);

  // Debounced search with better error handling
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        setLoading(true);
        setError('');
        
        try {
          const results = await searchUsers(searchQuery.trim());
          setSearchResults(results);
          
          if (results.length === 0) {
            setError('Không tìm thấy người dùng nào phù hợp');
          }
        } catch (error) {
          console.error('Search error:', error);
          setError('Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại.');
          setSearchResults([]);
        } finally {
          setLoading(false);
        }
      }, 500); // Tăng debounce time để giảm API calls
    } else {
      setSearchResults([]);
      setError('');
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchUsers]);

  const handleSelectUser = async (user) => {
    try {
      setLoading(true);
      setError('');
      
      // Create or get existing conversation
      const conversation = await createOrGetConversation(user._id);
      
      // Set as active conversation
      await setActiveConversation(conversation);
      
      // Call callback if provided
      onSelectUser?.(user);
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error creating conversation:', error);
      setError('Không thể tạo cuộc trò chuyện. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Clear results immediately if query is too short
    if (value.trim().length < 2) {
      setSearchResults([]);
      setError('');
    }
  };

  const renderUserAvatar = (user) => {
    if (user.avatar && user.avatar !== 'https://example.com/default-avatar.png') {
      return (
        <img 
          src={user.avatar} 
          alt={user.username}
          onError={(e) => {
            // Fallback to default avatar if image fails to load
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      );
    }
    
    return (
      <div className={styles.defaultAvatar}>
        {user.username.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
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
                type="text"
                placeholder="Tìm kiếm theo tên hoặc email..."
                value={searchQuery}
                onChange={handleInputChange}
                className={styles.searchInput}
                autoFocus
                disabled={loading}
              />
              {loading && (
                <div className={styles.inputSpinner}>
                  <i className="ri-loader-4-line"></i>
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
            ) : searchResults.length === 0 && !error ? (
              <div className={styles.noResults}>
                <i className="ri-user-search-line"></i>
                <h4>Không tìm thấy kết quả</h4>
                <p>Thử tìm kiếm với từ khóa khác</p>
              </div>
            ) : (
              <div className={styles.usersList}>
                <div className={styles.resultsHeader}>
                  <span>{searchResults.length} kết quả tìm thấy</span>
                </div>
                
                {searchResults.map(user => (
                  <div
                    key={user._id}
                    className={styles.userItem}
                    onClick={() => handleSelectUser(user)}
                  >
                    <div className={styles.userAvatar}>
                      {renderUserAvatar(user)}
                      <div className={styles.defaultAvatar} style={{ display: 'none' }}>
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      
                      {/* Online status indicator */}
                      {user.isOnline && (
                        <div className={styles.onlineIndicator}></div>
                      )}
                    </div>
                    
                    <div className={styles.userInfo}>
                      <h4>{user.username}</h4>
                      <p>{user.email}</p>
                    </div>

                    <button 
                      className={styles.chatBtn}
                      disabled={loading}
                    >
                      <i className="ri-chat-1-line"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSearch;