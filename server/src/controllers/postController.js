const Post = require('../models/Post');
const User = require('../models/User');
const { cloudinary } = require('../config/cloudinary');
const fs = require('fs');

// Create a new post
const createPost = async (req, res) => {
  try {
    const { caption, location, altText, hideViewCount, hideLikeCount, turnOffCommenting } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Upload image to cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'hyteam/posts',
      resource_type: 'auto'
    });

    // Clean up local file after upload
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const post = new Post({
      user: req.user._id,
      image: result.secure_url,
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
      postObj.isLiked = post.likes && req.user ? post.likes.some(like => like.user && like.user.toString() === req.user._id.toString()) : false;
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
      postObj.isLiked = post.likes.some(like => like.user.toString() === req.user._id.toString());
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
    postObj.isLiked = post.likes.some(like => like.user.toString() === req.user._id.toString());

    res.json(postObj);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

// Like/Unlike post
const toggleLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const existingLike = post.likes.find(like => like.user.toString() === req.user._id.toString());

    if (existingLike) {
      // Unlike
      post.likes = post.likes.filter(like => like.user.toString() !== req.user._id.toString());
    } else {
      // Like
      post.likes.push({ user: req.user._id });
    }

    await post.save();

    res.json({
      liked: !existingLike,
      likesCount: post.likes.length
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
};

// Add comment
const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.turnOffCommenting) {
      return res.status(403).json({ error: 'Comments are disabled for this post' });
    }

    post.comments.push({
      user: req.user._id,
      text: text.trim()
    });

    await post.save();
    
    // Populate the new comment
    await post.populate('comments.user', 'username avatar');

    const newComment = post.comments[post.comments.length - 1];

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

// Delete post
const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user owns the post
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    await Post.findByIdAndDelete(postId);

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
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
  deletePost
};
