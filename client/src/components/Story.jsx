/*  client/src/components/Story.jsx  */
import { useState, useEffect, useRef } from 'react';
import styles from '../styles/components/Story.module.css';
import StoryUpload from './StoryUpload';            // ← NEW

const Story = () => {
  /* ------------------------------------------------------------------ */
  /*  STATE                                                              */
  /* ------------------------------------------------------------------ */
  const [isViewingStory, setIsViewingStory]   = useState(false);
  const [currentStoryIndex, setCurrentStory]  = useState(0);
  const [progress, setProgress]               = useState(0);
  const [isPaused, setIsPaused]               = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false); // ← NEW: track manual pause
  const [isMobile, setIsMobile]               = useState(false);
  const [showUpload, setShowUpload]           = useState(false); // ← NEW

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
  /*  RESPONSIVE CHECK                                                   */
  /* ------------------------------------------------------------------ */
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
  const openStory  = (index) => { setCurrentStory(index); setIsViewingStory(true); setProgress(0); };
  const closeStory = ()      => { setIsViewingStory(false); setProgress(0); setIsPaused(false);   };

  const handleNextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
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
      {stories.map((story, idx) => (
        <div
          key={story.id}
          className={styles.storyItem}
          onClick={() => openStory(idx)}
        >
          <div className={`${styles.storyImage} ${getStatusClass(story.status)}`}>
            <img src={story.avatar} alt="Avatar" className={styles.avatar} />
          </div>
          <p className={styles.storyAuthor}>{story.author}</p>
        </div>
      ))}

      {/* ----------------------- STORY VIEWER -------------------------- */}
      {isViewingStory && (
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
                backgroundImage: `url(${stories[currentStoryIndex].image})`,
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
                    <img
                      src={stories[currentStoryIndex].avatar}
                      alt="Author"
                      className={styles.avatarAuthor}
                    />
                    <p className={styles.authorName}>{stories[currentStoryIndex].author}</p>
                    <p className={styles.timeAgo}>{stories[currentStoryIndex].time}</p>
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
                style={{ opacity: currentStoryIndex < stories.length - 1 ? 1 : 0.3 }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Story;
