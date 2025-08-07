import styles from '../../styles/components/notification/NotificationBadge.module.css';

const NotificationBadge = ({ count, className }) => {
  if (!count || count === 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <span className={`${styles.badge} ${className || ''}`}>
      {displayCount}
    </span>
  );
};

export default NotificationBadge;
