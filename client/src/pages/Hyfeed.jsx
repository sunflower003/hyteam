import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Story from "../components/Story";
import Post from "../components/Post";
import PostUpload from "../components/PostUpload";
import styles from '../styles/pages/Hyfeed.module.css';
import Present from '@/components/RightSide/Present';
import Birthday from '@/components/RightSide/Birthday';
import Copyright from '@/components/RightSide/Copyright';

const Hyfeed = () => {
  const [showPostUpload, setShowPostUpload] = useState(false);
  const navigate = useNavigate();

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
