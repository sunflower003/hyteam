import styles from '../../styles/components/RightSide/Present.module.css';

const Birthday = () => {
    return (
        <div className={styles.present}>
            <header className={styles.header}>
                <span><i class="ri-cake-line"></i>Birthday</span>
                <p className={styles.onlineCount}>2/5</p>
            </header>
            <div className={styles.presentList}>
                <div className={styles.tableCol}>
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
                    
                    <div className={styles.checkIn + ' ' + styles.birthDay}>1 August 2025</div>
                    <div className={styles.checkIn + ' ' + styles.birthDay}>1 August 2025</div>
                </div> 
            </div>
        </div>
    );
};

export default Birthday;
