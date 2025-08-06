import styles from '../../styles/components/notification/NotificationItem.module.css';

const NotificationItem = ({ notification, onRead }) => {
  const { id, type, user, avatar, message, time, isRead } = notification;

  const handleClick = () => {
    if (!isRead) {
      onRead(id);
    }
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'like':
        return 'ri-heart-fill';
      case 'comment':
        return 'ri-chat-1-line';
      case 'follow':
        return 'ri-user-add-line';
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

  return (
    <div 
      className={`${styles.item} ${!isRead ? styles.unread : ''}`}
      onClick={handleClick}
    >
      <div className={styles.avatarContainer}>
        {avatar ? (
          <img src={avatar} alt={user} className={styles.avatar} />
        ) : (
          <div 
            className={styles.avatarDefault}
            style={{ backgroundColor: getAvatarColor(user) }}
          >
            {getInitial(user)}
          </div>
        )}
        <div className={`${styles.typeIcon} ${styles[type]}`}>
          <i className={getNotificationIcon(type)}></i>
        </div>
      </div>
      
      <div className={styles.content}>
        <p className={styles.message}>
          <span className={styles.username}>{user}</span> {message}
        </p>
        <span className={styles.time}>{time}</span>
      </div>
      
      {!isRead && <div className={styles.dot}></div>}
    </div>
  );
};

export default NotificationItem;
