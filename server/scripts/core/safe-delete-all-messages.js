const mongoose = require('mongoose');
const readline = require('readline');
const backupAllMessages = require('./backup-all-messages');
const Message = require('../../src/models/Message');
const ChatMessage = require('../../src/models/ChatMessage');
const Conversation = require('../../src/models/Conversation');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

// Tạo interface để nhận input từ user
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function safeDeleteAllMessages() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Đếm số lượng tin nhắn hiện tại
        const messageCount = await Message.countDocuments();
        const chatMessageCount = await ChatMessage.countDocuments();
        const totalMessages = messageCount + chatMessageCount;
        
        console.log('\n📊 Current database status:');
        console.log(`- Room messages: ${messageCount}`);
        console.log(`- Chat messages: ${chatMessageCount}`);
        console.log(`- Total messages: ${totalMessages}`);

        if (totalMessages === 0) {
            console.log('🎉 No messages found in database!');
            await mongoose.disconnect();
            rl.close();
            return;
        }

        console.log('\n⚠️  WARNING: You are about to DELETE ALL MESSAGES!');
        console.log('📱 This includes:');
        console.log('   - All room/movie chat messages');
        console.log('   - All private chat messages');
        console.log('   - All message references in conversations');
        console.log('\n❗ This action CANNOT be undone!');

        // Hỏi user có muốn backup không
        const shouldBackup = await askQuestion('\n💾 Do you want to create a backup first? (y/N): ');
        
        let backupPath = null;
        if (shouldBackup.toLowerCase() === 'y' || shouldBackup.toLowerCase() === 'yes') {
            console.log('\n📦 Creating backup...');
            try {
                backupPath = await backupAllMessages();
                console.log(`✅ Backup created successfully: ${backupPath}`);
            } catch (error) {
                console.error('❌ Backup failed:', error);
                const continueAnyway = await askQuestion('\n⚠️  Backup failed. Continue with deletion anyway? (y/N): ');
                if (continueAnyway.toLowerCase() !== 'y' && continueAnyway.toLowerCase() !== 'yes') {
                    console.log('❌ Operation cancelled');
                    await mongoose.disconnect();
                    rl.close();
                    return;
                }
            }
        }

        // Xác nhận cuối cùng
        const confirmDelete = await askQuestion('\n🔥 Are you ABSOLUTELY SURE you want to delete all messages? Type "DELETE ALL" to confirm: ');
        
        if (confirmDelete !== 'DELETE ALL') {
            console.log('❌ Operation cancelled - confirmation text does not match');
            await mongoose.disconnect();
            rl.close();
            return;
        }

        console.log('\n🗑️  Starting deletion process...');

        let totalDeletedMessages = 0;
        let totalDeletedChatMessages = 0;

        // Xóa tất cả Room Messages
        if (messageCount > 0) {
            console.log(`\n📌 Deleting ${messageCount} room messages...`);
            const deleteResult1 = await Message.deleteMany({});
            totalDeletedMessages = deleteResult1.deletedCount;
            console.log(`✅ Deleted ${totalDeletedMessages} room messages`);
        }

        // Xóa tất cả Chat Messages
        if (chatMessageCount > 0) {
            console.log(`\n📌 Deleting ${chatMessageCount} chat messages...`);
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

        console.log(`\n🎉 DELETION COMPLETED SUCCESSFULLY!`);
        console.log(`📊 Summary:`);
        console.log(`- Room messages deleted: ${totalDeletedMessages}`);
        console.log(`- Chat messages deleted: ${totalDeletedChatMessages}`);
        console.log(`- Total messages deleted: ${totalDeletedMessages + totalDeletedChatMessages}`);
        console.log(`- Conversations updated: ${updateResult.modifiedCount}`);
        
        if (backupPath) {
            console.log(`- Backup saved to: ${backupPath}`);
        }

        // Xác minh việc xóa
        console.log('\n🔍 Verifying deletion...');
        const remainingMessages = await Message.countDocuments();
        const remainingChatMessages = await ChatMessage.countDocuments();
        
        if (remainingMessages === 0 && remainingChatMessages === 0) {
            console.log('✅ All messages successfully deleted!');
        } else {
            console.log(`⚠️  Warning: ${remainingMessages + remainingChatMessages} messages still remain`);
        }

        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        rl.close();

    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
        rl.close();
        process.exit(1);
    }
}

console.log('🚀 Safe Message Deletion Tool');
console.log('===============================');
safeDeleteAllMessages();
