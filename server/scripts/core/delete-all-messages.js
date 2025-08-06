const mongoose = require('mongoose');
const Message = require('../../src/models/Message');
const ChatMessage = require('../../src/models/ChatMessage');
const Conversation = require('../../src/models/Conversation');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function deleteAllMessages() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        let totalDeletedMessages = 0;
        let totalDeletedChatMessages = 0;

        // Đếm số lượng tin nhắn hiện tại
        const messageCount = await Message.countDocuments();
        const chatMessageCount = await ChatMessage.countDocuments();
        
        console.log(`📊 Current database status:`);
        console.log(`- Room messages (Message model): ${messageCount}`);
        console.log(`- Chat messages (ChatMessage model): ${chatMessageCount}`);
        console.log(`- Total messages: ${messageCount + chatMessageCount}`);

        if (messageCount === 0 && chatMessageCount === 0) {
            console.log('🎉 No messages found in database!');
            await mongoose.disconnect();
            return;
        }

        console.log('\n🗑️  Starting deletion process...');

        // Xóa tất cả Room Messages
        if (messageCount > 0) {
            console.log(`\n📌 Deleting ${messageCount} room messages...`);
            
            // Lấy một vài tin nhắn mẫu để hiển thị
            const sampleMessages = await Message.find()
                .populate('user', 'username')
                .limit(3)
                .sort({ createdAt: -1 });

            console.log('📝 Sample messages to be deleted:');
            sampleMessages.forEach((msg, index) => {
                const truncatedMessage = msg.message.length > 60 ? 
                    msg.message.substring(0, 60) + '...' : msg.message;
                console.log(`   ${index + 1}. "${truncatedMessage}" by ${msg.user?.username || 'Unknown'} in room ${msg.roomId}`);
            });

            if (messageCount > 3) {
                console.log(`   ... and ${messageCount - 3} more messages`);
            }

            const deleteResult1 = await Message.deleteMany({});
            totalDeletedMessages = deleteResult1.deletedCount;
            console.log(`✅ Deleted ${totalDeletedMessages} room messages`);
        }

        // Xóa tất cả Chat Messages
        if (chatMessageCount > 0) {
            console.log(`\n📌 Deleting ${chatMessageCount} chat messages...`);
            
            // Lấy một vài tin nhắn mẫu để hiển thị
            const sampleChatMessages = await ChatMessage.find()
                .populate('sender', 'username')
                .populate('conversationId')
                .limit(3)
                .sort({ createdAt: -1 });

            console.log('📝 Sample chat messages to be deleted:');
            sampleChatMessages.forEach((msg, index) => {
                const truncatedContent = msg.content.length > 60 ? 
                    msg.content.substring(0, 60) + '...' : msg.content;
                console.log(`   ${index + 1}. "${truncatedContent}" by ${msg.sender?.username || 'Unknown'}`);
            });

            if (chatMessageCount > 3) {
                console.log(`   ... and ${chatMessageCount - 3} more messages`);
            }

            const deleteResult2 = await ChatMessage.deleteMany({});
            totalDeletedChatMessages = deleteResult2.deletedCount;
            console.log(`✅ Deleted ${totalDeletedChatMessages} chat messages`);
        }

        // Cập nhật các conversation để xóa reference đến lastMessage
        console.log('\n🔄 Updating conversations to remove message references...');
        const updateResult = await Conversation.updateMany(
            {},
            {
                $unset: { lastMessage: 1 },
                $set: { updatedAt: new Date() }
            }
        );
        console.log(`✅ Updated ${updateResult.modifiedCount} conversations`);

        console.log(`\n🎉 DELETION COMPLETED!`);
        console.log(`📊 Summary:`);
        console.log(`- Room messages deleted: ${totalDeletedMessages}`);
        console.log(`- Chat messages deleted: ${totalDeletedChatMessages}`);
        console.log(`- Total messages deleted: ${totalDeletedMessages + totalDeletedChatMessages}`);
        console.log(`- Conversations updated: ${updateResult.modifiedCount}`);

        // Xác minh việc xóa
        console.log('\n🔍 Verifying deletion...');
        const remainingMessages = await Message.countDocuments();
        const remainingChatMessages = await ChatMessage.countDocuments();
        
        console.log(`📊 Verification results:`);
        console.log(`- Remaining room messages: ${remainingMessages} (should be 0)`);
        console.log(`- Remaining chat messages: ${remainingChatMessages} (should be 0)`);
        
        if (remainingMessages === 0 && remainingChatMessages === 0) {
            console.log('✅ All messages successfully deleted!');
        } else {
            console.log('⚠️  Some messages might still remain in database');
        }

        // Hiển thị thống kê cuối cùng
        const conversationCount = await Conversation.countDocuments();
        console.log(`\n📈 Final database status:`);
        console.log(`- Total conversations: ${conversationCount}`);
        console.log(`- Total messages: 0`);

        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Hiển thị cảnh báo và đếm ngược
console.log('⚠️  WARNING: This script will DELETE ALL MESSAGES from the database!');
console.log('📱 This includes:');
console.log('   - All room/movie chat messages');
console.log('   - All private chat messages');
console.log('   - All message references in conversations');
console.log('');
console.log('❗ This action CANNOT be undone!');
console.log('🚀 Starting deletion in 5 seconds...');

// Đếm ngược 5 giây để cho người dùng cơ hội hủy
let countdown = 5;
const countdownInterval = setInterval(() => {
    countdown--;
    if (countdown > 0) {
        console.log(`⏰ ${countdown}...`);
    } else {
        clearInterval(countdownInterval);
        console.log('🔥 Starting deletion process...\n');
        deleteAllMessages();
    }
}, 1000);

// Cho phép người dùng hủy bằng Ctrl+C
process.on('SIGINT', () => {
    console.log('\n❌ Deletion cancelled by user');
    clearInterval(countdownInterval);
    process.exit(0);
});
