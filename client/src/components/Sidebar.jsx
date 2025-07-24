import styles from '../styles/components/Sidebar.module.css';

const Sidebar = () => {
 

  return (
    <>
      <div className={styles.sidebar}>
        <div className={styles.header}>
          <h1 className={styles.logo}>HYTEAM</h1>
          <p className={styles.version}>v1.0</p>
        </div>
        <ul className={styles.links}>
          <li className={styles.link}>
            <i class="ri-instagram-line"></i> Hyfeed
          </li>
          <li className={styles.link}>
            <i class="ri-user-line"></i> Profile
          </li>
          <li className={styles.link}>
            <i class="ri-notification-2-line"></i> Notification
          </li>
          <li className={styles.link}>
            <i class="ri-chat-1-line"></i> Chat
          </li>
          <li className={styles.link}>
            <i class="ri-task-line"></i> Project
          </li>
          <li className={styles.link}>
            <i class="ri-btc-line"></i> Funding
          </li>
          <li className={styles.link}>
            <i class="ri-drive-line"></i> Document
          </li>
          <li className={styles.link}>
            <i class="ri-film-line"></i> Movie Room
          </li>
        </ul>
        <div className={styles.account}>
          <img src='/img/duongqua.jpg' className={styles.avatar} alt="Avatar" />
          <div className={styles.accountInfo}>
            <p className={styles.accountName}>Duong Qua</p>
            <p className={styles.accountEmail}>duongqua@huce.edu.vn</p>
          </div>
          <i class="ri-more-2-line"></i>
        </div>
      </div>
      <div className={styles.navbar}>
        <i class="ri-instagram-line"></i>
        <i class="ri-chat-1-line"></i>
        <i class="ri-film-line"></i>
        <i class="ri-btc-line"></i>
        <img src='/img/duongqua.jpg' className={styles.avatarCircle} alt="Avatar" />
      </div>
    </>
  );
};

export default Sidebar;
