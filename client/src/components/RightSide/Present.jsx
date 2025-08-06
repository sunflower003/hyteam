import styles from '../../styles/components/RightSide/Present.module.css';

const Present = () => {
    return (
        <div className={styles.present}>
            <header className={styles.header}>
                <span><i className="ri-group-line"></i>Present</span>
                <p className={styles.onlineCount}>3/5</p>
            </header>
            <div className={styles.presentList}>
                <div className={styles.tableCol}>
                    <div className={styles.tableCell + ' ' + styles.tableHeader}>People</div>
                    <div className={styles.user}>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/The_White_House_-_54409525537_%28cropped%29.jpg/250px-The_White_House_-_54409525537_%28cropped%29.jpg" alt="avatar" className={styles.avatar}/>
                        <p className={styles.username}>duongvualo</p>
                    </div>
                    <div className={styles.user}>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/The_White_House_-_54409525537_%28cropped%29.jpg/250px-The_White_House_-_54409525537_%28cropped%29.jpg" alt="avatar" className={styles.avatar}/>
                        <p className={styles.username}>duongvualo</p>
                    </div>
                    <div className={styles.user}>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/The_White_House_-_54409525537_%28cropped%29.jpg/250px-The_White_House_-_54409525537_%28cropped%29.jpg" alt="avatar" className={styles.avatar}/>
                        <p className={styles.username}>duongvualo</p>
                    </div>
                </div>
                <div className={styles.tableCol}>
                    <div className={styles.tableCell + ' ' + styles.tableHeader}>Check In</div>
                    <div className={styles.checkIn}>05:12</div>
                    <div className={styles.checkIn}>14:25</div>
                    <div className={styles.checkIn}>16:20</div>
                </div>
                <div className={styles.tableCol}>
                    <div className={styles.tableCell + ' ' + styles.tableHeader}>Status</div>
                    <div className={styles.status}><i class="ri-circle-fill check_circle"></i></div>
                    <div className={styles.status}><i class="ri-circle-fill check_circle"></i></div>
                    <div className={styles.status}><i class="ri-circle-fill check_circle"></i></div>
                </div>
            </div>
        </div>
    );
};

export default Present;
