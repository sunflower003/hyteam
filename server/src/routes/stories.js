const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Story = require('../models/Story');
const auth = require('../middleware/auth');

const router = express.Router();

// Ensure upload directory exists with proper permissions
const uploadDir = 'uploads/stories';
const createUploadDir = () => {
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
      console.log(`📁 Created directory: ${uploadDir}`);
    }
    
    // Verify directory is writable
    fs.accessSync(uploadDir, fs.constants.W_OK);
    console.log(`✅ Upload directory accessible: ${uploadDir}`);
  } catch (error) {
    console.error(`❌ Error creating/accessing upload directory:`, error);
    throw new Error('Upload directory setup failed');
  }
};

createUploadDir();

// Configure multer for file upload with enhanced validation
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Double-check directory exists on each upload
    if (!fs.existsSync(uploadDir)) {
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
      } catch (error) {
        return cb(new Error('Failed to create upload directory'));
      }
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname).toLowerCase();
      const filename = `story-${uniqueSuffix}${extension}`;
      
      console.log(`📝 Generated filename: ${filename}`);
      cb(null, filename);
    } catch (error) {
      cb(new Error('Failed to generate filename'));
    }
  }
});

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1, // Only 1 file
    fields: 10 // Limit form fields
  },
  fileFilter: (req, file, cb) => {
    console.log('📎 File upload attempt:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      fieldname: file.fieldname
    });

    // Allowed MIME types
    const allowedImageTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 
      'image/gif', 'image/webp', 'image/bmp'
    ];
    
    const allowedVideoTypes = [
      'video/mp4', 'video/webm', 'video/quicktime',
      'video/x-msvideo', 'video/mpeg'
    ];
    
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

    // Check MIME type
    if (!allowedTypes.includes(file.mimetype)) {
      console.log('❌ Invalid file type:', file.mimetype);
      return cb(new Error(`Invalid file type: ${file.mimetype}. Only images (JPG, PNG, GIF, WebP, BMP) and videos (MP4, WebM, MOV, AVI, MPEG) are allowed.`));
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
      '.mp4', '.webm', '.mov', '.avi', '.mpeg', '.mpg'
    ];
    
    if (!allowedExtensions.includes(ext)) {
      console.log('❌ Invalid file extension:', ext);
      return cb(new Error(`Invalid file extension: ${ext}`));
    }

    // Additional security: Check if file is actually an image/video
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    
    if (!isImage && !isVideo) {
      return cb(new Error('File must be an image or video'));
    }

    console.log('✅ File validation passed');
    cb(null, true);
  }
});

// Helper function to calculate time ago
const getTimeAgo = (date) => {
  if (!date) return 'now';
  
  try {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  } catch (error) {
    console.error('❌ Error calculating time ago:', error);
    return 'now';
  }
};

// Helper function to format story for frontend
const formatStoryForFrontend = (story) => {
  try {
    return {
      id: story._id,
      author: story.userId?.username || 'Unknown',
      avatar: story.userId?.avatar || '/img/default-avatar.jpg',
      image: story.mediaUrl,
      time: getTimeAgo(story.createdAt),
      status: 'new',
      mediaType: story.mediaType,
      content: story.content || '',
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
      viewCount: story.viewers?.length || 0,
      userId: story.userId?._id || story.userId
    };
  } catch (error) {
    console.error('❌ Error formatting story:', error);
    return {
      id: story._id,
      author: 'Unknown',
      avatar: '/img/default-avatar.jpg',
      image: story.mediaUrl,
      time: 'now',
      status: 'new',
      mediaType: story.mediaType || 'image',
      content: '',
      viewCount: 0
    };
  }
};

// GET /api/stories - Get active stories
router.get('/', auth, async (req, res) => {
  try {
    console.log('📖 Fetching stories for user:', req.user.id);

    const stories = await Story.find({
      expiresAt: { $gt: new Date() }, // Only active stories
      isActive: { $ne: false }
    })
    .populate('userId', 'username avatar')
    .sort({ createdAt: -1 })
    .limit(50) // Limit for performance
    .lean(); // Use lean for better performance

    console.log(`✅ Found ${stories.length} active stories`);

    const formattedStories = stories.map(formatStoryForFrontend);

    res.json({
      success: true,
      count: formattedStories.length,
      stories: formattedStories
    });

  } catch (error) {
    console.error('❌ Error fetching stories:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching stories', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/stories - Create new story
router.post('/', auth, upload.single('media'), async (req, res) => {
  try {
    console.log('📝 Story creation request:', {
      userId: req.user.id,
      userInfo: { id: req.user.id, username: req.user.username },
      body: req.body,
      file: req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        filename: req.file.filename,
        path: req.file.path
      } : 'No file'
    });

    // Validate user authentication
    if (!req.user || !req.user.id) {
      console.log('❌ No user found in request');
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized - Invalid token' 
      });
    }

    // Validate file upload
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded. Please select an image or video.' 
      });
    }

    // Additional file validation
    const filePath = req.file.path;
    const fileStats = fs.statSync(filePath);
    
    console.log('📊 File stats:', {
      size: fileStats.size,
      path: filePath,
      exists: fs.existsSync(filePath)
    });

    // Verify file was actually uploaded and has content
    if (fileStats.size === 0) {
      fs.unlinkSync(filePath); // Clean up empty file
      return res.status(400).json({
        success: false,
        message: 'Uploaded file is empty'
      });
    }

    // Validate file type based on actual content (additional security)
    const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
    
    console.log('💾 Creating story document...');
    
    // Create story document
    const storyData = {
      userId: req.user.id,
      mediaUrl: `/uploads/stories/${req.file.filename}`,
      mediaType: mediaType,
      content: req.body.content?.trim() || '',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      isActive: true,
      // Add metadata
      mediaMetadata: {
        originalName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      }
    };

    const story = new Story(storyData);

    // Save to database with error handling
    await story.save();
    console.log('💾 Story saved to database:', story._id);

    // Populate user data
    await story.populate('userId', 'username avatar');
    console.log('👤 User data populated:', story.userId?.username);

    // Verify population worked
    if (!story.userId) {
      console.log('⚠️ Warning: User data not populated properly');
    }

    // Format response for frontend
    const formattedStory = formatStoryForFrontend(story);

    console.log('✅ Story created successfully:', {
      id: story._id,
      author: story.userId?.username || 'Unknown',
      mediaType: story.mediaType,
      fileSize: req.file.size,
      filePath: req.file.path
    });

    // Emit real-time update if socket.io is available
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('story-update', formattedStory);
        console.log('📡 Real-time update sent');
      }
    } catch (socketError) {
      console.log('⚠️ Socket.io not available for real-time update:', socketError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Story created successfully',
      story: formattedStory
    });

  } catch (error) {
    console.error('❌ Error creating story:', error);
    
    // Clean up uploaded file if database save failed
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Cleaned up file after error:', req.file.filename);
      } catch (unlinkError) {
        console.error('❌ Error deleting file after error:', unlinkError);
      }
    }
    
    // Handle specific error types
    let errorMessage = 'Error creating story';
    let statusCode = 500;
    
    if (error.name === 'ValidationError') {
      errorMessage = 'Validation error: ' + Object.values(error.errors).map(e => e.message).join(', ');
      statusCode = 400;
    } else if (error.code === 11000) {
      errorMessage = 'Duplicate entry error';
      statusCode = 400;
    } else if (error.name === 'CastError') {
      errorMessage = 'Invalid data format';
      statusCode = 400;
    } else if (error.message.includes('ENOENT') || error.message.includes('EACCES')) {
      errorMessage = 'File system error - please try again';
      statusCode = 500;
    }
    
    res.status(statusCode).json({ 
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/stories/:id/view - Mark story as viewed
router.post('/:id/view', auth, async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.user.id;

    console.log(`👁️ User ${userId} viewing story ${storyId}`);

    // Validate ObjectId format
    if (!storyId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid story ID format'
      });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ 
        success: false,
        message: 'Story not found' 
      });
    }

    // Check if story is still active
    if (new Date() > story.expiresAt) {
      return res.status(410).json({ 
        success: false,
        message: 'Story has expired' 
      });
    }

    // Check if user already viewed this story
    const alreadyViewed = story.viewers.some(
      viewer => viewer.userId.toString() === userId.toString()
    );

    if (!alreadyViewed) {
      story.viewers.push({
        userId: userId,
        viewedAt: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress
      });
      
      // Update stats
      story.stats = story.stats || {};
      story.stats.uniqueViews = story.viewers.length;
      story.stats.lastViewedAt = new Date();
      
      await story.save();
      console.log(`✅ Added view for user ${userId} on story ${storyId}`);
    } else {
      console.log(`ℹ️ User ${userId} already viewed story ${storyId}`);
    }

    res.json({ 
      success: true,
      message: 'Story marked as viewed',
      viewCount: story.viewers.length,
      alreadyViewed: alreadyViewed
    });

  } catch (error) {
    console.error('❌ Error marking story as viewed:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error marking story as viewed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/stories/user/:userId - Get stories by specific user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    console.log(`📖 Fetching stories for user: ${targetUserId}`);

    // Validate ObjectId format
    if (!targetUserId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const stories = await Story.find({
      userId: targetUserId,
      expiresAt: { $gt: new Date() },
      isActive: { $ne: false }
    })
    .populate('userId', 'username avatar')
    .sort({ createdAt: -1 })
    .lean();

    const formattedStories = stories.map(formatStoryForFrontend);

    res.json({
      success: true,
      count: formattedStories.length,
      stories: formattedStories,
      userId: targetUserId
    });

  } catch (error) {
    console.error('❌ Error fetching user stories:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching user stories',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// DELETE /api/stories/:id - Delete story (owner only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.user.id;

    console.log(`🗑️ Delete request for story ${storyId} by user ${userId}`);

    // Validate ObjectId format
    if (!storyId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid story ID format'
      });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ 
        success: false,
        message: 'Story not found' 
      });
    }

    // Check if user owns this story
    if (story.userId.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to delete this story' 
      });
    }

    // Delete file from filesystem
    const filePath = path.join(process.cwd(), story.mediaUrl);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log('🗑️ File deleted:', filePath);
      } catch (fileError) {
        console.error('⚠️ Error deleting file (continuing with DB delete):', fileError);
      }
    } else {
      console.log('⚠️ File not found on filesystem:', filePath);
    }

    // Delete from database
    await Story.findByIdAndDelete(storyId);
    console.log('✅ Story deleted successfully:', storyId);

    // Emit real-time update if socket.io is available
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('story-deleted', { storyId });
        console.log('📡 Story deletion broadcasted');
      }
    } catch (socketError) {
      console.log('⚠️ Socket.io not available:', socketError.message);
    }

    res.json({ 
      success: true,
      message: 'Story deleted successfully',
      deletedId: storyId
    });

  } catch (error) {
    console.error('❌ Error deleting story:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting story',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/stories/stats - Get story statistics (admin/debug)
router.get('/stats', auth, async (req, res) => {
  try {
    const totalStories = await Story.countDocuments();
    const activeStories = await Story.countDocuments({
      expiresAt: { $gt: new Date() },
      isActive: { $ne: false }
    });
    const expiredStories = totalStories - activeStories;
    
    res.json({
      success: true,
      stats: {
        total: totalStories,
        active: activeStories,
        expired: expiredStories,
        uploadDirectory: uploadDir,
        diskUsage: await getDiskUsage()
      }
    });
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
});

// Helper function to get disk usage
async function getDiskUsage() {
  try {
    const uploadPath = path.join(process.cwd(), uploadDir);
    const files = fs.readdirSync(uploadPath);
    let totalSize = 0;
    
    files.forEach(file => {
      const filePath = path.join(uploadPath, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    });
    
    return {
      files: files.length,
      totalSize: totalSize,
      totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100
    };
  } catch (error) {
    return { error: 'Unable to calculate disk usage' };
  }
}

// Enhanced Multer error handling middleware
router.use((error, req, res, next) => {
  console.error('🚨 Route error handler:', error);
  
  if (error instanceof multer.MulterError) {
    console.error('📎 Multer error details:', {
      code: error.code,
      message: error.message,
      field: error.field
    });
    
    let message = 'File upload error';
    let statusCode = 400;
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large. Maximum size is 10MB.';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Only 1 file is allowed.';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected field name. Use "media" field for file upload.';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long.';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long.';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields.';
        break;
      default:
        message = `Upload error: ${error.message}`;
    }
    
    return res.status(statusCode).json({
      success: false,
      message: message,
      code: error.code
    });
  }
  
  // Handle custom file filter errors
  if (error.message && error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  if (error.message === 'Only image and video files allowed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Only images and videos are allowed.'
    });
  }
  
  // Handle other errors
  next(error);
});

module.exports = router;
