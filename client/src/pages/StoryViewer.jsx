import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import styles from '../styles/pages/StoryViewer.module.css';

const StoryViewer = () => {
  const { userId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const fetchUserStories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/stories/user/${userId}`);
      
      if (response.data.success) {
        const userStories = response.data.data.stories;
        if (userStories.length === 0) {
          setError('No active stories found');
          return;
        }
        setStories(userStories);

        // If query has specific storyId, jump to it
        const params = new URLSearchParams(location.search);
        const targetStoryId = params.get('story');
        if (targetStoryId) {
          const idx = userStories.findIndex(s => s._id === targetStoryId);
          if (idx !== -1) {
            setCurrentStoryIndex(idx);
            if (!userStories[idx].hasViewed) {
              markStoryAsViewed(userStories[idx]._id);
            }
          } else {
            // fallback mark first
            if (userStories[0] && !userStories[0].hasViewed) {
              markStoryAsViewed(userStories[0]._id);
            }
          }
        } else {
          // Mark first story as viewed
            if (userStories[0] && !userStories[0].hasViewed) {
              markStoryAsViewed(userStories[0]._id);
            }
        }
      } else {
        setError('Failed to load stories');
      }
    } catch (error) {
      console.error('Error fetching user stories:', error);
      setError('Error loading stories');
    } finally {
      setLoading(false);
    }
  }, [userId, location.search]);

  const markStoryAsViewed = async (storyId) => {
    try {
      await api.post(`/api/stories/${storyId}/view`);
    } catch (error) {
      console.error('Error marking story as viewed:', error);
    }
  };

  const handleClose = useCallback(() => {
    navigate(-1); // Go back to previous page
  }, [navigate]);

  const handleNextStory = useCallback(() => {
    if (currentStoryIndex < stories.length - 1) {
      const nextIndex = currentStoryIndex + 1;
      setCurrentStoryIndex(nextIndex);
      setProgress(0);
      
      // Mark next story as viewed
      const nextStory = stories[nextIndex];
      if (nextStory && !nextStory.hasViewed) {
        markStoryAsViewed(nextStory._id);
      }
    } else {
      // All stories finished, go back
      handleClose();
    }
  }, [currentStoryIndex, stories, handleClose]);

  const startStoryTimer = useCallback(() => {
    if (stories.length === 0) return;
    
    const currentStory = stories[currentStoryIndex];
    if (!currentStory) return;

    const duration = currentStory.duration * 1000; // Convert to milliseconds
    let startTime = Date.now();
    
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressPercent = (elapsed / duration) * 100;
      
      if (progressPercent >= 100) {
        clearInterval(timer);
        handleNextStory();
      } else {
        setProgress(progressPercent);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [stories, currentStoryIndex, handleNextStory]);

  useEffect(() => {
    fetchUserStories();
  }, [fetchUserStories]);

  useEffect(() => {
    if (stories.length > 0) {
      const cleanup = startStoryTimer();
      return cleanup;
    }
  }, [startStoryTimer, stories]);

  const handlePrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      setProgress(0);
    }
  };

  const handleStoryClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    
    if (clickX < width / 2) {
      handlePrevStory();
    } else {
      handleNextStory();
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading story...</p>
        </div>
      </div>
    );
  }

  if (error || stories.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <i className="ri-error-warning-line"></i>
          <p>{error || 'No stories available'}</p>
          <button onClick={handleClose} className={styles.closeButton}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentStory = stories[currentStoryIndex];
  const user = currentStory?.userId;

  return (
    <div className={styles.container}>
      {/* Progress bars */}
      <div className={styles.progressContainer}>
        {stories.map((_, index) => (
          <div key={index} className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{
                width: index < currentStoryIndex ? '100%' : 
                       index === currentStoryIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            {user?.avatar ? (
              <img src={user.avatar} alt={user.username} />
            ) : (
              <div className={styles.avatarDefault}>
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className={styles.userDetails}>
            <span className={styles.username}>{user?.username}</span>
            <span className={styles.time}>
              {new Date(currentStory.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
        <button onClick={handleClose} className={styles.closeButton}>
          <i className="ri-close-line"></i>
        </button>
      </div>

      {/* Story content */}
      <div className={styles.storyContent} onClick={handleStoryClick}>
        {currentStory.mediaType === 'video' ? (
          <video
            src={currentStory.mediaUrl}
            className={styles.media}
            autoPlay
            muted
            playsInline
          />
        ) : (
          <img
            src={currentStory.mediaUrl}
            alt="Story"
            className={styles.media}
          />
        )}
        
        {currentStory.content && (
          <div className={styles.textOverlay}>
            <p>{currentStory.content}</p>
          </div>
        )}
      </div>

      {/* Navigation hints */}
      <div className={styles.navigationHints}>
        <div className={styles.prevHint}>Tap to go back</div>
        <div className={styles.nextHint}>Tap to continue</div>
      </div>
    </div>
  );
};

export default StoryViewer;
