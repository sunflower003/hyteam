const User = require('../models/User');
const Conversation = require('../models/Conversation');
const ChatMessage = require('../models/ChatMessage');
const { createResponse } = require('../utils/response');

// Tìm kiếm users để start chat
const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user.id;

    console.log('Search users request:', { query, currentUserId });

    if (!query || query.trim().length < 2) {
      return res.status(400).json(createResponse(false, null, 'Query must be at least 2 characters'));
    }

    const searchTerm = query.trim();
    
    // Tìm users theo username hoặc email, loại trừ current user
    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { username: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ]
    })
    .select('username email avatar isActive lastLogin')
    .limit(10)
    .sort({ username: 1 });

    console.log(`Found ${users.length} users for query: ${searchTerm}`);

    res.json(createResponse(true, users, `Found ${users.length} users`));
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json(createResponse(false, null, 'Server error'));
  }
};

// Lấy danh sách conversations của user
const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const conversations = await Conversation.find({
      'participants.user': userId,
      isActive: true
    })
    .populate('participants.user', 'username avatar')
    .populate('lastMessage')
    .sort({ lastActivity: -1 })
    .limit(50);

    // Format data cho frontend
    const formattedConversations = conversations.map(conv => {
      const otherParticipant = conv.participants.find(p => 
        p.user._id.toString() !== userId
      );
      
      return {
        _id: conv._id,
        type: conv.type,
        name: conv.type === 'group' ? conv.name : otherParticipant?.user.username,
        avatar: conv.type === 'group' ? conv.avatar : otherParticipant?.user.avatar,
        lastMessage: conv.lastMessage,
        lastActivity: conv.lastActivity,
        unreadCount: conv.unreadCount.get(userId) || 0,
        participants: conv.participants
      };
    });

    res.json(createResponse(true, formattedConversations, 'Conversations retrieved successfully'));
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json(createResponse(false, null, 'Server error'));
  }
};

// Tạo hoặc lấy conversation giữa 2 users
const createOrGetPrivateConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json(createResponse(false, null, 'Target user ID is required'));
    }

    if (userId === targetUserId) {
      return res.status(400).json(createResponse(false, null, 'Cannot create conversation with yourself'));
    }

    // Kiểm tra target user tồn tại
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json(createResponse(false, null, 'Target user not found'));
    }

    // Tìm conversation hiện tại
    let conversation = await Conversation.findOne({
      type: 'private',
      'participants.user': { $all: [userId, targetUserId] }
    }).populate('participants.user', 'username avatar email');

    if (!conversation) {
      // Tạo conversation mới
      conversation = await Conversation.create({
        type: 'private',
        participants: [
          { user: userId },
          { user: targetUserId }
        ]
      });

      await conversation.populate('participants.user', 'username avatar email');
    }

    // Format cho frontend
    const otherParticipant = conversation.participants.find(p => 
      p.user._id.toString() !== userId
    );

    const formattedConversation = {
      _id: conversation._id,
      type: conversation.type,
      name: otherParticipant?.user.username,
      avatar: otherParticipant?.user.avatar,
      lastMessage: conversation.lastMessage,
      lastActivity: conversation.lastActivity,
      unreadCount: conversation.unreadCount.get(userId) || 0,
      participants: conversation.participants
    };

    res.json(createResponse(true, formattedConversation, 'Conversation created/retrieved successfully'));
  } catch (error) {
    console.error('Create/get conversation error:', error);
    res.status(500).json(createResponse(false, null, 'Server error'));
  }
};

// Lấy messages của conversation
const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Kiểm tra user có quyền xem conversation không
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user': userId
    });

    if (!conversation) {
      return res.status(404).json(createResponse(false, null, 'Conversation not found'));
    }

    const messages = await ChatMessage.find({
      conversationId,
      isDeleted: false
    })
    .populate('sender', 'username avatar')
    .populate('replyTo')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    // Đảo ngược để hiển thị từ cũ đến mới
    messages.reverse();

    // Đánh dấu messages là đã đọc
    await ChatMessage.updateMany(
      {
        conversationId,
        sender: { $ne: userId },
        'readBy.user': { $ne: userId }
      },
      {
        $push: { readBy: { user: userId } }
      }
    );

    // Reset unread count
    await conversation.resetUnreadCount(userId);

    res.json(createResponse(true, {
      messages,
      hasMore: messages.length === limit
    }, 'Messages retrieved successfully'));
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json(createResponse(false, null, 'Server error'));
  }
};

// Gửi message
const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId, content, messageType = 'text', replyTo } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json(createResponse(false, null, 'Message content is required'));
    }

    // Kiểm tra conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user': userId
    }).populate('participants.user', 'username avatar');

    if (!conversation) {
      return res.status(404).json(createResponse(false, null, 'Conversation not found'));
    }

    // Tạo message mới
    const message = await ChatMessage.create({
      conversationId,
      sender: userId,
      content: content.trim(),
      messageType,
      replyTo: replyTo || null
    });

    await message.populate('sender', 'username avatar');
    if (replyTo) {
      await message.populate('replyTo');
    }

    // Cập nhật conversation
    conversation.lastMessage = message._id;
    conversation.lastActivity = new Date();

    // Tăng unread count cho các participants khác
    conversation.participants.forEach(participant => {
      if (participant.user._id.toString() !== userId) {
        const currentCount = conversation.unreadCount.get(participant.user._id.toString()) || 0;
        conversation.unreadCount.set(participant.user._id.toString(), currentCount + 1);
      }
    });

    await conversation.save();

    res.json(createResponse(true, message, 'Message sent successfully'));
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json(createResponse(false, null, 'Server error'));
  }
};

// Đánh dấu messages đã đọc
const markMessagesAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    // Kiểm tra quyền truy cập
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user': userId
    });

    if (!conversation) {
      return res.status(404).json(createResponse(false, null, 'Conversation not found'));
    }

    // Đánh dấu tất cả messages chưa đọc là đã đọc
    await ChatMessage.updateMany(
      {
        conversationId,
        sender: { $ne: userId },
        'readBy.user': { $ne: userId }
      },
      {
        $push: { readBy: { user: userId } }
      }
    );

    // Reset unread count
    await conversation.resetUnreadCount(userId);

    res.json(createResponse(true, null, 'Messages marked as read'));
  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json(createResponse(false, null, 'Server error'));
  }
};

module.exports = {
  getConversations,
  createOrGetPrivateConversation,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  searchUsers
};