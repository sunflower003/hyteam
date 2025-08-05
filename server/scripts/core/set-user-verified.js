const mongoose = require('mongoose');
const User = require('../../src/models/User');
require('dotenv').config();

const setUserVerified = async () => {
    try {
        // Kết nối MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Đã kết nối MongoDB');

        // Set user "lehyyy" thành verified
        const result = await User.updateOne(
            { username: 'lehyyy' },
            { $set: { verified: true } }
        );

        if (result.matchedCount > 0) {
            console.log('✅ Đã set user "lehyyy" thành verified');
        } else {
            console.log('❌ Không tìm thấy user "lehyyy"');
        }

        // Kiểm tra kết quả
        const user = await User.findOne({ username: 'lehyyy' });
        if (user) {
            console.log(`📋 User ${user.username} - verified: ${user.verified}`);
        }

    } catch (error) {
        console.error('❌ Lỗi:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Đã ngắt kết nối MongoDB');
    }
};

setUserVerified();
