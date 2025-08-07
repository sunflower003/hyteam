import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import api from '../utils/api';
import { formatTimeAgo, formatNumber } from '../utils/formatters';
import styles from '../styles/components/CommentModal.module.css';

const CommentModal = ({ isOpen, onClose, post, onCommentAdded }) => {
  const { user } = useAuth();
  const { socket } = useNotifications();
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // { commentId, username, userId }
  const commentInputRef = useRef(null);
  const modalRef = useRef(null);

  // Process comments into nested structure
  const processCommentsStructure = useCallback((rawComments) => {
    const commentMap = new Map();
    const rootComments = [];

    // First pass: create comment map
    rawComments.forEach(comment => {
      const commentWithMeta = {
        ...comment,
        likesCount: comment.likes?.length || 0,
        isLiked: comment.likes?.some(like => like.user === user?._id) || false,
        replies: []
      };
      commentMap.set(comment._id, commentWithMeta);
    });

    // Second pass: build nested structure
    rawComments.forEach(comment => {
      if (comment.parentComment) {
        // This is a reply
        const parent = commentMap.get(comment.parentComment);
        if (parent) {
          parent.replies.push(commentMap.get(comment._id));
        }
      } else {
        // This is a root comment
        rootComments.push(commentMap.get(comment._id));
      }
    });

    return rootComments;
  }, [user]);

  // Load comments when modal opens
  useEffect(() => {
    if (isOpen && post) {
      // Process comments to create nested structure
      const processedComments = processCommentsStructure(post.comments || []);
      setComments(processedComments);
      // Auto focus comment input
      setTimeout(() => {
        commentInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, post, processCommentsStructure]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle ESC key
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  // Socket listeners for real-time comments
  useEffect(() => {
    if (!socket || !isOpen || !post) return;

    const handleCommentAdded = (data) => {
      if (data.postId === post._id) {
        setComments(prev => [...prev, data.comment]);
      }
    };

    socket.on('post-comment-added', handleCommentAdded);

    return () => {
      socket.off('post-comment-added', handleCommentAdded);
    };
  }, [socket, isOpen, post]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let response;
      
      if (replyTo) {
        // Adding a reply
        response = await api.post(`/api/posts/${post._id}/comment/${replyTo.commentId}/reply`, {
          text: commentText.trim(),
          replyToUserId: replyTo.userId,
          replyToUsername: replyTo.username
        });
      } else {
        // Adding a regular comment
        response = await api.post(`/api/posts/${post._id}/comment`, {
          text: commentText.trim()
        });
      }

      const newComment = response.data;
      
      if (replyTo) {
        // Handle reply - refresh comments to get updated structure
        const refreshedComments = processCommentsStructure([...post.comments, newComment]);
        setComments(refreshedComments);
        setReplyTo(null);
      } else {
        // Handle regular comment
        setComments(prev => [...prev, { ...newComment, replies: [], likesCount: 0, isLiked: false }]);
      }
      
      setCommentText('');
      
      // Update parent component
      if (onCommentAdded) {
        onCommentAdded(newComment);
      }

      // Keep focus on input
      commentInputRef.current?.focus();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId) => {
    try {
      const response = await api.post(`/api/posts/${post._id}/comment/${commentId}/like`);
      
      // Update comment likes in state
      const updateCommentLikes = (commentsList) => {
        return commentsList.map(comment => {
          if (comment._id === commentId) {
            return {
              ...comment,
              likesCount: response.data.likesCount,
              isLiked: response.data.liked
            };
          }
          if (comment.replies?.length > 0) {
            return {
              ...comment,
              replies: updateCommentLikes(comment.replies)
            };
          }
          return comment;
        });
      };

      setComments(prev => updateCommentLikes(prev));
    } catch (error) {
      console.error('Error liking comment:', error);
      alert('Failed to like comment. Please try again.');
    }
  };

  const handleReplyClick = (comment) => {
    setReplyTo({
      commentId: comment.parentComment || comment._id, // Reply to parent or to this comment
      username: comment.user?.username,
      userId: comment.user?._id
    });
    setCommentText(`@${comment.user?.username} `);
    commentInputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyTo(null);
    setCommentText('');
    commentInputRef.current?.focus();
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/api/posts/${post._id}/comment/${commentId}`);
      setComments(prev => prev.filter(comment => comment._id !== commentId));
      
      // Update parent component
      if (onCommentAdded) {
        onCommentAdded(null, true); // null comment, true for delete
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment. Please try again.');
    }
  };

  const getAvatarColor = (name) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const renderAvatar = (user, size = '32px') => {
    if (user?.avatar) {
      return <img src={user.avatar} alt={user.username} className={styles.avatar} style={{ width: size, height: size }} />;
    }
    
    const initial = user?.username?.charAt(0).toUpperCase() || '?';
    const backgroundColor = getAvatarColor(user?.username || 'Anonymous');
    
    return (
      <div 
        className={styles.avatarFallback} 
        style={{ 
          backgroundColor, 
          width: size, 
          height: size,
          fontSize: size === '32px' ? '14px' : '12px'
        }}
      >
        {initial}
      </div>
    );
  };

  // Render individual comment with replies
  const renderComment = (comment, isReply = false) => (
    <div key={comment._id} className={`${styles.commentItem} ${isReply ? styles.replyItem : ''}`}>
      <div className={styles.commentAvatar}>
        {renderAvatar(comment.user)}
      </div>
      <div className={styles.commentContent}>
        <div className={styles.commentMain}>
          <span className={styles.commentUser}>{comment.user?.username}</span>
          {comment.replyTo && (
            <span className={styles.replyTag}>@{comment.replyTo.username}</span>
          )}
          <span className={styles.commentText}>{comment.text}</span>
        </div>
        <div className={styles.commentMeta}>
          <span className={styles.commentTime}>
            {formatTimeAgo(comment.createdAt)}
          </span>
          {comment.likesCount > 0 && (
            <span className={styles.commentLikes}>
              {formatNumber(comment.likesCount)} likes
            </span>
          )}
          <button 
            onClick={() => handleReplyClick(comment)}
            className={styles.replyButton}
          >
            Reply
          </button>
          {comment.user?._id === user?._id && (
            <button 
              onClick={() => handleDeleteComment(comment._id)}
              className={styles.deleteComment}
            >
              Delete
            </button>
          )}
        </div>
        
        {/* Render replies */}
        {comment.replies?.length > 0 && (
          <div className={styles.repliesContainer}>
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
      
      {/* Like button on the right */}
      <div className={styles.commentActions}>
        <button 
          onClick={() => handleLikeComment(comment._id)}
          className={`${styles.likeButton} ${comment.isLiked ? styles.liked : ''}`}
        >
          <i className={comment.isLiked ? 'ri-heart-3-fill' : 'ri-heart-3-line'}></i>
        </button>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer} ref={modalRef}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h3>Comments</h3>
          <button onClick={onClose} className={styles.closeButton}>
            <i className="ri-close-line"></i>
          </button>
        </div>

        {/* Post Preview */}
        <div className={styles.postPreview}>
          <div className={styles.postUser}>
            {renderAvatar(post.user, '24px')}
            <span className={styles.username}>{post.user?.username}</span>
          </div>
          {post.caption && (
            <p className={styles.postCaption}>{post.caption}</p>
          )}
        </div>

        {/* Comments List */}
        <div className={styles.commentsList}>
          {comments.length === 0 ? (
            <div className={styles.noComments}>
              <i className="ri-chat-3-line"></i>
              <p>No comments yet.</p>
              <span>Be the first to comment!</span>
            </div>
          ) : (
            comments.map(comment => renderComment(comment))
          )}
        </div>

        {/* Comment Form */}
        {!post.turnOffCommenting && (
          <form onSubmit={handleSubmitComment} className={styles.commentForm}>
            {replyTo && (
              <div className={styles.replyInfo}>
                <span>Replying to @{replyTo.username}</span>
                <button 
                  type="button" 
                  onClick={cancelReply}
                  className={styles.cancelReply}
                >
                  ×
                </button>
              </div>
            )}
            <div className={styles.commentInputContainer}>
              {renderAvatar(user)}
              <input
                ref={commentInputRef}
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={replyTo ? `Reply to @${replyTo.username}...` : "Add a comment..."}
                className={styles.commentInput}
                disabled={isSubmitting}
              />
              {commentText.trim() && (
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={styles.postButton}
                >
                  {isSubmitting ? 'Posting...' : (replyTo ? 'Reply' : 'Post')}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CommentModal;
