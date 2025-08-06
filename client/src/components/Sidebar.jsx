import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import PostUpload from './PostUpload';
import { useNavigate, useLocation } from 'react-router-dom';
import NotificationPanel from './notification/NotificationPanel';
import NotificationBadge from './notification/NotificationBadge';
import styles from '../styles/components/Sidebar.module.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showPostUpload, setShowPostUpload] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);
  const notificationRef = useRef(null);
  const sidebarRef = useRef(null);

  // Handle click outside to close notification panel
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && 
          notificationRef.current && 
          sidebarRef.current && 
          !notificationRef.current.contains(event.target) &&
          !sidebarRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleNavigation = (path) => {
    if (showNotifications) {
      setShowNotifications(false);
    }
    navigate(path);
  };

  const handleCreatePost = () => {
    if (showNotifications) {
      setShowNotifications(false);
    }
    setShowPostUpload(true);
  };

  const handleNotificationClick = () => {
    setShowNotifications(prev => {
      if (!prev) {
        setNotificationCount(0);
      }
      return !prev;
    });
  };

  const handleMobileNotificationClick = () => {
    navigate('/notifications');
  };

  const handlePostUpload = (newPost) => {
    console.log('New post created:', newPost);
    setShowPostUpload(false);
    navigate('/');
  };

  const handleLogout = () => {
    if (showNotifications) {
      setShowNotifications(false);
    }
    logout();
    navigate('/login');
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

  const renderAvatar = (user, className) => {
    if (user?.avatar && user.avatar !== 'https://example.com/default-avatar.png') {
      return (
        <img 
          src={user.avatar} 
          className={className} 
          alt="Avatar" 
        />
      );
    } else {
      const initial = getInitial(user?.username);
      const bgColor = getAvatarColor(user?.username || 'User');
      return (
        <div 
          className={`${className} ${styles.avatarDefault}`}
          style={{ backgroundColor: bgColor }}
        >
          {initial}
        </div>
      );
    }
  };

  return (
    <>
      <div 
        ref={sidebarRef}
        className={styles.sidebar}
      >
        <div className={styles.header}>
          <img src="/img/hyteam-logo.png" alt="hyteam" className={styles.logo}/>
          <p className={`${styles.version} ${showNotifications ? styles.textHidden : ''}`}>v1.0</p>
        </div>
        
        <ul className={styles.links}>
          <li 
            className={`${styles.link} ${isActive('/') ? styles.active : ''}`} 
            onClick={() => handleNavigation('/')}
          >
            <i className="ri-instagram-line"></i> 
            <span className={`${styles.linkText} ${showNotifications ? styles.textHidden : ''}`}>Hyfeed</span>
          </li>
          <li 
            className={`${styles.link} ${styles.notificationLink} ${showNotifications ? styles.active : ''}`} 
            onClick={handleNotificationClick}
          >
            <div className={styles.iconContainer}>
              <i className="ri-notification-2-line"></i>
              <NotificationBadge count={notificationCount} />
            </div>
            <span className={`${styles.linkText} ${showNotifications ? styles.textHidden : ''}`}>Notification</span>
          </li>
          <li className={styles.link} onClick={handleCreatePost}>
            <i className="ri-add-box-line"></i> 
            <span className={`${styles.linkText} ${showNotifications ? styles.textHidden : ''}`}>Add</span>
          </li>
          <li 
            className={`${styles.link} ${isActive('/chat') ? styles.active : ''}`} 
            onClick={() => handleNavigation('/chat')}
          >
            <i className="ri-chat-1-line"></i> 
            <span className={`${styles.linkText} ${showNotifications ? styles.textHidden : ''}`}>Chat</span>
          </li>
          <li 
            className={`${styles.link} ${isActive('/projects') ? styles.active : ''}`} 
            onClick={() => handleNavigation('/projects')}
          >
            <i className="ri-task-line"></i> 
            <span className={`${styles.linkText} ${showNotifications ? styles.textHidden : ''}`}>Project</span>
          </li>
          <li 
            className={`${styles.link} ${isActive('/funding') ? styles.active : ''}`} 
            onClick={() => handleNavigation('/funding')}
          >
            <i className="ri-btc-line"></i> 
            <span className={`${styles.linkText} ${showNotifications ? styles.textHidden : ''}`}>Funding</span>
          </li>
          <li 
            className={`${styles.link} ${isActive('/documents') ? styles.active : ''}`} 
            onClick={() => handleNavigation('/documents')}
          >
            <i className="ri-drive-line"></i> 
            <span className={`${styles.linkText} ${showNotifications ? styles.textHidden : ''}`}>Document</span>
          </li>
          <li 
            className={`${styles.link} ${isActive('/movie-room') ? styles.active : ''}`} 
            onClick={() => handleNavigation('/movie-room')}
          >
            <i className="ri-film-line"></i> 
            <span className={`${styles.linkText} ${showNotifications ? styles.textHidden : ''}`}>Movie Room</span>
          </li>
          <li className={styles.link} onClick={handleLogout}>
            <i className="ri-logout-circle-line"></i> 
            <span className={`${styles.linkText} ${showNotifications ? styles.textHidden : ''}`}>Logout</span>
          </li>
        </ul>
        
        <div className={styles.account} onClick={() => handleNavigation('/profile')}>
          {renderAvatar(user, styles.avatar)}
          <div className={`${styles.accountInfo} ${showNotifications ? styles.textHidden : ''}`}>
            <p className={styles.accountName}>{user?.username || 'Guest User'}</p>
            <p className={styles.accountEmail}>{user?.email || 'guest@example.com'}</p>
          </div>
          <i className={`ri-more-2-line ${showNotifications ? styles.textHidden : ''}`}></i>
        </div>
      </div>

      {/* Notification Panel */}
      {showNotifications && (
        <div ref={notificationRef} className={styles.notificationOverlay}>
          <NotificationPanel
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
          />
        </div>
      )}

      {/* Mobile Navbar */}
      <div className={styles.navbar}>
        <i className="ri-instagram-line" onClick={() => handleNavigation('/')}></i>
        <div className={styles.iconContainer} onClick={handleMobileNotificationClick}>
          <i className="ri-notification-2-line"></i>
          <NotificationBadge count={notificationCount} />
        </div>
        <i className="ri-chat-1-line" onClick={() => handleNavigation('/chat')}></i>
        <i className="ri-btc-line" onClick={() => handleNavigation('/funding')}></i>
        <i className="ri-film-line" onClick={() => handleNavigation('/movie-room')}></i>
        <div onClick={() => handleNavigation('/profile')}>
          {renderAvatar(user, styles.avatarCircle)}
        </div>
      </div>

      {/* Post Upload Modal */}
      <PostUpload
        isOpen={showPostUpload}
        onClose={() => setShowPostUpload(false)}
        onUpload={handlePostUpload}
      />
    </>
  );
};

export default Sidebar;
