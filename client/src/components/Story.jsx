import { useState, useEffect } from 'react';
import styles from '../styles/components/Story.module.css';

const Story = () => {
  const [isViewingStory, setIsViewingStory] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mock data for stories - bạn có thể thay thế bằng data thực
  const stories = [
    { id: 1, author: 'duongqua', avatar: '/img/duongqua.jpg', image: '/img/duongqua.jpg', time: '1 hour', status: 'new' },
    { id: 2, author: 'duongqua', avatar: '/img/duongqua.jpg', image: '/img/duongqua.jpg', time: '2 hours', status: 'new' },
    { id: 3, author: 'duongqua', avatar: '/img/duongqua.jpg', image: '/img/duongqua.jpg', time: '3 hours', status: 'watched' },
    { id: 4, author: 'duongqua', avatar: '/img/duongqua.jpg', image: '/img/duongqua.jpg', time: '4 hours', status: 'watched' },
    { id: 5, author: 'duongqua', avatar: '/img/duongqua.jpg', image: '/img/duongqua.jpg', time: '5 hours', status: 'none' },
    { id: 6, author: 'duongquagavcl', avatar: '/img/duongqua.jpg', image: '/img/duongqua.jpg', time: '6 hours', status: 'none' },
  ];

  // Progress bar animation
  useEffect(() => {
    let interval;
    if (isViewingStory && !isPaused) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            // Auto next story when progress complete
            handleNextStory();
            return 0;
          }
          return prev + 1;
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isViewingStory, currentStoryIndex, isPaused]);

  const openStory = (index) => {
    setCurrentStoryIndex(index);
    setIsViewingStory(true);
    setProgress(0);
  };

  const closeStory = () => {
    setIsViewingStory(false);
    setProgress(0);
    setIsPaused(false);
  };

  const handleNextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
      setProgress(0);
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

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isViewingStory) return;
      
      if (e.key === 'Escape') {
        closeStory();
      } else if (e.key === 'ArrowRight') {
        handleNextStory();
      } else if (e.key === 'ArrowLeft') {
        handlePrevStory();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isViewingStory, currentStoryIndex]);

  // Handle touch navigation for mobile
  const handleContentClick = (e) => {
    if (!isMobile) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const contentWidth = rect.width;
    
    // If clicked on right 50%, next story
    if (clickX > contentWidth / 2) {
      handleNextStory();
    } else {
      // If clicked on left 50%, prev story
      handlePrevStory();
    }
  };

  // Handle close button click for mobile
  const handleMobileClose = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Mobile close clicked'); // Debug log
    closeStory();
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'new': return styles.new;
      case 'watched': return styles.watched;
      default: return styles.none;
    }
  };

  return (
    <div className={styles.story}>
        {stories.map((story, index) => (
          <div key={story.id} className={styles.storyItem} onClick={() => openStory(index)}>
            <div className={`${styles.storyImage} ${getStatusClass(story.status)}`}>
              <img src={story.avatar} alt="Avatar" className={styles.avatar} />
            </div>
            <p className={styles.storyAuthor}>{story.author}</p>
          </div>
        ))}
        
        {isViewingStory && (
          <div className={styles.viewStory}>
            {!isMobile && (
              <div className={styles.header}>
                <h1 className={styles.logo}>HYTEAM</h1>
                <i className={`ri-close-large-line ${styles.close}`} onClick={closeStory}></i>
              </div>
            )}
            <div className={styles.player}>
              {!isMobile && (
                <i 
                  className="ri-arrow-left-s-line" 
                  onClick={handlePrevStory}
                  style={{ opacity: currentStoryIndex > 0 ? 1 : 0.3 }}
                ></i>
              )}
              <div className={styles.content} 
                   style={{ 
                      backgroundImage: `url(${stories[currentStoryIndex].image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                   }}
                   onMouseDown={() => !isMobile && setIsPaused(true)}
                   onMouseUp={() => !isMobile && setIsPaused(false)}
                   onMouseLeave={() => !isMobile && setIsPaused(false)}
                   onTouchStart={() => setIsPaused(true)}
                   onTouchEnd={() => setIsPaused(false)}
                   onClick={handleContentClick}
               >
                  <div className={`${styles.overlay} ${styles.top}`}></div>
                  <div className={`${styles.overlay} ${styles.bottom}`}></div>
                  <div className={styles.contentHeader}>
                      <div className={styles.progressBar}>
                        <div 
                          className={styles.progressFill}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className={styles.authorAndButton}>
                          <div className={styles.author}>
                              <img src={stories[currentStoryIndex].avatar} alt="Author" className={styles.avatarAuthor} />
                              <p className={styles.authorName}>{stories[currentStoryIndex].author}</p>
                              <p className={styles.timeAgo}>{stories[currentStoryIndex].time}</p>
                          </div>
                           <div className={styles.actionButtons}>
                              {isMobile ? (
                                <i className="ri-close-large-line" onClick={handleMobileClose}></i>
                              ) : (
                                <>
                                  <i className="ri-play-fill"></i>
                                  <i className="ri-more-fill"></i>
                                </>
                              )}
                          </div>
                      </div>
                  </div>
                  <div className={styles.contentFooter}>
                      <div className={styles.answer}>
                          <textarea name="answer" id="answerStory" placeholder="Type your answer..."></textarea>
                      </div>
                      <i className="ri-heart-line"></i>
                      <i className="ri-send-plane-fill"></i>
                  </div>
              </div>
              {!isMobile && (
                <i 
                  className="ri-arrow-right-s-line" 
                  onClick={handleNextStory}
                  style={{ opacity: currentStoryIndex < stories.length - 1 ? 1 : 0.3 }}
                ></i>
              )}
            </div>
          </div>
        )}
    </div>
  );
};

export default Story;
