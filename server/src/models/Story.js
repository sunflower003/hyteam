const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  // User tạo story
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Index riêng cho performance
  },
  
  // Nội dung text (caption) - optional
  content: {
    type: String,
    maxLength: 500,
    default: '',
    trim: true // Tự động trim whitespace
  },
  
  // URL file media (ảnh/video)
  mediaUrl: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Media URL is required'
    }
  },
  
  // Loại media
  mediaType: {
    type: String,
    enum: {
      values: ['image', 'video'],
      message: 'Media type must be either image or video'
    },
    required: true
  },
  
  // Metadata cho media (optional)
  mediaMetadata: {
    originalName: String,
    fileSize: Number,
    dimensions: {
      width: Number,
      height: Number
    },
    duration: Number // Cho video
  },
  
  // Danh sách người đã xem story
  viewers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    viewedAt: {
      type: Date,
      default: Date.now
    },
    // IP address for analytics (optional)
    ipAddress: String
  }],
  
  // Thời gian tạo
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Thời gian hết hạn (24h sau khi tạo)
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 giờ
    },
    required: true,
    index: true // Index cho TTL và queries
  },
  
  // Trạng thái story
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Thống kê
  stats: {
    totalViews: {
      type: Number,
      default: 0
    },
    uniqueViews: {
      type: Number,
      default: 0
    },
    lastViewedAt: Date
  },
  
  // Tags hoặc mentions (optional)
  tags: [String],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Flags cho moderation
  flags: {
    isReported: {
      type: Boolean,
      default: false
    },
    reportCount: {
      type: Number,
      default: 0
    },
    isHidden: {
      type: Boolean,
      default: false
    }
  }
}, { 
  timestamps: true, // Tự động tạo createdAt và updatedAt
  toJSON: { virtuals: true }, // Include virtuals in JSON
  toObject: { virtuals: true }
});

// ===================== INDEXES =====================

// Compound index cho performance queries
storySchema.index({ userId: 1, createdAt: -1 });
storySchema.index({ isActive: 1, expiresAt: 1 });
storySchema.index({ expiresAt: 1, isActive: 1 });

// TTL Index để tự động xóa story sau 24 giờ
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Text index cho search (nếu cần)
storySchema.index({ content: 'text' });

// ===================== VIRTUALS =====================

// Virtual để check story còn hạn không
storySchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Virtual để lấy thời gian còn lại
storySchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const remaining = this.expiresAt - now;
  return Math.max(0, remaining);
});

// Virtual để lấy URL đầy đủ của media
storySchema.virtual('fullMediaUrl').get(function() {
  if (this.mediaUrl.startsWith('http')) {
    return this.mediaUrl;
  }
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  return `${baseUrl}${this.mediaUrl}`;
});

// ===================== INSTANCE METHODS =====================

// Method để thêm viewer với duplicate check
storySchema.methods.addViewer = function(userId, ipAddress = null) {
  // Kiểm tra user đã xem chưa
  const hasViewed = this.viewers.some(viewer => 
    viewer.userId.toString() === userId.toString()
  );
  
  if (!hasViewed) {
    this.viewers.push({ 
      userId, 
      viewedAt: new Date(),
      ipAddress 
    });
    
    // Update stats
    this.stats.totalViews = (this.stats.totalViews || 0) + 1;
    this.stats.uniqueViews = this.viewers.length;
    this.stats.lastViewedAt = new Date();
    
    console.log(`👁️ New viewer added to story ${this._id}: ${userId}`);
    return this.save();
  }
  
  console.log(`ℹ️ User ${userId} already viewed story ${this._id}`);
  return Promise.resolve(this);
};

// Method để đếm số lượt xem
storySchema.methods.getViewCount = function() {
  return this.viewers.length;
};

// Method để lấy danh sách viewers
storySchema.methods.getViewers = function() {
  return this.populate('viewers.userId', 'username avatar');
};

// Method để check xem user đã xem chưa
storySchema.methods.hasUserViewed = function(userId) {
  return this.viewers.some(viewer => 
    viewer.userId.toString() === userId.toString()
  );
};

// Method để soft delete
storySchema.methods.softDelete = function() {
  this.isActive = false;
  return this.save();
};

// Method để report story
storySchema.methods.reportStory = function(reporterId, reason) {
  this.flags.reportCount = (this.flags.reportCount || 0) + 1;
  this.flags.isReported = true;
  
  console.log(`🚨 Story ${this._id} reported by ${reporterId}: ${reason}`);
  return this.save();
};

// ===================== STATIC METHODS =====================

// Static method để lấy story active
storySchema.statics.getActiveStories = function(limit = 50) {
  return this.find({
    isActive: true,
    expiresAt: { $gt: new Date() },
    'flags.isHidden': { $ne: true }
  })
  .populate('userId', 'username avatar')
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Static method để lấy story của user cụ thể
storySchema.statics.getUserStories = function(userId, includeExpired = false) {
  const query = {
    userId,
    isActive: true
  };
  
  if (!includeExpired) {
    query.expiresAt = { $gt: new Date() };
  }
  
  return this.find(query)
    .populate('userId', 'username avatar')
    .sort({ createdAt: -1 });
};

// Static method để lấy story trending (nhiều view)
storySchema.statics.getTrendingStories = function(limit = 20) {
  return this.find({
    isActive: true,
    expiresAt: { $gt: new Date() },
    'flags.isHidden': { $ne: true }
  })
  .sort({ 'stats.uniqueViews': -1, createdAt: -1 })
  .limit(limit)
  .populate('userId', 'username avatar');
};

// Static method để cleanup expired stories
storySchema.statics.cleanupExpiredStories = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// ===================== MIDDLEWARE =====================

// Pre-save middleware để validate và setup
storySchema.pre('save', function(next) {
  // Đảm bảo expiresAt không quá 24h từ createdAt
  const maxExpireTime = new Date(this.createdAt.getTime() + 24 * 60 * 60 * 1000);
  if (this.expiresAt > maxExpireTime) {
    this.expiresAt = maxExpireTime;
  }
  
  // Update unique views count nếu có viewers mới
  if (this.isModified('viewers')) {
    this.stats.uniqueViews = this.viewers.length;
  }
  
  next();
});

// Pre-remove middleware để log deletion
storySchema.pre('remove', function(next) {
  console.log(`🗑️ Story ${this._id} from user ${this.userId} is being deleted`);
  next();
});

// Pre-deleteOne middleware
storySchema.pre('deleteOne', { document: true }, function(next) {
  console.log(`🗑️ Story ${this._id} is being deleted via deleteOne`);
  next();
});

// Post-save middleware để log creation
storySchema.post('save', function(doc, next) {
  if (this.isNew) {
    console.log(`✨ New story created: ${doc._id} by user ${doc.userId}`);
  }
  next();
});

// ===================== ERROR HANDLING =====================

// Handle validation errors
storySchema.post('save', function(error, doc, next) {
  if (error.name === 'ValidationError') {
    console.error('❌ Story validation error:', error.message);
  }
  next(error);
});

// ===================== EXPORT =====================

const Story = mongoose.model('Story', storySchema);

// Create indexes if not exists (for development)
if (process.env.NODE_ENV === 'development') {
  Story.createIndexes().then(() => {
    console.log('📊 Story indexes created successfully');
  }).catch(err => {
    console.error('❌ Error creating Story indexes:', err);
  });
}

module.exports = Story;
