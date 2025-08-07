import { useNotifications } from '../../context/NotificationContext';
import NotificationItem from './NotificationItem';
import styles from '../../styles/components/notification/NotificationPanel.module.css';

const NotificationPanel = ({ isOpen }) => {
  const { notifications, loading, markAllAsRead, fetchNotifications } = useNotifications();

  if (!isOpen) return null;

  const handleRefresh = () => {
    fetchNotifications();
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>Notifications</h3>
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

export default NotificationPanel;
