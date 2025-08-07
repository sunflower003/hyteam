import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import api from '../utils/api';
import { formatTimeAgo } from '../utils/formatters';
import styles from '../styles/components/CommentModal.module.css';

const CommentModal = ({ isOpen, onClose, post, onCommentAdded }) => {
  const { user } = useAuth();
  const { socket } = useNotifications();
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentInputRef = useRef(null);
  const modalRef = useRef(null);

  // Load comments when modal opens
  useEffect(() => {
    if (isOpen && post) {
      setComments(post.comments || []);
      // Auto focus comment input
      setTimeout(() => {
        commentInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, post]);

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
      const response = await api.post(`/api/posts/${post._id}/comment`, {
        text: commentText.trim()
      });

      const newComment = response.data;
      setComments(prev => [...prev, newComment]);
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
            comments.map((comment) => (
              <div key={comment._id} className={styles.commentItem}>
                <div className={styles.commentAvatar}>
                  {renderAvatar(comment.user)}
                </div>
                <div className={styles.commentContent}>
                  <div className={styles.commentMain}>
                    <span className={styles.commentUser}>{comment.user?.username}</span>
                    <span className={styles.commentText}>{comment.text}</span>
                  </div>
                  <div className={styles.commentMeta}>
                    <span className={styles.commentTime}>
                      {formatTimeAgo(comment.createdAt)}
                    </span>
                    {comment.user?._id === user?._id && (
                      <button 
                        onClick={() => handleDeleteComment(comment._id)}
                        className={styles.deleteComment}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Form */}
        {!post.turnOffCommenting && (
          <form onSubmit={handleSubmitComment} className={styles.commentForm}>
            <div className={styles.commentInputContainer}>
              {renderAvatar(user)}
              <input
                ref={commentInputRef}
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className={styles.commentInput}
                disabled={isSubmitting}
              />
              {commentText.trim() && (
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={styles.postButton}
                >
                  {isSubmitting ? 'Posting...' : 'Post'}
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
