import { useState, useEffect } from 'react';
import NotificationItem from './NotificationItem';
import styles from '../../styles/components/notification/NotificationPanel.module.css';

const NotificationPanel = ({ isOpen }) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setNotifications([
        {
          id: 1,
          type: 'like',
          user: 'johndoe',
          avatar: null,
          message: 'liked your post',
          time: '2h',
          isRead: false
        },
        {
          id: 2,
          type: 'follow',
          user: 'jane_smith',
          avatar: null,
          message: 'started following you',
          time: '1d',
          isRead: false
        },
        {
          id: 3,
          type: 'comment',
          user: 'mike_dev',
          avatar: null,
          message: 'commented on your post',
          time: '3d',
          isRead: true
        }
      ]);
    }
  }, [isOpen]);

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  };

  if (!isOpen) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>Notifications</h3>
        <button 
          className={styles.markAllButton}
          onClick={markAllAsRead}
        >
          Mark all as read
        </button>
      </div>
      
      <div className={styles.content}>
        {notifications.length === 0 ? (
          <div className={styles.empty}>
            <i className="ri-notification-off-line"></i>
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={markAsRead}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
