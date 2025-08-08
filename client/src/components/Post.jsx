import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import VerifiedBadge from './ui/VerifiedBadge';
import CommentModal from './CommentModal';
import api from '../utils/api';
import { formatTimeAgo, formatNumber } from '../utils/formatters';
import styles from '../styles/components/Post.module.css';

const Post = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { socket } = useNotifications();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Comment modal states
    const [selectedPost, setSelectedPost] = useState(null);
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

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

    // Socket listeners for real-time updates
    useEffect(() => {
        console.log('🔌 Post component - Socket status:', !!socket);
        if (!socket) return;

        console.log('📡 Setting up socket listeners for post updates');

        // Listen for new posts
        const handleNewPost = (data) => {
            console.log('📝 New post received:', data);
            setPosts(prevPosts => {
                // Check if post already exists to prevent duplicates
                const existingPost = prevPosts.find(post => post._id === data.post._id);
                if (existingPost) {
                    console.log('📝 Post already exists, skipping duplicate');
                    return prevPosts;
                }
                return [data.post, ...prevPosts];
            });
        };

        // Listen for real-time like updates
        const handleLikeUpdate = (data) => {
            console.log('👍 Real-time like update received:', data);
            setPosts(prevPosts => 
                prevPosts.map(post => 
                    post._id === data.postId 
                        ? { 
                            ...post, 
                            likesCount: data.likes,
                            // Only update isLiked if it's not the current user's action
                            isLiked: data.userId === user?.id ? data.isLiked : post.isLiked
                        }
                        : post
                )
            );
        };

        // Listen for real-time comment updates
        const handleCommentUpdate = (data) => {
            console.log('💬 Real-time comment update received:', data);
            setPosts(prevPosts => 
                prevPosts.map(post => 
                    post._id === data.postId 
                        ? { 
                            ...post, 
                            commentsCount: data.commentsCount,
                            comments: data.comment ? [...(post.comments || []), data.comment] : post.comments
                        }
                        : post
                )
            );
        };

        socket.on('new-post', handleNewPost);
        socket.on('post-like-updated', handleLikeUpdate);
        socket.on('post-comment-added', handleCommentUpdate);

        console.log('✅ Socket listeners registered for post updates');

        return () => {
            console.log('🧹 Cleaning up socket listeners');
            socket.off('new-post', handleNewPost);
            socket.off('post-like-updated', handleLikeUpdate);
            socket.off('post-comment-added', handleCommentUpdate);
        };
    }, [socket, user?.id]);

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

    // Handle comment submission (legacy - now using modal)
    // const handleComment = async (postId, commentText) => {
    //     if (!commentText.trim()) return;

    //     try {
    //         const response = await api.post(`/api/posts/${postId}/comment`, {
    //             text: commentText.trim()
    //         });
            
    //         setPosts(posts.map(post => 
    //             post._id === postId 
    //                 ? { 
    //                     ...post, 
    //                     comments: [...post.comments, response.data],
    //                     commentsCount: post.commentsCount + 1
    //                 }
    //                 : post
    //         ));
    //     } catch (error) {
    //         console.error('Error adding comment:', error);
    //     }
    // };

    // Handle comment icon click - open modal
    const handleCommentClick = (post) => {
        setSelectedPost(post);
        setIsCommentModalOpen(true);
    };

    // Handle comment modal close
    const handleCommentModalClose = () => {
        setIsCommentModalOpen(false);
        setSelectedPost(null);
    };

    // Handle new comment added from modal
    const handleCommentAdded = (newComment, isDelete = false) => {
        if (!selectedPost) return;

        setPosts(prevPosts => 
            prevPosts.map(post => {
                if (post._id === selectedPost._id) {
                    if (isDelete) {
                        // Remove comment
                        return {
                            ...post,
                            comments: post.comments?.filter(c => c._id !== newComment?._id) || [],
                            commentsCount: Math.max(0, (post.commentsCount || 0) - 1)
                        };
                    } else {
                        // Add comment
                        return {
                            ...post,
                            comments: [...(post.comments || []), newComment],
                            commentsCount: (post.commentsCount || 0) + 1
                        };
                    }
                }
                return post;
            })
        );

        // Update selected post for modal
        setSelectedPost(prev => {
            if (!prev) return null;
            if (isDelete) {
                return {
                    ...prev,
                    comments: prev.comments?.filter(c => c._id !== newComment?._id) || [],
                    commentsCount: Math.max(0, (prev.commentsCount || 0) - 1)
                };
            } else {
                return {
                    ...prev,
                    comments: [...(prev.comments || []), newComment],
                    commentsCount: (prev.commentsCount || 0) + 1
                };
            }
        });
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
        const avatarElement = user?.avatar && user.avatar !== 'https://example.com/default-avatar.png' ? (
            <img 
                src={user.avatar} 
                alt="Avatar" 
                className={className}
            />
        ) : (
            <div 
                className={`${className} ${styles.avatarDefault}`}
                style={{ backgroundColor: getAvatarColor(user?.username || 'User') }}
            >
                {getInitial(user?.username)}
            </div>
        );

        return (
            <div style={{ position: 'relative', display: 'inline-block' }}>
                {avatarElement}
                {user?.verified && (
                    <VerifiedBadge size="small" />
                )}
            </div>
        );
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
                    onCommentClick={handleCommentClick}
                    onUserClick={handleUserClick}
                    renderAvatar={renderAvatar}
                />
            ))}

            {/* Comment Modal */}
            <CommentModal
                isOpen={isCommentModalOpen}
                onClose={handleCommentModalClose}
                post={selectedPost}
                onCommentAdded={handleCommentAdded}
            />
        </div>
    );
};

const isVideo = (url, mediaType) => {
    if (mediaType === 'video') return true;
    if (!url) return false;
    return /\.(mp4|mov|webm|avi)$/i.test(url);
};

// Individual Post Card Component
const PostCard = ({ post, onLike, onCommentClick, onUserClick, renderAvatar }) => {
    const mediaUrl = post.mediaUrl || post.image;

    return (
        <div className={styles.postCard} id={`post-${post._id}`}>
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
                    <i 
                        className="ri-chat-3-line"
                        onClick={() => onCommentClick(post)}
                        style={{ cursor: 'pointer' }}
                    ></i>
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
                    onClick={() => onCommentClick(post)}
                >
                    View all {formatNumber(post.commentsCount)} comments
                </span>
            )}

            <div className={styles.commentInputWrapper}>
                <input 
                    type="text" 
                    className={styles.commentInput} 
                    placeholder="Add a comment..." 
                    onFocus={(e) => e.target.nextSibling.style.display = 'inline-block'}
                    onBlur={(e) => e.target.nextSibling.style.display = 'none'}
                />
                <button className={styles.commentSendButton} style={{ display: 'none' }}>Send</button>
            </div>

            <div className={styles.borderBottom}></div>
        </div>
    );
};

export default Post;