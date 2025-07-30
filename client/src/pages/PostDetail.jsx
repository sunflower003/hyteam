import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePost } from '../context/PostContext';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/Posts/PostCard';
import CommentList from '../components/Posts/CommentList';
import postDetailStyles from '../styles/pages/PostDetail.module.css';

const PostDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);

    useEffect(() => {
        fetchPostDetail();
    }, [id]);

    const fetchPostDetail = async () => {
        try {
            setLoading(true);
            // API call để lấy chi tiết post
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/posts/${id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setPost(data.data.post);
                    setComments(data.data.post.comments || []);
                } else {
                    setError(data.message);
                }
            } else {
                setError('Failed to fetch post details');
            }
        } catch (err) {
            setError('Network error occurred');
            console.error('Error fetching post:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || submittingComment) return;

        try {
            setSubmittingComment(true);
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/posts/${id}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ content: newComment.trim() })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setComments([...comments, data.data.comment]);
                    setNewComment('');
                    // Update post comment count
                    setPost(prev => ({
                        ...prev,
                        stats: {
                            ...prev.stats,
                            commentsCount: prev.stats.commentsCount + 1
                        }
                    }));
                }
            }
        } catch (err) {
            console.error('Error adding comment:', err);
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleBack = () => {
        navigate(-1);
    };

    if (loading) {
        return (
            <div className={postDetailStyles.loading}>
                <div className={postDetailStyles.spinner}></div>
                <p>Loading post...</p>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className={postDetailStyles.error}>
                <h3>❌ {error || 'Post not found'}</h3>
                <p>The post you're looking for doesn't exist or has been removed.</p>
                <button onClick={handleBack} className={postDetailStyles.backBtn}>
                    ← Go Back
                </button>
            </div>
        );
    }

    return (
        <div className={postDetailStyles.postDetail}>
            {/* Header */}
            <div className={postDetailStyles.header}>
                <button onClick={handleBack} className={postDetailStyles.backBtn}>
                    ← Back
                </button>
                <h1>Post Details</h1>
                <div></div>
            </div>

            {/* Post Content */}
            <div className={postDetailStyles.content}>
                <div className={postDetailStyles.postContainer}>
                    <PostCard post={post} showFullContent={true} />
                </div>

                {/* Comments Section */}
                <div className={postDetailStyles.commentsSection}>
                    <h3>Comments ({post.stats.commentsCount})</h3>
                    
                    {/* Add Comment Form */}
                    {user && (
                        <form onSubmit={handleAddComment} className={postDetailStyles.commentForm}>
                            <div className={postDetailStyles.commentInputContainer}>
                                <img 
                                    src={user.avatar} 
                                    alt={user.username}
                                    className={postDetailStyles.userAvatar}
                                />
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Add a comment..."
                                    className={postDetailStyles.commentInput}
                                    maxLength={500}
                                />
                                <button 
                                    type="submit" 
                                    disabled={!newComment.trim() || submittingComment}
                                    className={postDetailStyles.commentSubmit}
                                >
                                    {submittingComment ? '...' : 'Post'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Comments List */}
                    <div className={postDetailStyles.commentsList}>
                        {comments.length === 0 ? (
                            <div className={postDetailStyles.noComments}>
                                <p>💬 No comments yet. Be the first to comment!</p>
                            </div>
                        ) : (
                            comments.map(comment => (
                                <div key={comment._id} className={postDetailStyles.commentItem}>
                                    <img 
                                        src={comment.author.avatar} 
                                        alt={comment.author.username}
                                        className={postDetailStyles.commentAvatar}
                                    />
                                    <div className={postDetailStyles.commentContent}>
                                        <div className={postDetailStyles.commentHeader}>
                                            <span className={postDetailStyles.commentAuthor}>
                                                {comment.author.username}
                                            </span>
                                            <span className={postDetailStyles.commentTime}>
                                                {new Date(comment.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className={postDetailStyles.commentText}>
                                            {comment.content}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PostDetail;
