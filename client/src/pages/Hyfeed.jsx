import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Story from "../components/Story";
import Post from "../components/Post";
import PostUpload from "../components/PostUpload";
import Doge from "../components/Doge";
import styles from '../styles/pages/Hyfeed.module.css';
import Present from '@/components/RightSide/Present';
import Birthday from '@/components/RightSide/Birthday';
import Copyright from '@/components/RightSide/Copyright';

const Hyfeed = () => {
  const [showPostUpload, setShowPostUpload] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle highlight post from notification
  useEffect(() => {
    const highlightPostId = searchParams.get('highlight');
    const commentId = searchParams.get('comment');
    
    if (highlightPostId) {
      // Wait for component to mount and posts to load
      const timer = setTimeout(() => {
        const postElement = document.getElementById(`post-${highlightPostId}`);
        if (postElement) {
          postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Highlight the post
          postElement.classList.add('highlighted-post');
          setTimeout(() => {
            postElement.classList.remove('highlighted-post');
          }, 3000);
          
          // If there's a specific comment, scroll to it after the post
          if (commentId) {
            setTimeout(() => {
              const commentElement = document.getElementById(`comment-${commentId}`);
              if (commentElement) {
                commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                commentElement.classList.add('highlighted-comment');
                setTimeout(() => {
                  commentElement.classList.remove('highlighted-comment');
                }, 2000);
              }
            }, 1000);
          }
        }
        
        // Clear URL params after handling
        setSearchParams({});
      }, 1500); // Give time for posts to load
      
      return () => clearTimeout(timer);
    }
  }, [searchParams, setSearchParams]);

  const handleCreatePost = () => {
    setShowPostUpload(true);
  };

  const handlePostUpload = (newPost) => {
    // Refresh feed or handle new post
    console.log('New post created:', newPost);
    setShowPostUpload(false);
    // Optionally refresh the page or update the posts
    window.location.reload();
  };

  return (
    <div>
      <div className={styles.header}>
          <img src="/img/hyteam-logo.png" alt="hyteam" className={styles.logo}/>
          <div className={styles.iconHeader}>
            <i className="ri-add-box-line" onClick={handleCreatePost}></i>
            <i className="ri-notification-3-line"></i>
          </div>
        </div>
      <div className={styles.hyfeedContent}>
        <div className={styles.left}>
          <Story />
          <Post />
        </div>
        <div className={styles.right}>
          <Present />
          <Birthday />
          <Copyright />
          
        </div>
      </div>

      {/* Post Upload Modal */}
      <PostUpload
        isOpen={showPostUpload}
        onClose={() => setShowPostUpload(false)}
        onUpload={handlePostUpload}
      />
    </div>
  );
};

export default Hyfeed;
