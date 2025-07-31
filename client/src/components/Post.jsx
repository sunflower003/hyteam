import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { formatTimeAgo, formatNumber } from '../utils/formatters';
import styles from '../styles/components/Post.module.css';

const Post = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Navigate to user profile
    const handleUserClick = (userId) => {
        if (userId === user?._id) {
            navigate('/profile');
        } else {
            navigate(`/profile/${userId}`);
        }
    };

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
                    onUserClick={handleUserClick}
                    renderAvatar={renderAvatar}
                />
            ))}
        </div>
    );
};

const isVideo = (url, mediaType) => {
    if (mediaType === 'video') return true;
    if (!url) return false;
    return /\.(mp4|mov|webm|avi)$/i.test(url);
};

// Individual Post Card Component
const PostCard = ({ post, onLike, onComment, onUserClick, renderAvatar }) => {
    const [commentText, setCommentText] = useState('');
    const [showAllComments, setShowAllComments] = useState(false);

    const handleCommentSubmit = (e) => {
        e.preventDefault();
        onComment(post._id, commentText);
        setCommentText('');
    };

    const mediaUrl = post.mediaUrl || post.image;

    return (
        <div className={styles.postCard}>
            <div className={styles.header}>
                <div className={styles.authorAndTime}>
                    <div onClick={() => onUserClick(post.user?._id)}>
                        {renderAvatar(post.user, styles.avatar)}
                    </div>
                    <div className={styles.authorInfo}>
                        <div className={styles.nameAndTime}>
                            <p 
                                className={styles.authorName}
                                onClick={() => onUserClick(post.user?._id)}
                            >
                                {post.user?.username}
                            </p>
                            <span className={styles.postTime}>• {formatTimeAgo(post.createdAt)}</span>
                        </div>
                        {post.location && (
                            <p className={styles.location}>{post.location}</p>
                        )}
                    </div>
                </div>
                <i className="ri-more-fill"></i>
            </div>

            {isVideo(mediaUrl, post.mediaType) ? (
                <video
                    src={mediaUrl}
                    className={styles.postImage}
                    controls
                    autoPlay
                    muted
                />
            ) : (
                <img
                    src={mediaUrl}
                    alt={post.altText || 'Post image'}
                    className={styles.postImage}
                />
            )}

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
                    <span 
                        className={styles.captionAuthor}
                        onClick={() => onUserClick(post.user?._id)}
                    >
                        {post.user?.username}
                    </span>
                    <span className={styles.captionText}>{post.caption}</span>
                </div>
            )}

            {post.commentsCount > 0 && (
                <span 
                    className={styles.allComments}
                    onClick={() => setShowAllComments(!showAllComments)}
                >
                    {showAllComments ? 'Hide comments' : `View all ${post.commentsCount} comments`}
                </span>
            )}

            {post.commentsCount > 0 && showAllComments && (
                <>
                    {post.comments.map((comment) => (
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