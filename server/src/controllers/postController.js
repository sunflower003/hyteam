const Post = require('../models/Post');
const User = require('../models/User');
const { createResponse, createPaginatedResponse } = require('../utils/response');
const { cloudinary } = require('../middleware/upload');

// CREATE POST
const createPost = async (req, res) => {
    try {
        const { content, tags, location } = req.body;
        const authorId = req.user.id;
        
        console.log(`📝 Creating post for user: ${req.user.username}`);

        if (!req.file) {
            return res.status(400).json(
                createResponse(false, null, 'Image is required')
            );
        }

        const post = await Post.create({
            author: authorId,
            content: content || '',
            mediaUrl: req.file.path,
            mediaType: req.file.resource_type === 'video' ? 'video' : 'image',
            mediaMetadata: {
                originalName: req.file.originalname,
                fileSize: req.file.size,
                dimensions: {
                    width: req.file.width || 0,
                    height: req.file.height || 0
                },
                publicId: req.file.filename
            },
            tags: tags ? tags.split(',').map(tag => tag.trim().toLowerCase()) : [],
            location: location || ''
        });

        await post.populate('author', 'username avatar');

        res.status(201).json(
            createResponse(true, { post }, 'Post created successfully')
        );
    } catch (error) {
        console.error('❌ Create post error:', error);
        return res.status(500).json(
            createResponse(false, null, 'Server error', error.message)
        );
    }
};

// GET ALL POSTS (FEED)
const getAllPosts = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;
        const currentUserId = req.user?.id;

        const posts = await Post.find({
            isActive: true,
            'flags.isHidden': { $ne: true }
        })
        .populate('author', 'username avatar followersCount')
        .populate('comments.author', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

        const totalPosts = await Post.countDocuments({
            isActive: true,
            'flags.isHidden': { $ne: true }
        });

        // Add user interaction data
        if (currentUserId) {
            posts.forEach(post => {
                post._doc.isLiked = post.likes.some(like => 
                    like.userId.toString() === currentUserId.toString()
                );
            });
        }

        const pagination = {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalPosts / limit),
            totalPosts,
            hasNextPage: skip + posts.length < totalPosts
        };

        res.json(
            createPaginatedResponse(true, posts, pagination, 'Posts retrieved successfully')
        );
    } catch (error) {
        return res.status(500).json(
            createResponse(false, null, 'Server error', error.message)
        );
    }
};

// SEARCH POSTS
const searchPosts = async (req, res) => {
    try {
        const { q, page = 1, limit = 20 } = req.query;
        
        if (!q || q.trim().length === 0) {
            return res.status(400).json(
                createResponse(false, null, 'Search query is required')
            );
        }

        const skip = (page - 1) * limit;
        const searchQuery = q.trim();

        const posts = await Post.find({
            $and: [
                { isActive: true },
                { 'flags.isHidden': { $ne: true } },
                {
                    $or: [
                        { content: { $regex: searchQuery, $options: 'i' } },
                        { tags: { $regex: searchQuery, $options: 'i' } },
                        { location: { $regex: searchQuery, $options: 'i' } }
                    ]
                }
            ]
        })
        .populate('author', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

        const totalResults = await Post.countDocuments({
            $and: [
                { isActive: true },
                { 'flags.isHidden': { $ne: true } },
                {
                    $or: [
                        { content: { $regex: searchQuery, $options: 'i' } },
                        { tags: { $regex: searchQuery, $options: 'i' } },
                        { location: { $regex: searchQuery, $options: 'i' } }
                    ]
                }
            ]
        });

        const pagination = {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalResults / limit),
            totalResults,
            hasNextPage: skip + posts.length < totalResults
        };

        res.json(
            createPaginatedResponse(true, posts, pagination, `Found ${totalResults} posts`)
        );
    } catch (error) {
        return res.status(500).json(
            createResponse(false, null, 'Server error', error.message)
        );
    }
};

// GET POST BY ID
const getPostById = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user?.id;

        const post = await Post.findById(id)
            .populate('author', 'username avatar followersCount followingCount postsCount')
            .populate('comments.author', 'username avatar')
            .populate('likes.userId', 'username avatar');

        if (!post || !post.isActive) {
            return res.status(404).json(
                createResponse(false, null, 'Post not found')
            );
        }

        // Increment view count
        if (!currentUserId || post.author._id.toString() !== currentUserId.toString()) {
            post.stats.viewsCount = (post.stats.viewsCount || 0) + 1;
            await post.save();
        }

        // Add user interaction data
        if (currentUserId) {
            post._doc.isLiked = post.likes.some(like => 
                like.userId._id.toString() === currentUserId.toString()
            );
            post._doc.isOwner = post.author._id.toString() === currentUserId.toString();
        }

        res.json(
            createResponse(true, { post }, 'Post retrieved successfully')
        );
    } catch (error) {
        return res.status(500).json(
            createResponse(false, null, 'Server error', error.message)
        );
    }
};

// UPDATE POST
const updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { content, tags, location } = req.body;
        
        const post = await Post.findById(id);
        if (!post || !post.isActive) {
            return res.status(404).json(
                createResponse(false, null, 'Post not found')
            );
        }

        // Update fields
        if (content !== undefined) post.content = content;
        if (tags !== undefined) {
            post.tags = tags.split(',').map(tag => tag.trim().toLowerCase());
        }
        if (location !== undefined) post.location = location;

        await post.save();
        await post.populate('author', 'username avatar');

        res.json(
            createResponse(true, { post }, 'Post updated successfully')
        );
    } catch (error) {
        return res.status(500).json(
            createResponse(false, null, 'Server error', error.message)
        );
    }
};

// DELETE POST
const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        
        const post = await Post.findById(id);
        if (!post || !post.isActive) {
            return res.status(404).json(
                createResponse(false, null, 'Post not found')
            );
        }

        // Soft delete
        post.isActive = false;
        await post.save();

        // Delete from Cloudinary
        if (post.mediaMetadata?.publicId) {
            try {
                await cloudinary.uploader.destroy(post.mediaMetadata.publicId);
            } catch (cloudError) {
                console.error('⚠️ Cloudinary delete error:', cloudError);
            }
        }

        res.json(
            createResponse(true, null, 'Post deleted successfully')
        );
    } catch (error) {
        return res.status(500).json(
            createResponse(false, null, 'Server error', error.message)
        );
    }
};

// LIKE POST
const likePost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const post = await Post.findById(id);
        if (!post || !post.isActive) {
            return res.status(404).json(
                createResponse(false, null, 'Post not found')
            );
        }

        await post.addLike(userId);

        res.json(
            createResponse(true, { 
                likesCount: post.stats.likesCount,
                isLiked: true 
            }, 'Post liked successfully')
        );
    } catch (error) {
        return res.status(500).json(
            createResponse(false, null, 'Server error', error.message)
        );
    }
};

// UNLIKE POST
const unlikePost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const post = await Post.findById(id);
        if (!post || !post.isActive) {
            return res.status(404).json(
                createResponse(false, null, 'Post not found')
            );
        }

        await post.removeLike(userId);

        res.json(
            createResponse(true, { 
                likesCount: post.stats.likesCount,
                isLiked: false 
            }, 'Post unliked successfully')
        );
    } catch (error) {
        return res.status(500).json(
            createResponse(false, null, 'Server error', error.message)
        );
    }
};

// ADD COMMENT
const addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        const post = await Post.findById(id);
        if (!post || !post.isActive) {
            return res.status(404).json(
                createResponse(false, null, 'Post not found')
            );
        }

        await post.addComment(userId, content);
        await post.populate('comments.author', 'username avatar');

        const newComment = post.comments[post.comments.length - 1];

        res.status(201).json(
            createResponse(true, { 
                comment: newComment,
                commentsCount: post.stats.commentsCount 
            }, 'Comment added successfully')
        );
    } catch (error) {
        return res.status(500).json(
            createResponse(false, null, 'Server error', error.message)
        );
    }
};

// GET USER POSTS
const getUserPosts = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 12 } = req.query;
        const skip = (page - 1) * limit;

        const user = await User.findById(userId).select('username avatar postsCount');
        if (!user) {
            return res.status(404).json(
                createResponse(false, null, 'User not found')
            );
        }

        const posts = await Post.find({
            author: userId,
            isActive: true
        })
        .populate('author', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('mediaUrl mediaType stats createdAt');

        const totalPosts = await Post.countDocuments({
            author: userId,
            isActive: true
        });

        const pagination = {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalPosts / limit),
            totalPosts
        };

        res.json(
            createPaginatedResponse(true, { user, posts }, pagination, 'User posts retrieved successfully')
        );
    } catch (error) {
        return res.status(500).json(
            createResponse(false, null, 'Server error', error.message)
        );
    }
};

module.exports = {
    createPost,
    getAllPosts,
    searchPosts,
    getPostById,
    updatePost,
    deletePost,
    likePost,
    unlikePost,
    addComment,
    getUserPosts
};
