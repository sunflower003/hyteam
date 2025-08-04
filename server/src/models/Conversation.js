const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['private', 'group'],
    default: 'private'
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastSeen: {
      type: Date,
      default: Date.now
    },
    isAdmin: {
      type: Boolean,
      default: false
    }
  }],
  name: {
    type: String, // Tên group chat (chỉ dùng cho group)
    maxLength: 100
  },
  avatar: {
    type: String // Avatar group chat
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  // Đếm tin nhắn chưa đọc cho từng user
  unreadCount: {
    type: Map,
    of: Number,
    default: new Map()
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index cho performance
conversationSchema.index({ 'participants.user': 1, lastActivity: -1 });
conversationSchema.index({ type: 1, lastActivity: -1 });

// Method tìm conversation giữa 2 users
conversationSchema.statics.findPrivateConversation = function(userId1, userId2) {
  return this.findOne({
    type: 'private',
    'participants.user': { $all: [userId1, userId2] }
  }).populate('participants.user', 'username avatar')
    .populate('lastMessage');
};

// Method tăng unread count
conversationSchema.methods.incrementUnreadCount = function(userId) {
  const currentCount = this.unreadCount.get(userId.toString()) || 0;
  this.unreadCount.set(userId.toString(), currentCount + 1);
  return this.save();
};

// Method reset unread count
conversationSchema.methods.resetUnreadCount = function(userId) {
  this.unreadCount.set(userId.toString(), 0);
  return this.save();
};

module.exports = mongoose.model('Conversation', conversationSchema);