const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { cloudinary } = require('../config/cloudinary');
const { createNotification } = require('./notificationController');
const fs = require('fs');

// Helper function để validate post operations
const validatePostOperation = async (postId, userId, requireOwnership = false) => {
  const post = await Post.findById(postId).populate('user', 'username');
  
  if (!post) {
    throw new Error('Post not found');
  }
  
  if (requireOwnership && post.user._id.toString() !== userId.toString()) {
    throw new Error('Not authorized to perform this action');
  }
  
  return post;
};

// Helper để prevent notification spam
const canSendNotification = async (sender, recipient, type, post) => {
  try {
    // Check if similar notification sent recently (within 1 minute)
    const recentNotification = await Notification.findOne({
      sender,
      recipient,
      type,
      post,
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) }
    });
    
    return !recentNotification;
  } catch (error) {
    console.error('Error checking notification spam:', error);
    return true; // Default to allowing notification
  }
};

// Create a new post
const createPost = async (req, res) => {
  try {
    const { caption, location, altText, hideViewCount, hideLikeCount, turnOffCommenting } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    console.log('📁 Post upload attempt:', req.file.filename, req.file.mimetype);
    console.log('📍 File path:', req.file.path);
    console.log('📂 File exists?', fs.existsSync(req.file.path));

    // Enhanced duplicate prevention: Check for recent posts from same user within 10 seconds
    // Also check by caption and file size for better duplicate detection
    const recentPost = await Post.findOne({
      user: req.user._id,
      $and: [
        { createdAt: { $gte: new Date(Date.now() - 10 * 1000) } }, // Within last 10 seconds
        {
          $or: [
            { caption: caption || '' }, // Same caption
            { createdAt: { $gte: new Date(Date.now() - 5 * 1000) } } // Or within 5 seconds regardless
          ]
        }
      ]
    }).sort({ createdAt: -1 });

    if (recentPost) {
      console.log('⚠️ Duplicate post attempt detected, returning existing post');
      await recentPost.populate('user', 'username avatar');
      return res.status(201).json(recentPost);
    }

    let imageUrl;

    if (process.env.NODE_ENV === 'production') {
      // In production, file is already uploaded to Cloudinary via multer-storage-cloudinary
      imageUrl = req.file.path; // This will be the Cloudinary URL
    } else {
      // In development, upload to Cloudinary manually
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'hyteam/posts',
        resource_type: 'auto'
      });
      
      imageUrl = result.secure_url;

      // Clean up local file after upload
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Local file cleaned up');
      } else {
        console.log('⚠️ Local file not found for cleanup');
      }
    }

    const post = new Post({
      user: req.user._id,
      image: imageUrl,
      caption: caption || '',
      location: location || '',
      altText: altText || '',
      hideViewCount: hideViewCount === 'true',
      hideLikeCount: hideLikeCount === 'true',
      turnOffCommenting: turnOffCommenting === 'true'
    });

    await post.save();
    
    // Populate user info
    await post.populate('user', 'username avatar');

    console.log('📝 POST CREATED:', post._id);

    // Real-time broadcast - emit new post to all connected users (similar to story)
    // Add a flag to prevent duplicate broadcasts
    if (!post.broadcasted) {
      try {
        const { getIO } = require('../config/socket');
        const io = getIO();
        
        if (io) {
          console.log('🔗 IO instance available for post:', !!io);
          
          // Prepare post data for broadcast
          const postData = {
            _id: post._id,
            user: {
              _id: post.user._id,
              username: post.user.username,
              avatar: post.user.avatar
            },
            image: post.image,
            caption: post.caption,
            location: post.location,
            altText: post.altText,
            hideViewCount: post.hideViewCount,
            hideLikeCount: post.hideLikeCount,
            turnOffCommenting: post.turnOffCommenting,
            likes: [],
            comments: [],
            likesCount: 0,
            commentsCount: 0,
            createdAt: post.createdAt
          };
          
          console.log('📤 Emitting new-post:', {
            post: postData
          });
          
          // Broadcast to all connected users
          io.emit('new-post', {
            post: postData
          });
          
          console.log('📝 New post broadcasted for user', post.user.username);
          
          // Create post notifications for all users (internal network) - similar to story notifications
          const User = require('../models/User');
          const allUsers = await User.find({ _id: { $ne: post.user._id } }).select('_id username');
          
          if (allUsers && allUsers.length > 0) {
            console.log(`📱 Creating post notifications for ${allUsers.length} users (internal network)`);
            
            const notifications = allUsers.map(user => ({
              recipient: user._id,
              sender: post.user._id,
              type: 'post',
              post: post._id,
              message: 'đã đăng một bài viết mới'
            }));

            await Notification.insertMany(notifications);
            console.log(`✅ Created ${notifications.length} post notifications`);

            // Emit notifications to all users via socket - similar to story notifications
            for (const user of allUsers) {
              // Get updated unread count for each user
              const unreadCount = await Notification.countDocuments({
                recipient: user._id,
                isRead: false
              });

              io.to(`user_${user._id}`).emit('new-notification', {
                notification: {
                  _id: new Date().getTime().toString(), // Convert to string for proper handling
                  recipient: user._id,
                  sender: {
                    _id: post.user._id,
                    username: post.user.username,
                    avatar: post.user.avatar
                  },
                  type: 'post',
                  post: post._id,
                  message: 'đã đăng một bài viết mới',
                  isRead: false,
                  createdAt: new Date()
                },
                unreadCount: unreadCount
              });
            }
            console.log(`📤 Post notifications sent to all users via socket`);
          } else {
            console.log(`📱 No other users found to notify about post`);
          }
          
          // Mark as broadcasted to prevent duplicate broadcasts
          await Post.findByIdAndUpdate(post._id, { $set: { broadcasted: true } });
          
        } else {
          console.log('❌ IO instance not available for post broadcast');
        }
      } catch (broadcastError) {
        console.error('❌ Error broadcasting post:', broadcastError);
        // Don't fail the entire operation if broadcast fails
      }
    } else {
      console.log('📝 Post already broadcasted, skipping...');
    }

    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

// Get all posts (feed)
const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate('user', 'username avatar')
      .populate('comments.user', 'username avatar')
      .populate('likes.user', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Add computed fields
    const postsWithMetadata = posts.map(post => {
      const postObj = post.toObject();
      postObj.likesCount = post.likes ? post.likes.length : 0;
      postObj.commentsCount = post.comments ? post.comments.length : 0;
      postObj.viewsCount = post.views ? post.views.length : 0;
      // Check if current user has liked this post
      postObj.isLiked = false;
      if (post.likes && req.user) {
        postObj.isLiked = post.likes.some(like => {
          const likeUserId = like.user._id ? like.user._id.toString() : like.user.toString();
          return likeUserId === req.user._id.toString();
        });
      }
      return postObj;
    });

    res.json(postsWithMetadata);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

// Get posts by user
const getPostsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ user: userId })
      .populate('user', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Add computed fields
    const postsWithMetadata = posts.map(post => {
      const postObj = post.toObject();
      postObj.likesCount = post.likes.length;
      postObj.commentsCount = post.comments.length;
      postObj.viewsCount = post.views.length;
      // Check if current user has liked this post
      postObj.isLiked = false;
      if (post.likes && req.user) {
        postObj.isLiked = post.likes.some(like => {
          const likeUserId = like.user._id ? like.user._id.toString() : like.user.toString();
          return likeUserId === req.user._id.toString();
        });
      }
      return postObj;
    });

    res.json(postsWithMetadata);
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
};

// Get single post
const getPost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId)
      .populate('user', 'username avatar')
      .populate('comments.user', 'username avatar')
      .populate('likes.user', 'username');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Add view if not already viewed by this user
    const hasViewed = post.views.some(view => view.user.toString() === req.user._id.toString());
    if (!hasViewed) {
      post.views.push({ user: req.user._id });
      await post.save();
    }

    const postObj = post.toObject();
    postObj.likesCount = post.likes.length;
    postObj.commentsCount = post.comments.length;
    postObj.viewsCount = post.views.length;
    // Check if current user has liked this post
    postObj.isLiked = false;
    if (post.likes && req.user) {
      postObj.isLiked = post.likes.some(like => {
        const likeUserId = like.user._id ? like.user._id.toString() : like.user.toString();
        return likeUserId === req.user._id.toString();
      });
    }

    res.json(postObj);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

// Like/Unlike post - Với notification system hoàn chỉnh
const toggleLike = async (req, res) => {
  console.log('🔄 TOGGLE LIKE FUNCTION CALLED FOR POST:', req.params.postId);
  try {
    const { postId } = req.params;
    
    // Use validation helper
    const post = await validatePostOperation(postId, req.user._id);

    const existingLike = post.likes.find(like => like.user.toString() === req.user._id.toString());

    if (existingLike) {
      // Unlike
      post.likes = post.likes.filter(like => like.user.toString() !== req.user._id.toString());
      
      // Remove notification with proper error handling
      try {
        await Notification.deleteOne({
          recipient: post.user._id,
          sender: req.user._id,
          type: 'like',
          post: postId
        });
        console.log(`🗑️ Removed like notification for post ${postId}`);
      } catch (notifError) {
        console.error('Error removing like notification:', notifError);
        // Don't fail the entire operation if notification removal fails
      }

    } else {
      // Like
      post.likes.push({ user: req.user._id });

      // Create notification if not liking own post
      if (post.user._id.toString() !== req.user._id.toString()) {
        try {
          // Check spam prevention
          const canSend = await canSendNotification(req.user._id, post.user._id, 'like', postId);
          
          if (canSend) {
            const notification = await createNotification({
              recipient: post.user._id,
              sender: req.user._id,
              type: 'like',
              post: postId,
              message: 'liked your post'
            });

            // Send real-time notification with error handling
            const { getIO } = require('../config/socket');
            const io = getIO();
            if (io && notification) {
              try {
                const unreadCount = await Notification.countDocuments({
                  recipient: post.user._id,
                  isRead: false
                });

                io.to(`user_${post.user._id}`).emit('new-notification', {
                  notification,
                  unreadCount
                });
                
                console.log(`📱 Like notification sent to user_${post.user._id}`);
              } catch (socketError) {
                console.error('Error sending real-time notification:', socketError);
              }
            }
          }
        } catch (notifError) {
          console.error('Error creating like notification:', notifError);
          // Continue with like functionality even if notification fails
        }
      }
    }

    await post.save();

    // Emit real-time post update with error handling
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      console.log('🔗 IO instance available:', !!io);
      if (io) {
        const eventData = {
          postId,
          likes: post.likes.length,
          isLiked: !existingLike,
          userId: req.user._id.toString()
        };
        console.log('📤 Emitting post-like-updated:', eventData);
        io.emit('post-like-updated', eventData);
        console.log(`👍 Like update broadcasted for post ${postId}`);
      }
    } catch (socketError) {
      console.error('Error emitting post update:', socketError);
    }

    res.json({
      liked: !existingLike,
      likesCount: post.likes.length
    });
  } catch (error) {
    if (error.message === 'Post not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Not authorized')) {
      return res.status(403).json({ error: error.message });
    }
    
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
};

// Add comment - Sử dụng embedded comments từ Post schema
const addComment = async (req, res) => {
  console.log('💬 ADD COMMENT FUNCTION CALLED FOR POST:', req.params.postId);
  try {
    const { postId } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const post = await Post.findById(postId).populate('user', 'username');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.turnOffCommenting) {
      return res.status(403).json({ error: 'Comments are disabled for this post' });
    }

    // Thêm comment vào embedded array
    post.comments.push({
      user: req.user._id,
      text: text.trim()
    });

    await post.save();
    
    // Populate the new comment
    await post.populate('comments.user', 'username avatar');
    const newComment = post.comments[post.comments.length - 1];

    // Create notification với comment info
    if (post.user._id.toString() !== req.user._id.toString()) {
      try {
        const notification = await createNotification({
          recipient: post.user._id,
          sender: req.user._id,
          type: 'comment',
          post: postId,
          commentId: newComment._id, // ID của comment trong embedded array
          commentText: newComment.text, // Text của comment
          message: 'commented on your post'
        });

        // Send real-time notification
        const { getIO } = require('../config/socket');
        const io = getIO();
        if (io && notification) {
          const unreadCount = await Notification.countDocuments({
            recipient: post.user._id,
            isRead: false
          });

          io.to(`user_${post.user._id}`).emit('new-notification', {
            notification,
            unreadCount
          });
          
          console.log(`📱 Comment notification sent to user_${post.user._id}`);
        }
      } catch (notifError) {
        console.error('Error creating comment notification:', notifError);
      }
    }

    // Emit real-time comment update
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      console.log('🔗 IO instance available for comment:', !!io);
      if (io) {
        const eventData = {
          postId,
          comment: newComment,
          commentsCount: post.comments.length
        };
        console.log('📤 Emitting post-comment-added:', eventData);
        io.emit('post-comment-added', eventData);
        console.log(`💬 Comment update broadcasted for post ${postId}`);
      }
    } catch (socketError) {
      console.error('Error emitting comment update:', socketError);
    }

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

// Delete comment với cleanup notifications
const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    post.comments.pull(commentId);
    await post.save();

    // Remove related notifications bằng commentId
    try {
      await Notification.deleteMany({
        type: 'comment',
        post: postId,
        commentId: commentId
      });
      
      console.log(`🗑️ Removed notifications for deleted comment ${commentId}`);
    } catch (notifError) {
      console.error('Error removing comment notifications:', notifError);
    }

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

// Delete all my comments from all posts
const deleteAllMyComments = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all posts that have comments from this user
    const postsWithMyComments = await Post.find({
      'comments.user': userId
    });

    let totalDeletedComments = 0;

    // Remove user's comments from all posts
    for (const post of postsWithMyComments) {
      const initialCommentsCount = post.comments.length;
      post.comments = post.comments.filter(comment => 
        comment.user.toString() !== userId.toString()
      );
      const deletedFromThisPost = initialCommentsCount - post.comments.length;
      totalDeletedComments += deletedFromThisPost;
      await post.save();
    }

    // Clean up related notifications
    try {
      await Notification.deleteMany({
        sender: userId,
        type: 'comment'
      });
      
      console.log(`🗑️ Removed all comment notifications for user ${userId}`);
    } catch (notifError) {
      console.error('Error removing comment notifications:', notifError);
    }

    res.json({ 
      message: 'All your comments have been deleted successfully',
      deletedComments: totalDeletedComments,
      postsAffected: postsWithMyComments.length
    });
  } catch (error) {
    console.error('Error deleting all comments:', error);
    res.status(500).json({ error: 'Failed to delete all comments' });
  }
};

// Delete post - Với notification cleanup
const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    
    const post = await validatePostOperation(postId, req.user._id, true);

    await Post.findByIdAndDelete(postId);

    // Clean up all related notifications
    try {
      await Notification.deleteMany({
        post: postId
      });
      
      console.log(`🗑️ Removed all notifications for deleted post ${postId}`);
    } catch (notifError) {
      console.error('Error removing post notifications:', notifError);
    }

    // Emit real-time update
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      if (io) {
        io.emit('post-deleted', { postId });
      }
    } catch (socketError) {
      console.error('Error emitting post deletion:', socketError);
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    if (error.message === 'Post not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Not authorized')) {
      return res.status(403).json({ error: error.message });
    }
    
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

module.exports = {
  createPost,
  getAllPosts,
  getPostsByUser,
  getPost,
  toggleLike,
  addComment,
  deleteComment,
  deleteAllMyComments,
  deletePost
};
