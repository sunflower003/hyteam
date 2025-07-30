import { useEffect, useState } from 'react';
import { usePost } from '../context/PostContext';
import { useAuth } from '../context/AuthContext';
import Story from "../components/Story";
import Post from "../components/Post";
import PostCard from "../components/Posts/PostCard";
import CreatePostButton from "../components/Posts/CreatePostButton";
import SearchBar from "../components/Posts/SearchBar";
import styles from '../styles/pages/Hyfeed.module.css';

const Hyfeed = () => {
    const { posts, loading, error, fetchPosts } = usePost();
    const { user } = useAuth();
    const [refreshing, setRefreshing] = useState(false);
    const [showNewPosts, setShowNewPosts] = useState(true);

    useEffect(() => {
        // Fetch posts when component mounts
        fetchPosts();
    }, [fetchPosts]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchPosts();
        setRefreshing(false);
    };

    const togglePostView = () => {
        setShowNewPosts(!showNewPosts);
    };

    return (
        <div>
            {/* Header - Giữ nguyên design ban đầu */}
            <div className={styles.header}>
                <h1 className={styles.logo}>HYTEAM</h1>
                <div className={styles.iconHeader}>
                    <CreatePostButton className={styles.createPostIcon} text="" />
                    <i className="ri-add-box-line" onClick={togglePostView} title="Toggle Post View"></i>
                    <i className="ri-notification-3-line"></i>
                    <button 
                        onClick={handleRefresh} 
                        className={styles.refreshBtn}
                        disabled={refreshing}
                        title="Refresh Feed"
                    >
                        <i className={refreshing ? "ri-loader-4-line ri-spin" : "ri-refresh-line"}></i>
                    </button>
                </div>
            </div>

            {/* Content - Giữ nguyên cấu trúc left/right */}
            <div className={styles.hyfeedContent}>
                <div className={styles.left}>
                    {/* Story Component - Giữ nguyên */}
                    <Story />

                    {/* Search Bar - Chỉ hiển thị khi showNewPosts */}
                    {showNewPosts && (
                        <div className={styles.searchContainer}>
                            <SearchBar />
                        </div>
                    )}

                    {/* Toggle between old Post component and new Posts */}
                    {showNewPosts ? (
                        // New Posts Section
                        <div className={styles.newPostsSection}>
                            {/* Error Message */}
                            {error && (
                                <div className={styles.errorMessage}>
                                    <p>❌ {error}</p>
                                    <button onClick={fetchPosts} className={styles.retryBtn}>
                                        Try Again
                                    </button>
                                </div>
                            )}

                            {/* Loading State */}
                            {loading && posts.length === 0 ? (
                                <div className={styles.loadingContainer}>
                                    <div className={styles.loadingSpinner}></div>
                                    <p>Loading posts...</p>
                                </div>
                            ) : (
                                // Posts List
                                <div className={styles.postsContainer}>
                                    {posts.length === 0 ? (
                                        <div className={styles.noPosts}>
                                            <div className={styles.noPostsIcon}>📸</div>
                                            <h3>No posts yet</h3>
                                            <p>Be the first to share something amazing!</p>
                                            <CreatePostButton text="Create Your First Post" />
                                        </div>
                                    ) : (
                                        <div className={styles.postsList}>
                                            {posts.map(post => (
                                                <PostCard 
                                                    key={post._id} 
                                                    post={post} 
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Refreshing Indicator */}
                            {refreshing && (
                                <div className={styles.refreshingIndicator}>
                                    <div className={styles.spinner}></div>
                                    <p>Refreshing...</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Original Post Component - Giữ nguyên để backward compatibility
                        <div className={styles.originalPostSection}>
                            <Post />
                        </div>
                    )}
                </div>

                {/* Right Side - Giữ nguyên hoàn toàn */}
                <div className={styles.right}>
                    <h1>Right Side</h1>
                    <p>Đang phát triển thêm</p>
                    
                    {/* Có thể thêm Post Statistics */}
                    {showNewPosts && (
                        <div className={styles.postStats}>
                            <h3>📊 Post Statistics</h3>
                            <div className={styles.stats}>
                                <p>Total Posts: {posts.length}</p>
                                <p>Your Posts: {posts.filter(post => post.author._id === user?.id).length}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Hyfeed;
