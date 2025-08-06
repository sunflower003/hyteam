import { useState, useEffect } from 'react';
import NotificationItem from '../components/notification/NotificationItem';
import styles from '../styles/pages/Notifications.module.css';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Mock data - thay thế bằng API call thực tế
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
  }, []);

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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Notifications</h1>
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

export default Notifications;
