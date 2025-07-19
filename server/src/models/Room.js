const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },  
    description: {
        type: String,
        default: '',
    },
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        role: {
            type: String,
            enum: ['host', 'moderator', 'member'],
            default: 'member'
        }
    }],
    currentMovie: {
        tmdbId: String,
        title: String,
        poster: String,
        streamUrl: String,
        startedAt: Date,
    }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);