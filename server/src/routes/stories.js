const express = require('express');
const multer = require('multer');
const path = require('path');
const Story = require('../models/Story');
const auth = require('../middleware/auth');

const router = express.Router();

// Cấu hình multer cho upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/stories/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `story-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB cho video
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files allowed'), false);
    }
  }
});

// GET /api/stories - Lấy danh sách stories
router.get('/', auth, async (req, res) => {
  try {
    const stories = await Story.find({
      expiresAt: { $gt: new Date() } // Chỉ lấy story chưa hết hạn
    })
    .populate('userId', 'username avatar')
    .sort({ createdAt: -1 });

    res.json(stories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stories', error });
  }
});

// POST /api/stories - Tạo story mới
router.post('/', auth, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const story = new Story({
      userId: req.user.id,
      mediaUrl: `/uploads/stories/${req.file.filename}`,
      mediaType: req.body.type || (req.file.mimetype.startsWith('image/') ? 'image' : 'video'),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 giờ
    });

    await story.save();
    await story.populate('userId', 'username avatar');

    res.status(201).json(story);
  } catch (error) {
    res.status(500).json({ message: 'Error creating story', error });
  }
});

module.exports = router;
