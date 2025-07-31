const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  // User tạo story
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Nội dung text (caption) - optional
  content: {
    type: String,
    maxLength: 500,
    default: ''
  },
  
  // URL file media (ảnh/video)
  mediaUrl: {
    type: String,
    required: true
  },
  
  // Loại media
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },

  // Metadata cho file
  mediaMetadata: {
    originalName: String,
    fileSize: Number,
    dimensions: {
      width: Number,
      height: Number
    },
    publicId: String // For Cloudinary
  },

  // Thời gian hiển thị (10s, 15s, 30s)
  duration: {
    type: Number,
    enum: [10, 15, 30],
    default: 15,
    required: true
  },

  // Filters và effects
  filters: {
    brightness: { type: Number, default: 0, min: -100, max: 100 },
    contrast: { type: Number, default: 0, min: -100, max: 100 },
    saturation: { type: Number, default: 0, min: -100, max: 100 },
    blur: { type: Number, default: 0, min: 0, max: 10 },
    vintage: { type: Boolean, default: false },
    blackAndWhite: { type: Boolean, default: false }
  },

  // Text overlays
  textOverlays: [{
    text: { type: String, maxLength: 100 },
    x: { type: Number, default: 0 }, // position
    y: { type: Number, default: 0 },
    fontSize: { type: Number, default: 24, min: 12, max: 48 },
    color: { type: String, default: '#FFFFFF' },
    fontFamily: { type: String, default: 'Arial' }
  }],
  
  // Danh sách người đã xem story
  viewers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Thời gian tạo
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // Thời gian hết hạn (24h sau khi tạo)
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 giờ
    },
    required: true
  },
  
  // Trạng thái story
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true // Tự động tạo createdAt và updatedAt
});

// Index để tự động xóa story sau 24 giờ
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index để query nhanh theo user
storySchema.index({ userId: 1, createdAt: -1 });

// Index để query story active
storySchema.index({ isActive: 1, expiresAt: 1 });

// Virtual để check story còn hạn không
storySchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Method để thêm viewer
storySchema.methods.addViewer = function(userId) {
  // Kiểm tra user đã xem chưa
  const hasViewed = this.viewers.some(viewer => 
    viewer.userId.toString() === userId.toString()
  );
  
  if (!hasViewed) {
    this.viewers.push({ userId, viewedAt: new Date() });
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method để đếm số lượt xem
storySchema.methods.getViewCount = function() {
  return this.viewers.length;
};

// Static method để lấy story active
storySchema.statics.getActiveStories = function() {
  return this.find({
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).populate('userId', 'username avatar').sort({ createdAt: -1 });
};

// Static method để lấy story của user cụ thể
storySchema.statics.getUserStories = function(userId) {
  return this.find({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).populate('userId', 'username avatar').sort({ createdAt: -1 });
};

// Middleware pre-save để validate
storySchema.pre('save', function(next) {
  // Đảm bảo expiresAt không quá 24h
  const maxExpireTime = new Date(this.createdAt.getTime() + 24 * 60 * 60 * 1000);
  if (this.expiresAt > maxExpireTime) {
    this.expiresAt = maxExpireTime;
  }
  next();
});

// Middleware để log khi story bị xóa (optional)
storySchema.pre('remove', function(next) {
  console.log(`Story ${this._id} from user ${this.userId} is being deleted`);
  next();
});

module.exports = mongoose.model('Story', storySchema);
