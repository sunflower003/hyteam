import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import styles from '../styles/components/Post.module.css';

const Post = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch posts from API
    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/posts');
            setPosts(response.data);
        } catch (error) {
            console.error('Error fetching posts:', error);
            setError('Failed to load posts');
        } finally {
            setLoading(false);
        }
    };

    // Handle like/unlike
    const handleLike = async (postId) => {
        try {
            const response = await api.post(`/api/posts/${postId}/like`);
            setPosts(posts.map(post => 
                post._id === postId 
                    ? { ...post, isLiked: response.data.liked, likesCount: response.data.likesCount }
                    : post
            ));
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    };

    // Handle comment submission
    const handleComment = async (postId, commentText) => {
        if (!commentText.trim()) return;

        try {
            const response = await api.post(`/api/posts/${postId}/comment`, {
                text: commentText.trim()
            });
            
            setPosts(posts.map(post => 
                post._id === postId 
                    ? { 
                        ...post, 
                        comments: [...post.comments, response.data],
                        commentsCount: post.commentsCount + 1
                    }
                    : post
            ));
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    // Generate random color for avatar background
    const getAvatarColor = (name) => {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
            '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
            '#A55EEA', '#26DE81', '#FD79A8', '#FDCB6E', '#6C5CE7'
        ];
        const index = name ? name.charCodeAt(0) % colors.length : 0;
        return colors[index];
    };

    // Get first letter of username
    const getInitial = (name) => {
        return name ? name.charAt(0).toUpperCase() : 'U';
    };

    // Render avatar with default fallback
    const renderAvatar = (user, className) => {
        if (user?.avatar && user.avatar !== 'https://example.com/default-avatar.png') {
            return (
                <img 
                    src={user.avatar} 
                    alt="Avatar" 
                    className={className}
                />
            );
        } else {
            const initial = getInitial(user?.username);
            const bgColor = getAvatarColor(user?.username || 'User');
            return (
                <div 
                    className={`${className} ${styles.avatarDefault}`}
                    style={{ backgroundColor: bgColor }}
                >
                    {initial}
                </div>
            );
        }
    };

    // Format time ago
    const formatTimeAgo = (dateString) => {
        const now = new Date();
        const postDate = new Date(dateString);
        const diffInHours = Math.floor((now - postDate) / (1000 * 60 * 60));
        
        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h`;
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d`;
        const diffInWeeks = Math.floor(diffInDays / 7);
        return `${diffInWeeks}w`;
    };

    // Format number (likes, etc.)
    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <p>Loading posts...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.error}>
                <p>{error}</p>
                <button onClick={fetchPosts} className={styles.retryButton}>
                    Try again
                </button>
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className={styles.noPosts}>
                <p>No posts yet. Be the first to share something!</p>
            </div>
        );
    }

    return (
        <div className={styles.post}>
            {posts.map((post) => (
                <PostCard 
                    key={post._id} 
                    post={post} 
                    onLike={handleLike}
                    onComment={handleComment}
                    renderAvatar={renderAvatar}
                    formatTimeAgo={formatTimeAgo}
                    formatNumber={formatNumber}
                />
            ))}
        </div>
    );
};

// Individual Post Card Component
const PostCard = ({ post, onLike, onComment, renderAvatar, formatTimeAgo, formatNumber }) => {
    const [commentText, setCommentText] = useState('');
    const [showAllComments, setShowAllComments] = useState(false);

    const handleCommentSubmit = (e) => {
        e.preventDefault();
        onComment(post._id, commentText);
        setCommentText('');
    };

    const displayedComments = showAllComments ? post.comments : post.comments.slice(0, 2);

    return (
        <div className={styles.postCard}>
            <div className={styles.header}>
                <div className={styles.authorAndTime}>
                    {renderAvatar(post.user, styles.avatar)}
                    <p className={styles.authorName}>{post.user?.username}</p>
                    <span className={styles.postTime}>• {formatTimeAgo(post.createdAt)}</span>
                    {post.location && (
                        <span className={styles.location}>• {post.location}</span>
                    )}
                </div>
                <i className="ri-more-fill"></i>
            </div>

            <img 
                src={post.image} 
                alt={post.altText || 'Post image'} 
                className={styles.postImage} 
            />

            <div className={styles.buttons}>
                <div className={styles.buttonList}>
                    <i 
                        className={post.isLiked ? "ri-heart-3-fill" : "ri-heart-3-line"}
                        onClick={() => onLike(post._id)}
                        style={{ color: post.isLiked ? '#ed4956' : 'inherit' }}
                    ></i>
                    <i className="ri-chat-3-line"></i>
                    <i className="ri-send-plane-line"></i>
                </div>
                <i className="ri-bookmark-line"></i>
            </div>

            {!post.hideLikeCount && (
                <span className={styles.postLike}>
                    {formatNumber(post.likesCount)} likes
                </span>
            )}

            {post.caption && (
                <div className={styles.postCaption}>
                    <span className={styles.captionAuthor}>{post.user?.username}</span>
                    <span className={styles.captionText}>{post.caption}</span>
                </div>
            )}

            {post.commentsCount > 0 && (
                <>
                    {post.commentsCount > 2 && !showAllComments && (
                        <span 
                            className={styles.allComments}
                            onClick={() => setShowAllComments(true)}
                        >
                            View all {post.commentsCount} comments
                        </span>
                    )}
                    
                    {displayedComments.map((comment) => (
                        <div key={comment._id} className={styles.comment}>
                            <span className={styles.commentAuthor}>{comment.user?.username}</span>
                            <span className={styles.commentText}>{comment.text}</span>
                        </div>
                    ))}
                </>
            )}

            {!post.turnOffCommenting && (
                <form onSubmit={handleCommentSubmit} className={styles.commentForm}>
                    <input 
                        type="text" 
                        placeholder="Add a comment..." 
                        className={styles.commentInput}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                    />
                    {commentText.trim() && (
                        <button type="submit" className={styles.postButton}>
                            Post
                        </button>
                    )}
                </form>
            )}

            <div className={styles.borderBottom}></div>
        </div>
    );
};

export default Post;