/*  client/src/components/Story.jsx  */
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import styles from '../styles/components/Story.module.css';
import StoryUpload from './StoryUpload';            // ← NEW

const Story = () => {
  /* ------------------------------------------------------------------ */
  /*  STATE                                                              */
  /* ------------------------------------------------------------------ */
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]); // ← NEW: Danh sách tất cả users
  const [isViewingStory, setIsViewingStory]   = useState(false);
  const [currentStoryIndex, setCurrentStory]  = useState(0);
  const [progress, setProgress]               = useState(0);
  const [isPaused, setIsPaused]               = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false); // ← NEW: track manual pause
  const [isMobile, setIsMobile]               = useState(false);
  const [showUpload, setShowUpload]           = useState(false); // ← NEW
  const [loading, setLoading]                 = useState(true); // ← NEW: loading state

  /* Danh sách story (mock) – sau này bạn thay bằng data từ API */
  const [stories, setStories] = useState([
    { id: 1, author: 'duongqua',      avatar: '/img/duongqua.jpg', image: '/img/duongqua.jpg', time: '1 hour', status: 'new'     },
    { id: 2, author: 'duongqua',      avatar: '/img/duongqua.jpg', image: '/img/duongqua.jpg', time: '2 hours', status: 'new'     },
    { id: 3, author: 'duongqua',      avatar: '/img/duongqua.jpg', image: '/img/duongqua.jpg', time: '3 hours', status: 'watched' },
    { id: 4, author: 'duongqua',      avatar: '/img/duongqua.jpg', image: '/img/duongqua.jpg', time: '4 hours', status: 'watched' },
    { id: 5, author: 'duongqua',      avatar: '/img/duongqua.jpg', image: '/img/duongqua.jpg', time: '5 hours', status: 'none'    },
    { id: 6, author: 'duongquagavcl', avatar: '/img/duongqua.jpg', image: '/img/duongqua.jpg', time: '6 hours', status: 'none'    }
  ]);

  const fileInputRef = useRef(null); // fallback nếu cần upload file thô

  /* ------------------------------------------------------------------ */
  /*  FETCH USERS                                                        */
  /* ------------------------------------------------------------------ */
  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      // Lấy tất cả users từ API
      const response = await api.get('/api/profile/users');
      if (response.data.success) {
        const allUsers = response.data.data.users;
        console.log('Fetched users:', allUsers);
        
        // Tạm thời set hasStory ngẫu nhiên để demo
        // Sau này sẽ có API riêng để check user nào có story
        const usersWithStoryStatus = allUsers.map((user, index) => ({
          ...user,
          hasStory: index % 3 === 0, // Mỗi user thứ 3 có story
          storyStatus: index % 3 === 0 ? (index % 2 === 0 ? 'new' : 'watched') : 'none'
        }));
        
        // Sắp xếp theo ưu tiên: chưa xem (new) -> đã xem (watched) -> không có story (none)
        const sortedUsers = usersWithStoryStatus.sort((a, b) => {
          const priorityOrder = { 'new': 0, 'watched': 1, 'none': 2 };
          return priorityOrder[a.storyStatus] - priorityOrder[b.storyStatus];
        });
        
        setUsers(sortedUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      // Fallback với empty array nếu API fail - cũng sắp xếp theo priority
      const fallbackUsers = [
        { _id: 'user1', username: 'duongqua', avatar: '/img/duongqua.jpg', hasStory: true, storyStatus: 'new' },
        { _id: 'user3', username: 'user3', avatar: '/img/duongqua.jpg', hasStory: true, storyStatus: 'watched' },
        { _id: 'user2', username: 'user2', avatar: '/img/duongqua.jpg', hasStory: false, storyStatus: 'none' },
        { _id: 'user4', username: 'user4', avatar: '/img/duongqua.jpg', hasStory: false, storyStatus: 'none' },
      ];
      
      // Sắp xếp fallback data cũng theo priority
      const sortedFallback = fallbackUsers.sort((a, b) => {
        const priorityOrder = { 'new': 0, 'watched': 1, 'none': 2 };
        return priorityOrder[a.storyStatus] - priorityOrder[b.storyStatus];
      });
      
      setUsers(sortedFallback);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  RESPONSIVE CHECK                                                   */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    fetchAllUsers();
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  /* ------------------------------------------------------------------ */
  /*  PROGRESS BAR                                                       */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    let interval;
    if (isViewingStory && !isPaused && !isManuallyPaused) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            handleNextStory();
            return 0;
          }
          return prev + 1;
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isViewingStory, currentStoryIndex, isPaused, isManuallyPaused]);

  /* ------------------------------------------------------------------ */
  /*  VIEW / NAVIGATE STORY                                              */
  /* ------------------------------------------------------------------ */
  const openStory  = (userIndex) => { 
    // Tìm index trong danh sách users có story
    const usersWithStories = users.filter(user => user.hasStory);
    const targetUser = users[userIndex];
    const storyIndex = usersWithStories.findIndex(user => user._id === targetUser._id);
    
    setCurrentStory(storyIndex >= 0 ? storyIndex : 0); 
    setIsViewingStory(true); 
    setProgress(0); 
  };
  const closeStory = ()      => { setIsViewingStory(false); setProgress(0); setIsPaused(false);   };

  const handleNextStory = () => {
    const usersWithStories = users.filter(user => user.hasStory);
    if (currentStoryIndex < usersWithStories.length - 1) {
      setCurrentStory(idx => idx + 1);
      setProgress(0);
    } else {
      closeStory();
    }
  };
  const handlePlayPause = () => {
    setIsManuallyPaused(prev => !prev);
  };

  const handlePrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStory(idx => idx - 1);
      setProgress(0);
    }
  };

  /* Keyboard navigation */
  useEffect(() => {
    const keyHandler = (e) => {
      if (!isViewingStory) return;
      if (e.key === 'Escape')      closeStory();
      else if (e.key === 'ArrowRight') handleNextStory();
      else if (e.key === 'ArrowLeft')  handlePrevStory();
    };
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [isViewingStory, currentStoryIndex]);

  /* Touch navigation (mobile) */
  const handleContentClick = (e) => {
    if (!isMobile) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    clickX > rect.width / 2 ? handleNextStory() : handlePrevStory();
  };

  /* ------------------------------------------------------------------ */
  /*  UPLOAD STORY                                                       */
  /* ------------------------------------------------------------------ */
  const handleAddStory   = () => setShowUpload(true);           // mở modal upload
  const handleStoryUpload = (newStory) => {                     // callback khi upload thành công
    setStories(prev => [newStory, ...prev]);
    setShowUpload(false);
  };

  /* Fallback file input (không dùng StoryUpload) */
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file?.type.startsWith('image/')) alert(`Đã chọn ảnh: ${file.name}`);
    e.target.value = '';
  };

  /* ------------------------------------------------------------------ */
  /*  UI HELPERS                                                         */
  /* ------------------------------------------------------------------ */
  const getStatusClass = (status) => {
    if (status === 'new')      return styles.new;
    if (status === 'watched')  return styles.watched;
    return styles.none;
  };

  // Generate random color for avatar background
  const getAvatarColor = (name) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
      '#A55EEA', '#26DE81', '#FD79A8', '#FDCB6E', '#6C5CE7'
    ];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  // Get first letter of username
  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  // Render avatar with default fallback
  const renderAvatar = (user) => {
    if (user?.avatar && user.avatar !== 'https://example.com/default-avatar.png') {
      return (
        <img 
          src={user.avatar} 
          alt="Avatar" 
          className={styles.avatar}
        />
      );
    } else {
      const initial = getInitial(user?.username);
      const bgColor = getAvatarColor(user?.username || 'User');
      return (
        <div 
          className={`${styles.avatar} ${styles.avatarDefault}`}
          style={{ backgroundColor: bgColor }}
        >
          {initial}
        </div>
      );
    }
  };

  /* ------------------------------------------------------------------ */
  /*  RENDER                                                             */
  /* ------------------------------------------------------------------ */
  return (
    <div className={styles.story}>
      {/* ----------------------- ADD STORY BUTTON ---------------------- */}
      <div className={styles.addStoryItem} onClick={handleAddStory}>
        <div className={styles.addStoryCircle}>
          <i className="ri-add-line" />
        </div>
        <p className={styles.addStoryText}>Add Story</p>
      </div>

      {/* ----------------------- HIDDEN INPUT (fallback) --------------- */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* ----------------------- STORY UPLOAD MODAL -------------------- */}
      <StoryUpload
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUpload={handleStoryUpload}
      />

      {/* ----------------------- STORY THUMBNAILS ---------------------- */}
      {loading ? (
        <div className={styles.loadingUsers}>
          <p>Loading users...</p>
        </div>
      ) : (
        users.map((user, idx) => (
          <div
            key={user._id}
            className={styles.storyItem}
            onClick={() => user.hasStory ? openStory(idx) : null}
            style={{ cursor: user.hasStory ? 'pointer' : 'default' }}
          >
            <div className={`${styles.storyImage} ${getStatusClass(user.storyStatus)}`}>
              {renderAvatar(user)}
            </div>
            <p className={styles.storyAuthor}>{user.username}</p>
          </div>
        ))
      )}

      {/* ----------------------- STORY VIEWER -------------------------- */}
      {isViewingStory && users.length > 0 && (() => {
        const usersWithStories = users.filter(user => user.hasStory);
        const currentStoryUser = usersWithStories[currentStoryIndex];
        
        return (
          <div className={styles.viewStory}>
            {/* Header (desktop) */}
            {!isMobile && (
              <div className={styles.header}>
                <h1 className={styles.logo}>HYTEAM</h1>
                <i className={`ri-close-large-line ${styles.close}`} onClick={closeStory}></i>
              </div>
            )}

            <div className={styles.player}>
              {/* Prev arrow (desktop) */}
              {!isMobile && (
                <i
                  className="ri-arrow-left-s-line"
                  onClick={handlePrevStory}
                  style={{ opacity: currentStoryIndex > 0 ? 1 : 0.3 }}
                />
              )}

              {/* Content */}
              <div
                className={styles.content}
                style={{
                  backgroundImage: `url(${currentStoryUser?.avatar || '/img/duongqua.jpg'})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
                onMouseDown={() => !isMobile && setIsPaused(true)}
                onMouseUp={() => !isMobile && setIsPaused(false)}
                onMouseLeave={() => !isMobile && setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
                onClick={handleContentClick}
              >
                {/* Gradient overlays */}
                <div className={`${styles.overlay} ${styles.top}`}></div>
                <div className={`${styles.overlay} ${styles.bottom}`}></div>

                {/* Header info inside viewer */}
                <div className={styles.contentHeader}>
                  {/* Progress bar */}
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className={styles.authorAndButton}>
                    <div className={styles.author}>
                      {currentStoryUser?.avatar ? (
                        <img
                          src={currentStoryUser.avatar}
                          alt="Author"
                          className={styles.avatarAuthor}
                        />
                      ) : (
                        <div 
                          className={`${styles.avatarAuthor} ${styles.avatarDefault}`}
                          style={{ backgroundColor: getAvatarColor(currentStoryUser?.username) }}
                        >
                          {getInitial(currentStoryUser?.username)}
                        </div>
                      )}
                      <p className={styles.authorName}>{currentStoryUser?.username}</p>
                      <p className={styles.timeAgo}>2 hours ago</p>
                    </div>

                    <div className={styles.actionButtons}>
                      {isMobile ? (
                        <i className="ri-close-large-line" onClick={closeStory}></i>
                      ) : (
                        <>
                          <i 
                            className={isManuallyPaused ? "ri-play-fill" : "ri-pause-fill"}
                            onClick={handlePlayPause}
                          ></i>
                          <i className="ri-more-fill"></i>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer (reply, like, share) */}
                <div className={styles.contentFooter}>
                  <div className={styles.answer}>
                    <textarea placeholder="Type your answer..." />
                  </div>
                  <i className="ri-heart-line"></i>
                  <i className="ri-send-plane-fill"></i>
                </div>
              </div>

              {/* Next arrow (desktop) */}
              {!isMobile && (
                <i
                  className="ri-arrow-right-s-line"
                  onClick={handleNextStory}
                  style={{ opacity: currentStoryIndex < usersWithStories.length - 1 ? 1 : 0.3 }}
                />
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Story;
