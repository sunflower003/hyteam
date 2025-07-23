const Message = require('../models/Message');
const { createResponse } = require('../utils/response');

// Luu message moi
const saveMessage = async (messageData) => {
    try {
        const message = await Message.create(messageData);
        await message.populate('user', 'username avatar'); // Populate user details
        return message;
    }
    catch (error) {
        console.error('Error saving message:', error);
        return null;
    }
};

// Lay danh sach message theo roomId
const getRoomMessages = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { page=1, limit=50} = req.query;

        const messages = await Message.find({ roomId })
            .populate('user', 'username avatar')
            .populate('replyTo', 'message user')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        // Dao nguoc danh sach de hien thi tu cu den moi
        messages.reverse();

        const totalMessages = await Message.countDocuments({ roomId });

        res.json(
            createResponse(true, {
                messages,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalMessages / limit), // Tong so trang
                    totalMessages // Tong so message
                }
            }, 'Messages retrieved successfully')
        );
    } catch (error) {
        console.error('Get room messages error:', error);
        res.status(500).json(
            createResponse(false, null, 'Failed to retrieve messages')
        );
    }
};

// Xoa message theo ID
const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;

        const message = await Message.findById(messageId);

        if(!message) {
            return res.status(404).json(
                createResponse(false, null, 'Message not found')
            );
        }

        //chi nguoi gui message moi co quyen xoa
        if (message.user.toString() !== userId) {
            return res.status(403).json(
                createResponse(false, null, 'You do not have permission to delete this message')
            );
        }

        await Message.findByIdAndDelete(messageId);
        res.json(
            createResponse(true, { messageId }, 'Message deleted successfully')
        );
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json(
            createResponse(false, null, 'Failed to delete message')
        );
    }

};

module.exports = {
    saveMessage,
    getRoomMessages,
    deleteMessage
};
