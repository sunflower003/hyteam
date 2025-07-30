const express = require('express');
const { upload, handleUploadError } = require('../middleware/upload');
const { protect, optionalAuth, ownerOrAdmin } = require('../middleware/auth');
const { validateCreatePost, validateUpdatePost, validateComment } = require('../middleware/validation');
const {
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
} = require('../controllers/postController');

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getAllPosts);
router.get('/search', optionalAuth, searchPosts);
router.get('/:id', optionalAuth, getPostById);
router.get('/user/:userId', getUserPosts);

// Protected routes
router.use(protect);

// Create post
router.post('/', 
    upload.single('image'), 
    handleUploadError, 
    validateCreatePost,
    createPost
);

// CRUD operations
router.put('/:id', ownerOrAdmin('author'), validateUpdatePost, updatePost);
router.delete('/:id', ownerOrAdmin('author'), deletePost);

// Social interactions
router.post('/:id/like', likePost);
router.delete('/:id/like', unlikePost);
router.post('/:id/comments', validateComment, addComment);

module.exports = router;
