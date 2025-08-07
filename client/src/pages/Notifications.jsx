import { useNotifications } from '../context/NotificationContext';
import NotificationItem from '../components/notification/NotificationItem';
import styles from '../styles/pages/Notifications.module.css';

const Notifications = () => {
  const { notifications, loading, markAllAsRead, fetchNotifications } = useNotifications();

  const handleRefresh = () => {
    fetchNotifications();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Notifications</h1>
        <div className={styles.headerActions}>
          <button 
            className={styles.refreshButton}
            onClick={handleRefresh}
            disabled={loading}
          >
            <i className="ri-refresh-line"></i>
          </button>
          <button 
            className={styles.markAllButton}
            onClick={markAllAsRead}
            disabled={loading}
          >
            Mark all as read
          </button>
        </div>
      </div>
      
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className={styles.empty}>
            <i className="ri-notification-off-line"></i>
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map(notification => (
            <NotificationItem
              key={notification._id}
              notification={notification}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
