const Notification = require('../models/Notification');
const User = require('../models/User');
const Post = require('../models/Post');

// Get notifications for current user
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ recipient: userId })
      .populate('sender', 'username avatar')
      .populate('post', 'content images')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });

    const total = await Notification.countDocuments({ recipient: userId });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalNotifications: total
        }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Mark notification as read - FUNCTION BỊ THIẾU
const markAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('notification-read', {
        notificationId,
        unreadCount
      });
    }

    res.json({
      success: true,
      data: { notification, unreadCount }
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('all-notifications-read', {
        unreadCount: 0
      });
    }

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get unread count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });

    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Helper function để tạo notification với embedded comments
const createNotification = async ({ recipient, sender, type, post, commentId, commentText, message }) => {
  try {
    if (sender.toString() === recipient.toString()) {
      return null;
    }

    // Check for duplicate like notifications
    if (type === 'like') {
      const existing = await Notification.findOne({
        recipient,
        sender,
        type: 'like',
        post,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      if (existing) {
        existing.createdAt = new Date();
        existing.isRead = false;
        await existing.save();
        await existing.populate([
          { path: 'sender', select: 'username avatar' },
          { path: 'post', select: 'content images' }
        ]);
        return existing;
      }
    }

    const notification = await Notification.create({
      recipient,
      sender,
      type,
      post,
      commentId,
      commentText,
      message
    });

    await notification.populate([
      { path: 'sender', select: 'username avatar' },
      { path: 'post', select: 'content images' }
    ]);

    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
};

// EXPORT ĐẦY ĐỦ TẤT CẢ FUNCTIONS
module.exports = {
  getNotifications,
  markAsRead,          // ✅ Function này giờ đã được define
  markAllAsRead,
  getUnreadCount,
  createNotification
};
