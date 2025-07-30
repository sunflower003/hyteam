import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePost } from '../../context/PostContext';
import { useAuth } from '../../context/AuthContext';
import postStyles from '../../styles/components/Post.module.css';

const PostCard = ({ post }) => {
    const { toggleLike } = usePost();
    const { user } = useAuth();
    const [showComments, setShowComments] = useState(false);

    const handleLike = () => {
        if (user) {
            toggleLike(post._id, post.isLiked);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) return 'Today';
        if (days === 1) return '1 day ago';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className={postStyles.postCard}>
            {/* Post Header */}
            <div className={postStyles.postHeader}>
                <Link to={`/profile/${post.author._id}`} className={postStyles.authorLink}>
                    <img 
                        src={post.author.avatar} 
                        alt={post.author.username}
                        className={postStyles.avatar}
                    />
                    <div className={postStyles.authorInfo}>
                        <h4>{post.author.username}</h4>
                        <span>{formatDate(post.createdAt)}</span>
                    </div>
                </Link>
                
                {user && user.id === post.author._id && (
                    <div className={postStyles.postOptions}>
                        <button className={postStyles.optionsBtn}>⋯</button>
                    </div>
                )}
            </div>

            {/* Post Media */}
            <div className={postStyles.mediaContainer}>
                {post.mediaType === 'video' ? (
                    <video 
                        src={post.mediaUrl} 
                        controls 
                        className={postStyles.postMedia}
                        poster={post.mediaUrl}
                    />
                ) : (
                    <img 
                        src={post.mediaUrl} 
                        alt="Post content"
                        className={postStyles.postMedia}
                        loading="lazy"
                    />
                )}
            </div>

            {/* Post Actions */}
            <div className={postStyles.postActions}>
                <div className={postStyles.actionButtons}>
                    <button 
                        onClick={handleLike}
                        className={`${postStyles.actionBtn} ${post.isLiked ? postStyles.liked : ''}`}
                    >
                        {post.isLiked ? '❤️' : '🤍'}
                    </button>
                    
                    <button 
                        onClick={() => setShowComments(!showComments)}
                        className={postStyles.actionBtn}
                    >
                        💬
                    </button>
                    
                    <button className={postStyles.actionBtn}>
                        📤
                    </button>
                </div>
                
                <button className={postStyles.actionBtn}>
                    🔖
                </button>
            </div>

            {/* Post Stats */}
            <div className={postStyles.postStats}>
                <p className={postStyles.likesCount}>
                    {post.stats.likesCount} likes
                </p>
            </div>

            {/* Post Content */}
            {post.content && (
                <div className={postStyles.postContent}>
                    <p>
                        <Link to={`/profile/${post.author._id}`} className={postStyles.username}>
                            {post.author.username}
                        </Link>{' '}
                        {post.content}
                    </p>
                    
                    {post.tags.length > 0 && (
                        <div className={postStyles.tags}>
                            {post.tags.map(tag => (
                                <span key={tag} className={postStyles.tag}>
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Comments Preview */}
            {post.stats.commentsCount > 0 && (
                <div className={postStyles.commentsPreview}>
                    <button 
                        onClick={() => setShowComments(!showComments)}
                        className={postStyles.viewComments}
                    >
                        View all {post.stats.commentsCount} comments
                    </button>
                </div>
            )}

            {/* Location */}
            {post.location && (
                <div className={postStyles.location}>
                    📍 {post.location}
                </div>
            )}
        </div>
    );
};

export default PostCard;
