import Story from "../components/Story";
import styles from '../styles/pages/Hyfeed.module.css';

const Hyfeed = () => {
  return (
    <div>
      <div className={styles.header}>
          <h1 className={styles.logo}>HYTEAM</h1>
          <div className={styles.iconHeader}>
            <i class="ri-add-box-line"></i>
            <i class="ri-notification-3-line"></i>
          </div>
        </div>
      <div className={styles.hyfeedContent}>
        <div className={styles.left}>
          <Story />
        </div>
        <div className={styles.right}>
          <h1>Right Side</h1>
        </div>
      </div>
    </div>
  );
};

export default Hyfeed;
