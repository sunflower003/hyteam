const Story = require('../models/Story');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { createResponse } = require('../utils/response');
const { cloudinary } = require('../middleware/upload');

// CREATE STORY
const createStory = async (req, res) => {
  try {
    const {
      content = '',
      duration = 15,
      filters = {},
      textOverlays = []
    } = req.body;
    
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json(
        createResponse(false, null, 'Media file is required')
      );
    }

    // Xóa story cũ nếu user đã có (chỉ cho phép 1 story active)
    await Story.deleteMany({
      userId,
      expiresAt: { $gt: new Date() }
    });

    // Parse filters và textOverlays từ string nếu cần
    let parsedFilters = {};
    let parsedTextOverlays = [];

    try {
      parsedFilters = typeof filters === 'string' ? JSON.parse(filters) : filters;
      parsedTextOverlays = typeof textOverlays === 'string' ? JSON.parse(textOverlays) : textOverlays;
    } catch (error) {
      console.warn('Error parsing filters or textOverlays:', error);
    }

    const story = await Story.create({
      userId,
      content,
      mediaUrl: req.file.path,
      mediaType: (() => {
        const url = req.file.path || '';
        if (url.match(/\.(mp4|mov|webm|avi)$/i)) return 'video';
        if (req.file.mimetype && req.file.mimetype.startsWith('video/')) return 'video';
        return 'image';
      })(),
      duration: parseInt(duration),
      filters: parsedFilters,
      textOverlays: parsedTextOverlays,
      mediaMetadata: {
        originalName: req.file.original_filename,
        fileSize: req.file.bytes,
        dimensions: {
          width: req.file.width || 0,
          height: req.file.height || 0
        },
        publicId: req.file.public_id
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
    });

    await story.populate('userId', 'username avatar');

    // Emit real-time story update
    try {
      const io = req.app.get('io');
      console.log('📖 STORY CREATED:', story._id);
      console.log('🔗 IO instance available for story:', !!io);
      
      if (io) {
        const storyData = {
          story: {
            _id: story._id,
            userId: story.userId,
            mediaUrl: story.mediaUrl,
            mediaType: story.mediaType,
            content: story.content,
            createdAt: story.createdAt,
            expiresAt: story.expiresAt,
            duration: story.duration,
            filters: story.filters,
            textOverlays: story.textOverlays
          }
        };
        console.log('📤 Emitting new-story:', storyData);
        io.emit('new-story', storyData);
        console.log(`📖 New story broadcasted for user ${story.userId.username}`);
      }
    } catch (socketError) {
      console.error('Error emitting story update:', socketError);
    }

    // Create notifications for all users (internal network - everyone is connected)
    try {
      // Get all users except the story creator
      const allUsers = await User.find({ 
        _id: { $ne: userId } 
      }, '_id username');
      
      if (allUsers && allUsers.length > 0) {
        console.log(`📱 Creating story notifications for ${allUsers.length} users (internal network)`);
        
        const notifications = allUsers.map(user => ({
          recipient: user._id,
          sender: userId,
          type: 'story',
          story: story._id,
          message: `${story.userId.username} posted a new story`
        }));

        await Notification.insertMany(notifications);
        console.log(`✅ Created ${notifications.length} story notifications`);

        // Emit notifications to all users via socket
        const io = req.app.get('io');
        if (io) {
          for (const user of allUsers) {
            // Get updated unread count for each user
            const unreadCount = await Notification.countDocuments({
              recipient: user._id,
              isRead: false
            });

            io.to(`user_${user._id}`).emit('new-notification', {
              notification: {
                _id: new Date().getTime(), // Temporary ID
                recipient: user._id,
                sender: {
                  _id: userId,
                  username: story.userId.username,
                  avatar: story.userId.avatar
                },
                type: 'story',
                story: story._id,
                message: `posted a new story`,
                isRead: false,
                createdAt: new Date()
              },
              unreadCount: unreadCount
            });
          }
          console.log(`📤 Story notifications sent to all users via socket`);
        }
      } else {
        console.log(`📱 No other users found to notify about story`);
      }
    } catch (notificationError) {
      console.error('Error creating story notifications:', notificationError);
    }

    res.status(201).json(
      createResponse(true, { story }, 'Story created successfully')
    );
  } catch (error) {
    console.error('Create story error:', error);
    return res.status(500).json(
      createResponse(false, null, 'Server error', error.message)
    );
  }
};

// GET ALL ACTIVE STORIES
const getAllStories = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Lấy tất cả stories chưa hết hạn
    const stories = await Story.find({
      expiresAt: { $gt: new Date() }
    })
    .populate('userId', 'username avatar')
    .sort({ createdAt: -1 });

    // Group stories by user và add trạng thái xem
    const storiesByUser = {};
    
    stories.forEach(story => {
      const userId = story.userId._id.toString();
      
      if (!storiesByUser[userId]) {
        storiesByUser[userId] = {
          user: story.userId,
          stories: [],
          hasUnwatched: false
        };
      }
      
      // Check if current user đã xem story này
      const hasViewed = story.viewers.some(viewer => 
        viewer.userId.toString() === currentUserId
      );
      
      const storyData = {
        ...story.toObject(),
        hasViewed
      };
      
      storiesByUser[userId].stories.push(storyData);
      
      // Nếu có story chưa xem thì đánh dấu
      if (!hasViewed) {
        storiesByUser[userId].hasUnwatched = true;
      }
    });

    // Convert to array và sắp xếp theo priority
    const result = Object.values(storiesByUser).map(userStories => ({
      user: userStories.user,
      stories: userStories.stories,
      storyStatus: userStories.hasUnwatched ? 'new' : 'watched',
      hasStory: true
    }));

    // Sort theo priority: new > watched
    result.sort((a, b) => {
      const priorityOrder = { 'new': 0, 'watched': 1 };
      return priorityOrder[a.storyStatus] - priorityOrder[b.storyStatus];
    });

    res.json(
      createResponse(true, { stories: result }, 'Stories retrieved successfully')
    );
  } catch (error) {
    console.error('Get stories error:', error);
    return res.status(500).json(
      createResponse(false, null, 'Server error', error.message)
    );
  }
};

// GET USER STORIES
const getUserStories = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const stories = await Story.find({
      userId,
      expiresAt: { $gt: new Date() }
    })
    .populate('userId', 'username avatar')
    .sort({ createdAt: -1 });

    // Add viewed status
    const storiesWithStatus = stories.map(story => {
      const hasViewed = story.viewers.some(viewer => 
        viewer.userId.toString() === currentUserId
      );
      
      return {
        ...story.toObject(),
        hasViewed
      };
    });

    res.json(
      createResponse(true, { stories: storiesWithStatus }, 'User stories retrieved successfully')
    );
  } catch (error) {
    console.error('Get user stories error:', error);
    return res.status(500).json(
      createResponse(false, null, 'Server error', error.message)
    );
  }
};

// VIEW STORY (mark as viewed)
const viewStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const currentUserId = req.user.id;

    const story = await Story.findById(storyId);
    
    if (!story) {
      return res.status(404).json(
        createResponse(false, null, 'Story not found')
      );
    }

    // Check if story đã hết hạn
    if (story.expiresAt <= new Date()) {
      return res.status(410).json(
        createResponse(false, null, 'Story has expired')
      );
    }

    // Add viewer nếu chưa xem
    await story.addViewer(currentUserId);

    res.json(
      createResponse(true, { story }, 'Story viewed successfully')
    );
  } catch (error) {
    console.error('View story error:', error);
    return res.status(500).json(
      createResponse(false, null, 'Server error', error.message)
    );
  }
};

// DELETE STORY
const deleteStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const currentUserId = req.user.id;

    const story = await Story.findById(storyId);
    
    if (!story) {
      return res.status(404).json(
        createResponse(false, null, 'Story not found')
      );
    }

    // Check ownership
    if (story.userId.toString() !== currentUserId) {
      return res.status(403).json(
        createResponse(false, null, 'Not authorized to delete this story')
      );
    }

    // Delete from cloudinary if exists
    if (story.mediaMetadata?.publicId) {
      try {
        await cloudinary.uploader.destroy(story.mediaMetadata.publicId);
      } catch (cloudinaryError) {
        console.warn('Cloudinary delete error:', cloudinaryError);
      }
    }

    await Story.findByIdAndDelete(storyId);

    res.json(
      createResponse(true, null, 'Story deleted successfully')
    );
  } catch (error) {
    console.error('Delete story error:', error);
    return res.status(500).json(
      createResponse(false, null, 'Server error', error.message)
    );
  }
};

// GET STORY VIEWERS
const getStoryViewers = async (req, res) => {
  try {
    const { storyId } = req.params;
    const currentUserId = req.user.id;

    const story = await Story.findById(storyId)
      .populate('viewers.userId', 'username avatar');
    
    if (!story) {
      return res.status(404).json(
        createResponse(false, null, 'Story not found')
      );
    }

    // Check ownership
    if (story.userId.toString() !== currentUserId) {
      return res.status(403).json(
        createResponse(false, null, 'Not authorized to view story viewers')
      );
    }

    const viewers = story.viewers.map(viewer => ({
      user: viewer.userId,
      viewedAt: viewer.viewedAt
    }));

    res.json(
      createResponse(true, { viewers, totalViews: viewers.length }, 'Story viewers retrieved successfully')
    );
  } catch (error) {
    console.error('Get story viewers error:', error);
    return res.status(500).json(
      createResponse(false, null, 'Server error', error.message)
    );
  }
};

module.exports = {
  createStory,
  getAllStories,
  getUserStories,
  viewStory,
  deleteStory,
  getStoryViewers
};
