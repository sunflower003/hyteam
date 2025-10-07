import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import api from '../utils/api';
import { formatTimeAgo, formatNumber } from '../utils/formatters';
import { buildNestedComments } from '../utils/commentHelpers';
import styles from '../styles/components/MobileCommentsSheet.module.css';

// View constants
const REPLY_COLLAPSE_COUNT = 2;

const MobileCommentsSheet = ({ isOpen, onClose, post, onCommentAdded }) => {
  const { user } = useAuth();
  const { socket } = useNotifications();
  const sheetRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const dragStartY = useRef(null);
  const startHeight = useRef(null);

  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // {commentId, username, userId}
  const [expandedReplies, setExpandedReplies] = useState(new Set());
  const [comments, setComments] = useState([]);
  const [mountAnim, setMountAnim] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false); // track first user scroll / touch
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Build initial nested structure
  useEffect(() => {
    if (isOpen && post) {
      const nested = buildNestedComments(post.comments || [], user?._id);
      setComments(nested);
      setTimeout(() => {
        setMountAnim(true);
        // Không blur cưỡng bức để tránh mất sheet trên một số trình duyệt
      }, 10);
    } else if (!isOpen) {
      setMountAnim(false);
      setReplyTo(null);
      setCommentText('');
      setExpandedReplies(new Set());
      setHasInteracted(false);
      setKeyboardOffset(0);
    }
  }, [isOpen, post, user?._id]);

  // Lock body scroll & prevent background scrolling on iOS
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const wheelBlock = (e) => {
      if (!sheetRef.current) return;
      if (!sheetRef.current.contains(e.target)) {
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', wheelBlock, { passive:false });
    document.addEventListener('touchmove', wheelBlock, { passive:false });
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('wheel', wheelBlock);
      document.removeEventListener('touchmove', wheelBlock);
    };
  }, [isOpen]);

  // Lift input with virtual keyboard using visualViewport metrics
  useEffect(() => {
    if (!isOpen) return;
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const updateOffset = () => {
      const heightDiff = window.innerHeight - viewport.height - viewport.offsetTop;
      setKeyboardOffset(Math.max(0, Math.round(heightDiff)));
    };
    updateOffset();
    viewport.addEventListener('resize', updateOffset);
    viewport.addEventListener('scroll', updateOffset);
    return () => {
      viewport.removeEventListener('resize', updateOffset);
      viewport.removeEventListener('scroll', updateOffset);
      setKeyboardOffset(0);
    };
  }, [isOpen]);

  // keep latest comment area visible when keyboard lifts
  useEffect(() => {
    if (keyboardOffset > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [keyboardOffset]);

  // ESC to close
  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [isOpen, onClose]);

  // Socket real-time new comments
  useEffect(() => {
    if (!socket || !isOpen || !post) return;
    const handler = (data) => {
      if (data.postId === post._id && data.comment) {
        setComments(prev => buildNestedComments([...(post.comments||[]), data.comment], user?._id));
      }
    };
    socket.on('post-comment-added', handler);
    return () => socket.off('post-comment-added', handler);
  }, [socket, isOpen, post, user?._id]);

  // Drag to close (simple vertical gesture on header area)
  const onPointerDown = (e) => {
    // Only allow drag gesture from handle area (avoid conflict with scroll)
    dragStartY.current = (e.touches ? e.touches[0].clientY : e.clientY);
    startHeight.current = sheetRef.current?.getBoundingClientRect().height;
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('touchmove', onPointerMove);
    document.addEventListener('touchend', onPointerUp);
  };
  const onPointerMove = (e) => {
    if (dragStartY.current == null) return;
    const currentY = (e.touches ? e.touches[0].clientY : e.clientY);
    const dy = currentY - dragStartY.current;
    if (dy > 0) {
      sheetRef.current.style.transform = `translateY(${dy}px)`;
      sheetRef.current.style.transition = 'none';
    }
  };
  const onPointerUp = (e) => {
    if (dragStartY.current == null) return;
    const endRect = sheetRef.current.getBoundingClientRect();
    const dy = endRect.top - (window.innerHeight - endRect.height);
    if (dy > 120) { // threshold
      onClose();
    } else {
      sheetRef.current.style.transition = '';
      sheetRef.current.style.transform = '';
    }
    dragStartY.current = null;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('touchmove', onPointerMove);
    document.removeEventListener('touchend', onPointerUp);
  };

  // Helpers
  const getAvatarColor = (name='U') => {
    const colors = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FECA57','#FF9FF3','#54A0FF'];
    return colors[name.charCodeAt(0)%colors.length];
  };
  const renderAvatar = (u, size=32) => {
    if (u?.avatar) return <img src={u.avatar} alt={u.username} className={styles.avatar} style={{width:size,height:size}}/>;
    const initial = u?.username?.[0]?.toUpperCase()||'?';
    return <div className={styles.avatarFallback} style={{width:size,height:size,background:getAvatarColor(u?.username)}}>{initial}</div>;
  };

  const toggleLike = async (commentId) => {
    try {
      const res = await api.post(`/api/posts/${post._id}/comment/${commentId}/like`);
      setComments(prev => prev.map(c => updateComment(c, commentId, (target)=> ({
        ...target,
        likesCount: res.data.likesCount,
        isLiked: res.data.liked
      }))));
    } catch (e) { console.warn('like failed', e); }
  };

  const updateComment = (node, id, mutate) => {
    if (node._id === id) return mutate(node);
    return {
      ...node,
      replies: node.replies?.map(r => updateComment(r,id,mutate))||[]
    };
  };

  const handleReplyClick = (c) => {
    setReplyTo({ commentId: c.parentComment || c._id, username: c.user?.username, userId: c.user?._id });
    setCommentText(`@${c.user?.username} `);
    inputRef.current?.focus();
  };

  const cancelReply = () => { setReplyTo(null); setCommentText(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      let response;
      if (replyTo) {
        response = await api.post(`/api/posts/${post._id}/comment/${replyTo.commentId}/reply`, {
          text: commentText.trim(),
          replyToUserId: replyTo.userId,
          replyToUsername: replyTo.username
        });
      } else {
        response = await api.post(`/api/posts/${post._id}/comment`, { text: commentText.trim() });
      }
      const newComment = response.data;
      const updatedRaw = [...(post.comments||[]), newComment];
      setComments(buildNestedComments(updatedRaw, user?._id));
      setCommentText('');
      if (replyTo) setReplyTo(null);
      onCommentAdded && onCommentAdded(newComment);
      inputRef.current?.focus();
    } catch (err) {
      console.error('submit comment failed', err);
    } finally { setIsSubmitting(false); }
  };

  const isExpanded = (id) => expandedReplies.has(id);
  const toggleReplies = (id) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const renderReplies = (parent) => {
    if (!parent.replies?.length) return null;
    const total = parent.replies.length;
    const showAll = isExpanded(parent._id);
    const visible = showAll ? parent.replies : parent.replies.slice(0, REPLY_COLLAPSE_COUNT);
    return (
      <div className={styles.repliesWrapper}>
        {total > REPLY_COLLAPSE_COUNT && (
          <button className={styles.moreRepliesBtn} onClick={() => toggleReplies(parent._id)}>
            {showAll ? 'Ẩn bớt trả lời' : `Xem thêm ${total-REPLY_COLLAPSE_COUNT} trả lời`}
          </button>
        )}
        {visible.map(r => renderComment(r,true))}
      </div>
    );
  };

  const renderComment = (c, isReply=false) => (
    <div key={c._id} className={`${styles.commentItem} ${isReply?styles.reply:''}`}>      
      <div className={styles.left}>{renderAvatar(c.user,isReply?28:32)}</div>
      <div className={styles.mid}>
        <div className={styles.line}><span className={styles.username}>{c.user?.username}</span> <span className={styles.text}>{c.text}</span></div>
        <div className={styles.meta}>
          <span>{formatTimeAgo(c.createdAt)}</span>
          {c.likesCount>0 && <span>{formatNumber(c.likesCount)} lượt thích</span>}
          <button type="button" onClick={()=>handleReplyClick(c)}>Trả lời</button>
          {c.user?._id === user?._id && <button type="button" onClick={()=>handleDelete(c._id)}>Xóa</button>}
        </div>
        {!isReply && renderReplies(c)}
      </div>
      <div className={styles.right}>
        <button className={`${styles.likeBtn} ${c.isLiked?styles.liked:''}`} onClick={()=>toggleLike(c._id)}>
          <i className={c.isLiked? 'ri-heart-3-fill':'ri-heart-3-line'}></i>
        </button>
      </div>
    </div>
  );

  const handleDelete = async (commentId) => {
    try {
      await api.delete(`/api/posts/${post._id}/comment/${commentId}`);
      // rebuild from raw minus deleted
      const filtered = (post.comments||[]).filter(c => c._id !== commentId);
      setComments(buildNestedComments(filtered, user?._id));
      onCommentAdded && onCommentAdded(null,true);
    } catch(e){ console.warn('delete failed', e); }
  };

  if (!isOpen || !isMobile) return null;

  return createPortal(
    <div className={styles.overlay}>
      <div 
        className={`${styles.sheet} ${mountAnim?styles.open:''}`}
        ref={sheetRef}
        role="dialog"
        aria-label="Bình luận"
        style={{ '--keyboard-offset': `${keyboardOffset}px` }}
      >
        <div className={styles.handleArea} onMouseDown={onPointerDown} onTouchStart={onPointerDown}>
          <div className={styles.handle}></div>
        </div>
        <div className={styles.header}>Bình luận</div>
        <div
          className={styles.scrollArea}
          ref={scrollRef}
          onScroll={()=>{ if(!hasInteracted) setHasInteracted(true); }}
        >
          {comments.length===0 ? (
            <div className={styles.empty}>Chưa có bình luận</div>
          ) : comments.map(c => renderComment(c,false))}
          <div style={{height:'72px'}}></div>{/* spacer above input */}
        </div>
        <form className={styles.inputBar} onSubmit={handleSubmit}>
          {replyTo && (
            <div className={styles.replyChip}>
              Trả lời @{replyTo.username}
              <button type="button" onClick={cancelReply}>×</button>
            </div>
          )}
          <div className={styles.inputRow}>
            {renderAvatar(user,32)}
            <textarea
              ref={inputRef}
              className={styles.textarea}
              placeholder={replyTo?`Trả lời @${replyTo.username}...`:'Viết bình luận...'}
              value={commentText}
              onChange={e=>setCommentText(e.target.value)}
              rows={1}
              onInput={(e)=>{e.target.style.height='auto'; e.target.style.height=e.target.scrollHeight+'px';}}
              onFocus={()=>{
                setTimeout(()=>{
                  if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                  }
                }, 50);
              }}
            />
            <button type="submit" disabled={!commentText.trim()||isSubmitting} className={styles.sendBtn}>
              {isSubmitting? '...' : 'Gửi'}
            </button>
          </div>
          <div className={styles.safePad}></div>
        </form>
      </div>
      <div className={styles.backdrop} onClick={onClose}></div>
    </div>,
    document.body
  );
};

export default MobileCommentsSheet;
