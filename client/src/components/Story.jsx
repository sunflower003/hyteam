/*  client/src/components/Story.jsx  */
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import styles from '../styles/components/Story.module.css';
import StoryUpload from './StoryUpload';

const Story = () => {
  /* ------------------------------------------------------------------ */
  /*  STATE                                                              */
  /* ------------------------------------------------------------------ */
  const { user: currentUser } = useAuth();
  const [stories, setStories] = useState([]);
  const [isViewingStory, setIsViewingStory] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  /* ------------------------------------------------------------------ */
  /*  FETCH STORIES FROM API                                            */
  /* ------------------------------------------------------------------ */
  const fetchStories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/stories');
      console.log('📖 Stories API response:', response.data);
      
      if (response.data.success) {
        const apiStories = response.data.stories || [];
        
        // Format stories từ API để phù hợp với UI
        const formattedStories = apiStories.map(story => ({
          id: story.id || story._id,
          author: story.author || story.userId?.username || 'Unknown',
          avatar: story.avatar || story.userId?.avatar || null,
          image: story.image || story.mediaUrl,
          time: story.time || formatTimeAgo(story.createdAt || story.updatedAt),
          status: determineStoryStatus(story, currentUser?.id),
          mediaType: story.mediaType || 'image',
          content: story.content || '',
          userId: story.userId?._id || story.userId,
          createdAt: story.createdAt,
          viewCount: story.viewCount || 0
        }));

        // Thêm current user nếu chưa có story
        const currentUserStory = formattedStories.find(story => 
          story.userId === currentUser?.id
        );

        let allStories = [...formattedStories];
        
        // Nếu current user chưa có story, thêm placeholder
        if (!currentUserStory && currentUser) {
          allStories.unshift({
            id: 'add-story',
            author: currentUser.username,
            avatar: currentUser.avatar,
            image: null,
            time: '',
            status: 'add',
            isAddStory: true,
            userId: currentUser.id
          });
        }

        // Sắp xếp: current user -> new stories -> watched stories -> others
        const sortedStories = allStories.sort((a, b) => {
          // Current user hoặc add story lên đầu
          if (a.isAddStory || a.userId === currentUser?.id) return -1;
          if (b.isAddStory || b.userId === currentUser?.id) return 1;
          
          // Sắp xếp theo priority status
          const priorityOrder = { 'new': 0, 'watched': 1, 'none': 2 };
          const aPriority = priorityOrder[a.status] || 2;
          const bPriority = priorityOrder[b.status] || 2;
          
          if (aPriority !== bPriority) return aPriority - bPriority;
          
          // Cùng priority thì sắp xếp theo thời gian tạo
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });

        setStories(sortedStories);
        console.log('✅ Stories loaded:', sortedStories.length);
      } else {
        throw new Error(response.data.message || 'Failed to fetch stories');
      }
    } catch (error) {
      console.error('❌ Error fetching stories:', error);
      setError(error.message);
      
      // Fallback với mock data nếu API fail
      const fallbackStories = [
        {
          id: 'add-story',
          author: currentUser?.username || 'You',
          avatar: currentUser?.avatar,
          image: null,
          time: '',
          status: 'add',
          isAddStory: true,
          userId: currentUser?.id
        },
        { 
          id: 1, 
          author: 'duongqua', 
          avatar: '/img/duongqua.jpg', 
          image: '/img/duongqua.jpg', 
          time: '1 hour', 
          status: 'new',
          userId: 'user1'
        },
        { 
          id: 2, 
          author: 'user2', 
          avatar: '/img/duongqua.jpg', 
          image: '/img/duongqua.jpg', 
          time: '2 hours', 
          status: 'watched',
          userId: 'user2'
        }
      ];
      
      setStories(fallbackStories);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  HELPER FUNCTIONS                                                   */
  /* ------------------------------------------------------------------ */
  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'now';
    
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const determineStoryStatus = (story, currentUserId) => {
    if (!story) return 'none';
    
    // Nếu là story của current user
    if (story.userId === currentUserId) return 'own';
    
    // Check nếu user đã xem story này (có thể dựa vào viewers array)
    if (story.viewers && Array.isArray(story.viewers)) {
      const hasViewed = story.viewers.some(viewer => 
        viewer.userId === currentUserId || viewer === currentUserId
      );
      return hasViewed ? 'watched' : 'new';
    }
    
    // Mặc định là new nếu không có thông tin viewers
    return 'new';
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'new': return styles.new;
      case 'watched': return styles.watched;
      case 'own': return styles.own;
      case 'add': return styles.add;
      default: return styles.none;
    }
  };

  const getAvatarColor = (name) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
      '#A55EEA', '#26DE81', '#FD79A8', '#FDCB6E', '#6C5CE7'
    ];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const renderAvatar = (story) => {
    if (story.isAddStory) {
      return (
        <div className={styles.addStoryCircle}>
          <i className="ri-add-line" />
        </div>
      );
    }

    if (story.avatar && story.avatar !== 'https://example.com/default-avatar.png') {
      return (
        <img 
          src={story.avatar} 
          alt={`${story.author}'s avatar`}
          className={styles.avatar}
          onError={(e) => {
            // Fallback nếu ảnh lỗi
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      );
    }

    const initial = getInitial(story.author);
    const bgColor = getAvatarColor(story.author);
    return (
      <div 
        className={`${styles.avatar} ${styles.avatarDefault}`}
        style={{ backgroundColor: bgColor }}
      >
        {initial}
      </div>
    );
  };

  /* ------------------------------------------------------------------ */
  /*  LIFECYCLE                                                          */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    fetchStories();
  }, [currentUser]);

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
      }, 150); // 15 seconds total (100 * 150ms)
    }
    return () => clearInterval(interval);
  }, [isViewingStory, currentStoryIndex, isPaused, isManuallyPaused]);

  /* ------------------------------------------------------------------ */
  /*  STORY NAVIGATION                                                   */
  /* ------------------------------------------------------------------ */
  const openStory = (index) => {
    const story = stories[index];
    
    // Nếu là add story button, mở upload modal
    if (story?.isAddStory) {
      setShowUpload(true);
      return;
    }

    // Lọc ra những story có thể xem (không phải add story)
    const viewableStories = stories.filter(s => !s.isAddStory && s.image);
    const storyIndex = viewableStories.findIndex(s => s.id === story.id);
    
    if (storyIndex >= 0) {
      setCurrentStoryIndex(storyIndex);
      setIsViewingStory(true);
      setProgress(0);
      setIsManuallyPaused(false);
      
      // Mark story as viewed (call API)
      markStoryAsViewed(story.id);
    }
  };

  const closeStory = () => {
    setIsViewingStory(false);
    setProgress(0);
    setIsPaused(false);
    setIsManuallyPaused(false);
  };

  const handleNextStory = () => {
    const viewableStories = stories.filter(s => !s.isAddStory && s.image);
    
    if (currentStoryIndex < viewableStories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
      setProgress(0);
      
      // Mark new story as viewed
      const nextStory = viewableStories[currentStoryIndex + 1];
      markStoryAsViewed(nextStory.id);
    } else {
      closeStory();
    }
  };

  const handlePrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  const handlePlayPause = () => {
    setIsManuallyPaused(prev => !prev);
  };

  const markStoryAsViewed = async (storyId) => {
    try {
      await api.post(`/api/stories/${storyId}/view`);
      console.log('✅ Story marked as viewed:', storyId);
      
      // Update local state
      setStories(prev => prev.map(story => 
        story.id === storyId 
          ? { ...story, status: 'watched' }
          : story
      ));
    } catch (error) {
      console.error('❌ Error marking story as viewed:', error);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  KEYBOARD & TOUCH NAVIGATION                                        */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const keyHandler = (e) => {
      if (!isViewingStory) return;
      
      switch (e.key) {
        case 'Escape':
          closeStory();
          break;
        case 'ArrowRight':
        case ' ': // Spacebar
          handleNextStory();
          break;
        case 'ArrowLeft':
          handlePrevStory();
          break;
        case 'p':
        case 'P':
          handlePlayPause();
          break;
      }
    };

    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [isViewingStory, currentStoryIndex]);

  const handleContentClick = (e) => {
    if (!isMobile) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickWidth = rect.width;
    
    // Chia màn hình thành 3 vùng: prev (30%), pause (40%), next (30%)
    if (clickX < clickWidth * 0.3) {
      handlePrevStory();
    } else if (clickX > clickWidth * 0.7) {
      handleNextStory();
    } else {
      // Middle area - pause/play
      handlePlayPause();
    }
  };

  /* ------------------------------------------------------------------ */
  /*  UPLOAD STORY                                                       */
  /* ------------------------------------------------------------------ */
  const handleAddStory = () => setShowUpload(true);

  const handleStoryUpload = (newStory) => {
    console.log('📝 New story uploaded:', newStory);
    
    // Thêm story mới vào đầu danh sách (sau add button)
    setStories(prev => {
      const withoutAdd = prev.filter(s => !s.isAddStory);
      const addStoryButton = prev.find(s => s.isAddStory);
      
      return addStoryButton 
        ? [addStoryButton, newStory, ...withoutAdd]
        : [newStory, ...withoutAdd];
    });
    
    setShowUpload(false);
    
    // Optionally refresh stories từ server
    setTimeout(() => {
      fetchStories();
    }, 1000);
  };

  /* ------------------------------------------------------------------ */
  /*  RENDER                                                             */
  /* ------------------------------------------------------------------ */
  if (loading) {
    return (
      <div className={styles.story}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading stories...</p>
        </div>
      </div>
    );
  }

  if (error && stories.length === 0) {
    return (
      <div className={styles.story}>
        <div className={styles.errorContainer}>
          <i className="ri-error-warning-line"></i>
          <p>Failed to load stories</p>
          <button onClick={fetchStories} className={styles.retryBtn}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const viewableStories = stories.filter(s => !s.isAddStory && s.image);
  const currentStory = viewableStories[currentStoryIndex];

  return (
    <div className={styles.story}>
      {/* ----------------------- STORY UPLOAD MODAL -------------------- */}
      <StoryUpload
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUpload={handleStoryUpload}
      />

      {/* ----------------------- STORY THUMBNAILS ---------------------- */}
      {stories.map((story, idx) => (
        <div
          key={story.id}
          className={styles.storyItem}
          onClick={() => openStory(idx)}
        >
          <div className={`${styles.storyImage} ${getStatusClass(story.status)}`}>
            {renderAvatar(story)}
          </div>
          <p className={styles.storyAuthor}>
            {story.isAddStory ? 'Add Story' : story.author}
          </p>
        </div>
      ))}

      {/* ----------------------- STORY VIEWER -------------------------- */}
      {isViewingStory && currentStory && (
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
                style={{ 
                  opacity: currentStoryIndex > 0 ? 1 : 0.3,
                  cursor: currentStoryIndex > 0 ? 'pointer' : 'default'
                }}
              />
            )}

            {/* Content */}
            <div
              className={styles.content}
              style={{
                backgroundImage: `url(${currentStory.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
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
                {/* Progress bars for multiple stories */}
                <div className={styles.progressContainer}>
                  {viewableStories.map((_, index) => (
                    <div key={index} className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{
                          width: index < currentStoryIndex 
                            ? '100%' 
                            : index === currentStoryIndex 
                              ? `${progress}%` 
                              : '0%'
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className={styles.authorAndButton}>
                  <div className={styles.author}>
                    {currentStory.avatar && currentStory.avatar !== 'https://example.com/default-avatar.png' ? (
                      <img
                        src={currentStory.avatar}
                        alt="Author"
                        className={styles.avatarAuthor}
                      />
                    ) : (
                      <div 
                        className={`${styles.avatarAuthor} ${styles.avatarDefault}`}
                        style={{ backgroundColor: getAvatarColor(currentStory.author) }}
                      >
                        {getInitial(currentStory.author)}
                      </div>
                    )}
                    <p className={styles.authorName}>{currentStory.author}</p>
                    <p className={styles.timeAgo}>{currentStory.time}</p>
                  </div>

                  <div className={styles.actionButtons}>
                    {isMobile ? (
                      <i className="ri-close-large-line" onClick={closeStory}></i>
                    ) : (
                      <>
                        <i 
                          className={isManuallyPaused ? "ri-play-fill" : "ri-pause-fill"}
                          onClick={handlePlayPause}
                          title={isManuallyPaused ? "Play" : "Pause"}
                        ></i>
                        <i className="ri-more-fill" title="More options"></i>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Content text overlay */}
              {currentStory.content && (
                <div className={styles.storyContent}>
                  <p>{currentStory.content}</p>
                </div>
              )}

              {/* Footer (reply, like, share) */}
              <div className={styles.contentFooter}>
                <div className={styles.answer}>
                  <textarea 
                    placeholder="Send message..." 
                    rows="1"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        // Handle send message
                        console.log('Send message:', e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
                <i className="ri-heart-line" title="Like"></i>
                <i className="ri-send-plane-fill" title="Share"></i>
              </div>
            </div>

            {/* Next arrow (desktop) */}
            {!isMobile && (
              <i
                className="ri-arrow-right-s-line"
                onClick={handleNextStory}
                style={{ 
                  opacity: currentStoryIndex < viewableStories.length - 1 ? 1 : 0.3,
                  cursor: currentStoryIndex < viewableStories.length - 1 ? 'pointer' : 'default'
                }}
              />
            )}
          </div>

          {/* Story counter */}
          <div className={styles.storyCounter}>
            {currentStoryIndex + 1} / {viewableStories.length}
          </div>
        </div>
      )}
    </div>
  );
};

export default Story;
