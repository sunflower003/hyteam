const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        ref: 'Room', 
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    message: {
        type: String,
        required: true,
        trim: true,
    },
    messageType: {
        type: String,
        enum: ['text', 'system', 'notification'],
        default: 'text'
    },
    edited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date
    },
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    }
}, {
    timestamps: true  // tu dong tao truong createdAt va updatedAt
});

// Index cho performance optimization
messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ user: 1 });

module.exports = mongoose.model('Message', messageSchema);