const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true, 
        minlength: 3,
        maxlength: 30
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true, // Fixed: should be lowercase, not Lowercase
        match : [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
        select: false 
    },
    avatar: {
        type: String,
        default: 'https://example.com/default-avatar.png'
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    verified: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    // New fields added
    position: {
        type: String,
        trim: true,
        maxlength: 100
    },
    address: {
        type: String,
        trim: true,
        maxlength: 200
    },
    dateOfBirth: {
        type: Date,
        validate: {
            validator: function(v) {
                if (!v) return true; // Allow empty values
                const today = new Date();
                const birthDate = new Date(v);
                const age = today.getFullYear() - birthDate.getFullYear();
                return age >= 13 && age <= 120; // Reasonable age limits
            },
            message: 'Date of birth must represent an age between 13 and 120 years'
        }
    },
    website: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                if (!v || v === '') return true; // Allow empty values
                return /^https?:\/\/.+/.test(v);
            },
            message: 'Website must be a valid URL starting with http:// or https://'
        }
    },
    facebook: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                if (!v || v === '') return true; // Allow empty values
                return /^https?:\/\/(www\.)?facebook\.com\//.test(v);
            },
            message: 'Facebook must be a valid Facebook URL'
        }
    },
    instagram: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                if (!v || v === '') return true; // Allow empty values
                return /^https?:\/\/(www\.)?instagram\.com\//.test(v);
            },
            message: 'Instagram must be a valid Instagram URL'
        }
    },
    telegram: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                if (!v || v === '') return true; // Allow empty values
                return /^https?:\/\/(t\.me|telegram\.me)\//.test(v) || /^@[a-zA-Z0-9_]+$/.test(v);
            },
            message: 'Telegram must be a valid Telegram URL or username starting with @'
        }
    },
    // Social stats
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    followersCount: {
        type: Number,
        default: 0
    },
    followingCount: {
        type: Number,
        default: 0
    },
    postsCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true});

// Hash password truoc khi luu vao CSDL
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Kiem tra mat khau
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);