const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { protect } = require('../middleware/auth');
const postController = require('../controllers/postController');
const { postStorage } = require('../config/cloudinary');
const { ensureUploadsDir } = require('../utils/fileUtils');

// Ensure uploads directory exists in development
if (process.env.NODE_ENV !== 'production') {
  ensureUploadsDir();
}

// Configure multer for file uploads
let storage;
let upload;

if (process.env.NODE_ENV === 'production') {
  // Use Cloudinary storage in production
  upload = multer({ 
    storage: postStorage,
    limits: {
      fileSize: 50 * 1024 * 1024 // 50MB limit
    }
  });
} else {
  // Use local storage in development
  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, '../../uploads/posts'))
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const fileFilter = (req, file, cb) => {
    // Accept images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'), false);
    }
  };

  upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 50 * 1024 * 1024 // 50MB limit
    }
  });
}

// Create post
router.post('/', protect, upload.single('image'), postController.createPost);

// Get all posts (feed)
router.get('/', protect, postController.getAllPosts);

// Get posts by user
router.get('/user/:userId', protect, postController.getPostsByUser);

// Get single post
router.get('/:postId', protect, postController.getPost);

// Like/Unlike post
router.post('/:postId/like', protect, postController.toggleLike);

// Add comment
router.post('/:postId/comment', protect, postController.addComment);

// Delete specific comment
router.delete('/:postId/comment/:commentId', protect, postController.deleteComment);

// Delete all my comments from all posts
router.delete('/my-comments/all', protect, postController.deleteAllMyComments);

// Delete post
router.delete('/:postId', protect, postController.deletePost);

module.exports = router;
