import React from 'react';
import { Link } from 'react-router-dom';
import commentStyles from '../../styles/components/CommentList.module.css';

const CommentList = ({ comments = [], onDeleteComment }) => {
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        if (days < 7) return `${days}d`;
        return date.toLocaleDateString();
    };

    if (!comments || comments.length === 0) {
        return (
            <div className={commentStyles.noComments}>
                <div className={commentStyles.noCommentsIcon}>💬</div>
                <p>No comments yet</p>
                <span>Be the first to leave a comment!</span>
            </div>
        );
    }

    return (
        <div className={commentStyles.commentList}>
            {comments.map((comment) => (
                <div key={comment._id} className={commentStyles.commentItem}>
                    {/* Avatar */}
                    <Link 
                        to={`/profile/${comment.author._id}`}
                        className={commentStyles.avatarLink}
                    >
                        <img 
                            src={comment.author.avatar} 
                            alt={comment.author.username}
                            className={commentStyles.avatar}
                        />
                    </Link>

                    {/* Comment Content */}
                    <div className={commentStyles.commentContent}>
                        <div className={commentStyles.commentHeader}>
                            <Link 
                                to={`/profile/${comment.author._id}`}
                                className={commentStyles.username}
                            >
                                {comment.author.username}
                            </Link>
                            <span className={commentStyles.commentTime}>
                                {formatDate(comment.createdAt)}
                            </span>
                        </div>
                        
                        <p className={commentStyles.commentText}>
                            {comment.content}
                        </p>

                        {/* Comment Actions */}
                        <div className={commentStyles.commentActions}>
                            <button className={commentStyles.actionBtn}>
                                Like
                            </button>
                            <button className={commentStyles.actionBtn}>
                                Reply
                            </button>
                            {onDeleteComment && (
                                <button 
                                    className={`${commentStyles.actionBtn} ${commentStyles.deleteBtn}`}
                                    onClick={() => onDeleteComment(comment._id)}
                                >
                                    Delete
                                </button>
                            )}
                        </div>

                        {/* Comment Likes Count */}
                        {comment.likes && comment.likes.length > 0 && (
                            <span className={commentStyles.likesCount}>
                                {comment.likes.length} like{comment.likes.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default CommentList;
