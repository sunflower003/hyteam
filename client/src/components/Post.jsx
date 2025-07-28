import styles from '../styles/components/Post.module.css';

const Post = () => {
    return (
        <div className={styles.post}>
            <div className={styles.postCard}>
                <div className={styles.header}>
                    <div className={styles.authorAndTime}>
                        <img src="/img/duongqua.jpg" alt="avatar" className={styles.avatar}/>
                        <p className={styles.authorName}>Duongqua</p>
                        <span className={styles.postTime}>• 2 hours</span>
                    </div>
                    <i class="ri-more-fill"></i>
                </div>
                <img src="/img/duongqua.jpg" alt="post Image" className={styles.postImage} />
                <div className={styles.buttons}>
                    <div className={styles.buttonList}>
                        <i class="ri-heart-3-line"></i>
                        <i class="ri-chat-3-line"></i>
                        <i class="ri-send-plane-line"></i>
                    </div>
                    <i class="ri-money-dollar-circle-line"></i>
                </div>
                <span className={styles.postLike}>2.877 likes</span>
                <div className={styles.postCaption}>
                    <span className={styles.captionAuthor}>Duongqua</span>
                    <span className={styles.captionText}>Toi dep trai khong ae</span>
                </div>
                <span className={styles.allComments}>See all 86 comments</span>
                <input type="text" placeholder="Add a comment..." className={styles.commentInput} />
                <div className={styles.borderBottom}></div>
            </div>
            <div className={styles.postCard}>
                <div className={styles.header}>
                    <div className={styles.authorAndTime}>
                        <img src="/img/duongqua.jpg" alt="avatar" className={styles.avatar}/>
                        <p className={styles.authorName}>Duongqua</p>
                        <span className={styles.postTime}>• 2 hours</span>
                    </div>
                    <i class="ri-more-fill"></i>
                </div>
                <img src="https://images.unsplash.com/photo-1750247400011-1effe6b427a8?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="post Image" className={styles.postImage} />
                <div className={styles.buttons}>
                    <div className={styles.buttonList}>
                        <i class="ri-heart-3-line"></i>
                        <i class="ri-chat-3-line"></i>
                        <i class="ri-send-plane-line"></i>
                    </div>
                    <i class="ri-money-dollar-circle-line"></i>
                </div>
                <span className={styles.postLike}>2.877 likes</span>
                <div className={styles.postCaption}>
                    <span className={styles.captionAuthor}>Duongqua</span>
                    <span className={styles.captionText}>Di du lich thoi ae</span>
                </div>
                <span className={styles.allComments}>See all 86 comments</span>
                <input type="text" placeholder="Add a comment..." className={styles.commentInput} />
                <div className={styles.borderBottom}></div>
            </div>
        </div>
    );
}

export default Post;