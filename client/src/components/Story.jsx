/*  client/src/components/Story.jsx  */
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import api from '../utils/api';
import { formatTimeAgo } from '../utils/formatters';
import styles from '../styles/components/Story.module.css';
import StoryUpload from './StoryUpload';

const Story = () => {
  /* ------------------------------------------------------------------ */
  /*  STATE                                                              */
  /* ------------------------------------------------------------------ */
  const { user: currentUser } = useAuth();
  const { socket } = useNotifications();
  const [users, setUsers] = useState([]);
  const [isViewingStory, setIsViewingStory]   = useState(false);
  const [currentStoryIndex, setCurrentStory]  = useState(0);
  const [currentStoryInGroup, setCurrentStoryInGroup] = useState(0); // ← NEW: current story in user's stories
  const [progress, setProgress]               = useState(0);
  const [isPaused, setIsPaused]               = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [isMobile, setIsMobile]               = useState(false);
  const [showUpload, setShowUpload]           = useState(false);
  const [loading, setLoading]                 = useState(true);
  const [ignoreFirstTap, setIgnoreFirstTap]   = useState(false);

  const fileInputRef = useRef(null);

  /* ------------------------------------------------------------------ */
  /*  FETCH STORIES FROM API                                            */
  /* ------------------------------------------------------------------ */
  const fetchAllStories = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all users first
      const usersResponse = await api.get('/api/profile/users');
      if (!usersResponse.data.success) {
        throw new Error('Failed to fetch users');
      }
      
      const allUsers = usersResponse.data.data.users;
      
      // Fetch stories from API
      const storiesResponse = await api.get('/api/stories');
      let storiesWithUsers = [];
      
      if (storiesResponse.data.success) {
        storiesWithUsers = storiesResponse.data.data.stories;
        console.log('Fetched stories:', storiesWithUsers);
      }

      // Merge all users with story data
      const usersWithStoryData = allUsers.map(user => {
        // Tìm story data cho user này
        const userStoryData = storiesWithUsers.find(storyGroup => 
          storyGroup.user._id === user._id
        );
        
        if (userStoryData) {
          // User có story - sử dụng data từ API
          return {
            ...user,
            hasStory: true,
            storyStatus: userStoryData.storyStatus,
            stories: userStoryData.stories
          };
        } else {
          // User chưa có story
          return {
            ...user,
            hasStory: false,
            storyStatus: 'none',
            stories: []
          };
        }
      });

      // Sort users theo priority: new stories > watched stories > no stories
      const sortedUsers = usersWithStoryData.sort((a, b) => {
        const priorityOrder = { 'new': 0, 'watched': 1, 'none': 2 };
        return priorityOrder[a.storyStatus] - priorityOrder[b.storyStatus];
      });
      
      setUsers(sortedUsers);
      
    } catch (error) {
      console.error('Error fetching stories:', error);
      
      // Fallback: still show users even if stories API fails
      try {
        const usersResponse = await api.get('/api/profile/users');
        if (usersResponse.data.success) {
          const allUsers = usersResponse.data.data.users.map(user => ({
            ...user,
            hasStory: false,
            storyStatus: 'none',
            stories: []
          }));
          setUsers(allUsers);
        }
      } catch (userError) {
        console.error('Error fetching users:', userError);
        // Complete fallback với current user
        const currentUserData = currentUser ? {
          _id: currentUser._id || 'current',
          username: currentUser.username || 'You',
          avatar: currentUser.avatar || '/img/duongqua.jpg',
          hasStory: false,
          storyStatus: 'none',
          stories: []
        } : null;
        
        const fallbackUsers = [
          ...(currentUserData ? [currentUserData] : []),
          { _id: 'user1', username: 'duongqua', avatar: '/img/duongqua.jpg', hasStory: false, storyStatus: 'none', stories: [] },
          { _id: 'user2', username: 'user2', avatar: '/img/duongqua.jpg', hasStory: false, storyStatus: 'none', stories: [] },
        ];
        setUsers(fallbackUsers);
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  /* ------------------------------------------------------------------ */
  /*  RESPONSIVE CHECK                                                   */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    fetchAllStories();
  }, [fetchAllStories]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Socket listener for real-time story updates
  useEffect(() => {
    if (!socket) return;

    console.log('📖 Setting up socket listeners for story updates');

    const handleNewStory = (data) => {
      console.log('📖 New story received:', data);
      
      // Refresh stories to get the new one
      fetchAllStories();
    };

    socket.on('new-story', handleNewStory);

    return () => {
      console.log('🧹 Cleaning up story socket listeners');
      socket.off('new-story', handleNewStory);
    };
  }, [socket, fetchAllStories]);

  /* ------------------------------------------------------------------ */
  /*  NAVIGATION FUNCTIONS                                               */
  /* ------------------------------------------------------------------ */
  const closeStory = () => { 
    setIsViewingStory(false); 
    setProgress(0); 
    setIsPaused(false);
    setCurrentStoryInGroup(0);
  };

  const handleNextStoryInSequence = useCallback(async () => {
    const usersWithStories = users.filter(user => user.hasStory);
    const currentUser = usersWithStories[currentStoryIndex];
    
    // Check if there are more stories for current user
    if (currentStoryInGroup < currentUser.stories.length - 1) {
      // Move to next story of same user
      setCurrentStoryInGroup(prev => prev + 1);
      setProgress(0);
      
      // Mark as viewed
      const nextStoryId = currentUser.stories[currentStoryInGroup + 1]?._id;
      if (nextStoryId) {
        markStoryAsViewed(nextStoryId);
      }
    } else {
      // Move to next user's stories
      if (currentStoryIndex < usersWithStories.length - 1) {
        setCurrentStory(idx => idx + 1);
        setCurrentStoryInGroup(0);
        setProgress(0);
        
        // Mark first story of next user as viewed
        const nextUser = usersWithStories[currentStoryIndex + 1];
        const firstStoryId = nextUser?.stories[0]?._id;
        if (firstStoryId) {
          markStoryAsViewed(firstStoryId);
        }
      } else {
        closeStory();
      }
    }
  }, [users, currentStoryIndex, currentStoryInGroup]);

  const handlePrevStoryInSequence = () => {
    if (currentStoryInGroup > 0) {
      // Previous story of same user
      setCurrentStoryInGroup(prev => prev - 1);
      setProgress(0);
    } else if (currentStoryIndex > 0) {
      // Previous user's last story
      const usersWithStories = users.filter(user => user.hasStory);
      const prevUser = usersWithStories[currentStoryIndex - 1];
      setCurrentStory(idx => idx - 1);
      setCurrentStoryInGroup(prevUser.stories.length - 1);
      setProgress(0);
    }
  };

  // Legacy functions for compatibility
  const handleNextStory = handleNextStoryInSequence;
  const handlePrevStory = handlePrevStoryInSequence;
  
  const handlePlayPause = () => {
    setIsManuallyPaused(prev => !prev);
  };

  /* ------------------------------------------------------------------ */
  /*  PROGRESS BAR                                                       */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    let interval;
    if (isViewingStory && !isPaused && !isManuallyPaused) {
      const usersWithStories = users.filter(user => user.hasStory);
      const currentUser = usersWithStories[currentStoryIndex];
      const currentStory = currentUser?.stories[currentStoryInGroup];
      const duration = currentStory?.duration || 15; // Default 15s
      
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            handleNextStoryInSequence();
            return 0;
          }
          return prev + (100 / (duration * 10)); // Update every 100ms
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isViewingStory, currentStoryIndex, currentStoryInGroup, isPaused, isManuallyPaused, handleNextStoryInSequence, users]);

  /* ------------------------------------------------------------------ */
  /*  VIEW / NAVIGATE STORY                                              */
  /* ------------------------------------------------------------------ */
  const openStory = useCallback(async (userIndex) => { 
    const usersWithStories = users.filter(user => user.hasStory);
    const targetUser = users[userIndex];
    const storyIndex = usersWithStories.findIndex(user => user._id === targetUser._id);
    
    setCurrentStory(storyIndex >= 0 ? storyIndex : 0);
    setCurrentStoryInGroup(0); // Start with first story in group
    setIsViewingStory(true);
    setProgress(0);
  // Avoid initial tap triggering next/prev immediately on iOS
  setIgnoreFirstTap(true);
  setTimeout(() => setIgnoreFirstTap(false), 400);

    // Mark first story as viewed
    const firstStoryId = targetUser.stories[0]?._id;
    if (firstStoryId) {
      markStoryAsViewed(firstStoryId);
    }
  }, [users]);

  // Open story by specific user ID (for notifications)
  const openStoryByUserId = useCallback(async (userId) => {
    // Find user index by userId
    const userIndex = users.findIndex(user => user._id === userId);
    if (userIndex === -1) {
      console.warn('User not found for story:', userId);
      return;
    }

    const targetUser = users[userIndex];
    if (!targetUser.hasStory || !targetUser.stories.length) {
      console.warn('User has no active stories:', userId);
      return;
    }

    // Open story for this user
    await openStory(userIndex);
  }, [users, openStory]);

  // Make openStoryByUserId available globally for notifications
  useEffect(() => {
    window.openStoryByUserId = openStoryByUserId;
    return () => {
      delete window.openStoryByUserId;
    };
  }, [users, openStoryByUserId]); // Re-attach when users data changes

  /* ------------------------------------------------------------------ */
  /*  STORY VIEW HANDLERS                                                */
  /* ------------------------------------------------------------------ */

  // Mark story as viewed via API
  const markStoryAsViewed = async (storyId) => {
    try {
      await api.post(`/api/stories/${storyId}/view`);
      // Update local state to reflect view status
      setUsers(prev => prev.map(userStory => ({
        ...userStory,
        stories: userStory.stories.map(story => 
          story._id === storyId 
            ? { ...story, hasViewed: true }
            : story
        )
      })));
    } catch (error) {
      console.error('Error marking story as viewed:', error);
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
  }, [isViewingStory, handleNextStory, handlePrevStory]);

  /* Touch navigation (mobile) */
  const handleContentClick = (e) => {
    if (!isMobile) return;
    if (ignoreFirstTap) return; // ignore initial opening tap
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    clickX > rect.width / 2 ? handleNextStory() : handlePrevStory();
  };

  // Lock body scroll while story viewer is open (prevents underlying page capturing touches)
  useEffect(() => {
    if (isViewingStory) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.webkitOverflowScrolling = 'auto';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.webkitOverflowScrolling = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.webkitOverflowScrolling = '';
    };
  }, [isViewingStory]);

  /* ------------------------------------------------------------------ */
  /*  UPLOAD STORY                                                       */
  /* ------------------------------------------------------------------ */
  const handleAddStory = () => {
    // Auto-trigger file picker when clicking Add Story
    setShowUpload(true);
  };
  
  const handleStoryUpload = () => {
    // Refresh stories after upload
    fetchAllStories();
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
            <p className={styles.storyAuthor}>
              {user.username}
            </p>
          </div>
        ))
      )}

      {/* ----------------------- STORY VIEWER -------------------------- */}
      {isViewingStory && users.length > 0 && (() => {
        const usersWithStories = users.filter(user => user.hasStory);
        const currentStoryUser = usersWithStories[currentStoryIndex];
        const currentStory = currentStoryUser?.stories[currentStoryInGroup];
        
        if (!currentStory) return null;

        // Helper: determine media type
        const isVideoStory = (story) => {
          if (!story) return false;
          if (story.mediaType && story.mediaType.startsWith('video')) return true;
          const url = story.mediaUrl || '';
          return /(\.mp4|\.mov|\.webm|\.m4v|\.3gp)(\?.*)?$/i.test(url);
        };

        // Calculate progress bars for multiple stories
        const progressBars = currentStoryUser.stories.map((_, index) => {
          let progressValue = 0;
          if (index < currentStoryInGroup) {
            progressValue = 100; // Completed
          } else if (index === currentStoryInGroup) {
            progressValue = progress; // Current progress
          }
          // Future stories remain at 0
          
          return (
            <div key={index} className={styles.progressSegment}>
              <div
                className={styles.progressFill}
                style={{ width: `${progressValue}%` }}
              />
            </div>
          );
        });

        // Generate styles for images
        const getImageStyle = () => {
          const filters = currentStory.filters || {};
          let filterString = '';
          
          if (filters.brightness !== 0) filterString += `brightness(${100 + filters.brightness}%) `;
          if (filters.contrast !== 0) filterString += `contrast(${100 + filters.contrast}%) `;
          if (filters.saturation !== 0) filterString += `saturate(${100 + filters.saturation}%) `;
          if (filters.blur > 0) filterString += `blur(${filters.blur}px) `;
          if (filters.blackAndWhite) filterString += 'grayscale(100%) ';
          if (filters.vintage) filterString += 'sepia(50%) ';

          return {
            backgroundImage: `url(${currentStory.mediaUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: filterString.trim()
          };
        };

        // Generate filter style for videos
        const getVideoFilterStyle = () => {
          const filters = currentStory.filters || {};
          let filterString = '';
          if (filters.brightness !== 0) filterString += `brightness(${100 + filters.brightness}%) `;
          if (filters.contrast !== 0) filterString += `contrast(${100 + filters.contrast}%) `;
          if (filters.saturation !== 0) filterString += `saturate(${100 + filters.saturation}%) `;
          if (filters.blur > 0) filterString += `blur(${filters.blur}px) `;
          if (filters.blackAndWhite) filterString += 'grayscale(100%) ';
          if (filters.vintage) filterString += 'sepia(50%) ';
          return { filter: filterString.trim() };
        };
        
        const viewer = (
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
                  style={{ opacity: (currentStoryIndex > 0 || currentStoryInGroup > 0) ? 1 : 0.3 }}
                />
              )}

              {/* Content */}
              <div
                className={styles.content}
                style={!isVideoStory(currentStory) ? getImageStyle() : undefined}
                onMouseDown={() => !isMobile && setIsPaused(true)}
                onMouseUp={() => !isMobile && setIsPaused(false)}
                onMouseLeave={() => !isMobile && setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
                onClick={handleContentClick}
              >
                {isVideoStory(currentStory) && (
                  <video
                    className={styles.storyVideo}
                    src={currentStory.mediaUrl}
                    playsInline
                    autoPlay
                    muted
                    loop
                    controls={false}
                    style={getVideoFilterStyle()}
                  />
                )}
                {/* Text Overlays */}
                {currentStory.textOverlays?.map((textOverlay, index) => (
                  <div
                    key={index}
                    className={styles.textOverlay}
                    style={{
                      position: 'absolute',
                      left: `${textOverlay.x}%`,
                      top: `${textOverlay.y}%`,
                      fontSize: `${textOverlay.fontSize}px`,
                      color: textOverlay.color,
                      fontFamily: textOverlay.fontFamily,
                      textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                      userSelect: 'none'
                    }}
                  >
                    {textOverlay.text}
                  </div>
                ))}

                {/* Gradient overlays */}
                <div className={`${styles.overlay} ${styles.top}`}></div>
                <div className={`${styles.overlay} ${styles.bottom}`}></div>

                {/* Header info inside viewer */}
                <div className={styles.contentHeader}>
                  {/* Progress bars for multiple stories */}
                  <div className={styles.progressContainer}>
                    {progressBars}
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
                      <div className={styles.authorInfo}>
                        <p className={styles.authorName}>{currentStoryUser?.username}</p>
                        <p className={styles.timeAgo}>
                          {formatTimeAgo(currentStory.createdAt)}
                        </p>
                      </div>
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

                {/* Story Content/Caption */}
                {currentStory.content && (
                  <div className={styles.storyContent}>
                    <p>{currentStory.content}</p>
                  </div>
                )}

                {/* Footer (reply, like, share) */}
                <div className={styles.contentFooter}>
                  <div className={styles.answer}>
                    <textarea placeholder="Reply to story..." />
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
                  style={{ 
                    opacity: (currentStoryIndex < usersWithStories.length - 1 || 
                             currentStoryInGroup < currentStoryUser.stories.length - 1) ? 1 : 0.3 
                  }}
                />
              )}
            </div>
          </div>
        );

        return createPortal(viewer, document.body);
      })()}
    </div>
  );
};

export default Story;
