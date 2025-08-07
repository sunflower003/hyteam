const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['like', 'comment', 'follow', 'mention', 'story', 'post'],
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: function() { 
      return this.type === 'like' || this.type === 'comment' || this.type === 'post'; 
    }
  },
  commentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: function() { 
      return this.type === 'comment'; 
    }
  },
  commentText: {
    type: String,
    required: function() { 
      return this.type === 'comment'; 
    }
  },
  story: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: function() { 
      return this.type === 'story'; 
    }
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes để optimize query performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ type: 1, post: 1, sender: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
