const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { protect } = require('../middleware/auth');
const postController = require('../controllers/postController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/posts')
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

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

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

// Delete post
router.delete('/:postId', protect, postController.deletePost);

module.exports = router;
