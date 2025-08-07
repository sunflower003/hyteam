import styles from '../../styles/components/notification/NotificationItem.module.css';
import { useNotifications } from '../../context/NotificationContext';

const NotificationItem = ({ notification }) => {
  const { navigateToNotification } = useNotifications();
  
  // Xóa những destructuring không cần thiết
  const { _id, type, sender, post, message, isRead, createdAt } = notification;

  const handleClick = () => {
    navigateToNotification(notification);
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'like':
        return 'ri-heart-fill';
      case 'comment':
        return 'ri-chat-1-line';
      case 'follow':
        return 'ri-user-add-line';
      case 'story':
        return 'ri-camera-line';
      default:
        return 'ri-notification-2-line';
    }
  };

  const getAvatarColor = (name) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
    ];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffInSeconds = Math.floor((now - notifDate) / 1000);
    
    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
  };

  const getNotificationPreview = () => {
    if (type === 'story') {
      return 'posted a new story';
    }
    
    if (type === 'comment' && post?.content) {
      const preview = post.content.length > 30 
        ? `"${post.content.substring(0, 30)}..."` 
        : `"${post.content}"`;
      return `commented on your post ${preview}`;
    }
    
    if (type === 'like' && post?.content) {
      const preview = post.content.length > 30 
        ? `"${post.content.substring(0, 30)}..."` 
        : `"${post.content}"`;
      return `liked your post ${preview}`;
    }
    
    return message;
  };

  return (
    <div 
      className={`${styles.item} ${!isRead ? styles.unread : ''}`}
      onClick={handleClick}
    >
      <div className={styles.avatarContainer}>
        {sender?.avatar ? (
          <img src={sender.avatar} alt={sender.username} className={styles.avatar} />
        ) : (
          <div 
            className={styles.avatarDefault}
            style={{ backgroundColor: getAvatarColor(sender?.username || 'User') }}
          >
            {getInitial(sender?.username || 'U')}
          </div>
        )}
        <div className={`${styles.typeIcon} ${styles[type]}`}>
          <i className={getNotificationIcon(type)}></i>
        </div>
      </div>
      
      <div className={styles.content}>
        <p className={styles.message}>
          <span className={styles.username}>{sender?.username || 'Unknown User'}</span>{' '}
          {getNotificationPreview()}
        </p>
        <span className={styles.time}>{getTimeAgo(createdAt)}</span>
      </div>
      
      {!isRead && <div className={styles.dot}></div>}
    </div>
  );
};

export default NotificationItem;
