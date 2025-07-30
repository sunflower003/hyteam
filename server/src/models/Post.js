const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  content: {
    type: String,
    maxLength: 2200,
    default: '',
    trim: true
  },
  
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
  
  mediaType: {
    type: String,
    enum: {
      values: ['image', 'video'],
      message: 'Media type must be either image or video'
    },
    default: 'image'
  },
  
  mediaMetadata: {
    originalName: String,
    fileSize: Number,
    dimensions: {
      width: Number,
      height: Number
    },
    publicId: String
  },
  
  likes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  comments: [{
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId()
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxLength: 500
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  stats: {
    likesCount: {
      type: Number,
      default: 0
    },
    commentsCount: {
      type: Number,
      default: 0
    },
    viewsCount: {
      type: Number,
      default: 0
    }
  },
  
  tags: [String],
  location: {
    type: String,
    trim: true,
    maxLength: 100
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes cho performance
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ isActive: 1, createdAt: -1 });
postSchema.index({ 'stats.likesCount': -1, createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ content: 'text' });

// Virtual cho media URL đầy đủ
postSchema.virtual('fullMediaUrl').get(function() {
  if (this.mediaUrl.startsWith('http')) {
    return this.mediaUrl;
  }
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  return `${baseUrl}${this.mediaUrl}`;
});

// Instance Methods
postSchema.methods.addLike = function(userId) {
  const hasLiked = this.likes.some(like => 
    like.userId.toString() === userId.toString()
  );
  
  if (!hasLiked) {
    this.likes.push({ userId, likedAt: new Date() });
    this.stats.likesCount = this.likes.length;
    return this.save();
  }
  return Promise.resolve(this);
};

postSchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(like => 
    like.userId.toString() !== userId.toString()
  );
  this.stats.likesCount = this.likes.length;
  return this.save();
};

postSchema.methods.addComment = function(authorId, content) {
  const newComment = {
    author: authorId,
    content,
    createdAt: new Date()
  };
  this.comments.push(newComment);
  this.stats.commentsCount = this.comments.length;
  return this.save();
};

// Static Methods
postSchema.statics.getFeedPosts = function(limit = 20) {
  return this.find({
    isActive: true,
    'flags.isHidden': { $ne: true }
  })
  .populate('author', 'username avatar')
  .populate('comments.author', 'username avatar')
  .sort({ createdAt: -1 })
  .limit(limit);
};

postSchema.statics.searchPosts = function(query, limit = 20) {
  return this.find({
    $and: [
      { isActive: true },
      { 'flags.isHidden': { $ne: true } },
      {
        $or: [
          { content: { $regex: query, $options: 'i' } },
          { tags: { $regex: query, $options: 'i' } }
        ]
      }
    ]
  })
  .populate('author', 'username avatar')
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Middleware
postSchema.post('save', async function(doc, next) {
  if (this.isNew) {
    await mongoose.model('User').findByIdAndUpdate(
      this.author,
      { $inc: { postsCount: 1 } }
    );
    console.log(`✨ New post created: ${doc._id} by user ${doc.author}`);
  }
  next();
});

postSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    await mongoose.model('User').findByIdAndUpdate(
      doc.author,
      { $inc: { postsCount: -1 } }
    );
    console.log(`🗑️ Post ${doc._id} deleted`);
  }
});

module.exports = mongoose.model('Post', postSchema);
