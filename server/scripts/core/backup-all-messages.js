const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Message = require('../../src/models/Message');
const ChatMessage = require('../../src/models/ChatMessage');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function backupAllMessages() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Tạo thư mục backup nếu chưa có
        const backupDir = path.join(__dirname, '../../backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `messages-backup-${timestamp}.json`;
        const backupPath = path.join(backupDir, backupFileName);

        console.log('📊 Fetching all messages...');

        // Lấy tất cả Room Messages
        const roomMessages = await Message.find()
            .populate('user', 'username email')
            .populate('replyTo')
            .sort({ createdAt: 1 });

        // Lấy tất cả Chat Messages
        const chatMessages = await ChatMessage.find()
            .populate('sender', 'username email')
            .populate('conversationId')
            .populate('replyTo')
            .sort({ createdAt: 1 });

        const backupData = {
            backupInfo: {
                createdAt: new Date(),
                totalRoomMessages: roomMessages.length,
                totalChatMessages: chatMessages.length,
                totalMessages: roomMessages.length + chatMessages.length,
                backupVersion: '1.0'
            },
            roomMessages: roomMessages,
            chatMessages: chatMessages
        };

        console.log(`📊 Backup summary:`);
        console.log(`- Room messages: ${roomMessages.length}`);
        console.log(`- Chat messages: ${chatMessages.length}`);
        console.log(`- Total messages: ${roomMessages.length + chatMessages.length}`);

        // Ghi file backup
        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

        console.log(`✅ Backup completed successfully!`);
        console.log(`📁 Backup file: ${backupPath}`);
        
        // Hiển thị kích thước file
        const stats = fs.statSync(backupPath);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`📏 File size: ${fileSizeInMB} MB`);

        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');

        return backupPath;

    } catch (error) {
        console.error('❌ Backup failed:', error);
        await mongoose.disconnect();
        throw error;
    }
}

// Nếu script được chạy trực tiếp
if (require.main === module) {
    console.log('💾 Starting message backup process...');
    backupAllMessages()
        .then((backupPath) => {
            console.log('\n🎉 Backup process completed successfully!');
            console.log(`📁 Your messages are safely backed up to: ${backupPath}`);
        })
        .catch((error) => {
            console.error('❌ Backup process failed:', error);
            process.exit(1);
        });
}

module.exports = backupAllMessages;
