import { useState, useEffect } from 'react';
import styles from '../styles/components/Doge.module.css';

const Doge = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(true);

    useEffect(() => {
        // Hiển thị doge ngay khi component mount
        const showTimer = setTimeout(() => {
            setIsVisible(true);
        }, 100);

        // Ẩn doge sau 5 giây
        const hideTimer = setTimeout(() => {
            setIsVisible(false);
            // Sau khi animation kết thúc, remove component khỏi DOM
            setTimeout(() => {
                setShouldRender(false);
            }, 500); // 500ms cho animation fade out
        }, 5000);

        return () => {
            clearTimeout(showTimer);
            clearTimeout(hideTimer);
        };
    }, []);

    if (!shouldRender) return null;

    return (
        <div>
            <img 
                src="/img/doge.gif" 
                alt="Doge" 
                className={`${styles.doge} ${isVisible ? styles.visible : styles.hidden}`} 
            />
        </div>
    );
};

export default Doge;
