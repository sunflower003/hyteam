import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/components/Sidebar.module.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login'); // Navigate to login page after logout
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
      <div className={styles.sidebar}>
        <div className={styles.header}>
          <h1 className={styles.logo}>HYTEAM</h1>
          <p className={styles.version}>v1.0</p>
        </div>
        <ul className={styles.links}>
          <li className={styles.link} onClick={() => handleNavigation('/')}>
            <i className="ri-instagram-line"></i> Hyfeed
          </li>
          <li className={styles.link} onClick={() => handleNavigation('/notifications')}>
            <i className="ri-notification-2-line"></i> Notification
          </li>
          <li className={styles.link} onClick={() => handleNavigation('/create')}>
            <i className="ri-add-box-line"></i> Add
          </li>
          <li className={styles.link} onClick={() => handleNavigation('/chat')}>
            <i className="ri-chat-1-line"></i> Chat
          </li>
          <li className={styles.link} onClick={() => handleNavigation('/projects')}>
            <i className="ri-task-line"></i> Project
          </li>
          <li className={styles.link} onClick={() => handleNavigation('/funding')}>
            <i className="ri-btc-line"></i> Funding
          </li>
          <li className={styles.link} onClick={() => handleNavigation('/documents')}>
            <i className="ri-drive-line"></i> Document
          </li>
          <li className={styles.link} onClick={() => handleNavigation('/movie-room')}>
            <i className="ri-film-line"></i> Movie Room
          </li>
          <li className={styles.link} onClick={handleLogout}>
            <i className="ri-logout-circle-line"></i> Logout
          </li>
        </ul>
        <div className={styles.account} onClick={() => handleNavigation('/profile')}>
          {renderAvatar(user, styles.avatar)}
          <div className={styles.accountInfo}>
            <p className={styles.accountName}>{user?.username || 'Guest User'}</p>
            <p className={styles.accountEmail}>{user?.email || 'guest@example.com'}</p>
          </div>
          <i className="ri-more-2-line"></i>
        </div>
      </div>
      <div className={styles.navbar}>
        <i className="ri-instagram-line" onClick={() => handleNavigation('/')}></i>
        <i className="ri-chat-1-line" onClick={() => handleNavigation('/chat')}></i>
        <i className="ri-btc-line" onClick={() => handleNavigation('/funding')}></i>
        <i className="ri-film-line" onClick={() => handleNavigation('/movie-room')}></i>
        <div onClick={() => handleNavigation('/profile')}>
          {renderAvatar(user, styles.avatarCircle)}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
