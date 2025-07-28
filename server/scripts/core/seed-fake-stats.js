const mongoose = require('mongoose');
const path = require('path');
const User = require('../../src/models/User');

// Load environment variables from the correct path
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const seedFakeStats = async () => {
    try {
        console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Found' : 'Not found');
        
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI not found in environment variables');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Lấy tất cả users
        const users = await User.find({});
        console.log(`Found ${users.length} users`);

        if (users.length === 0) {
            console.log('No users found to update stats');
            process.exit(0);
        }

        // Cập nhật fake stats cho từng user
        for (let user of users) {
            const fakeFollowersCount = Math.floor(Math.random() * 1000) + 50; // 50-1050
            const fakeFollowingCount = Math.floor(Math.random() * 500) + 20;  // 20-520
            const fakePostsCount = Math.floor(Math.random() * 200) + 5;       // 5-205

            await User.findByIdAndUpdate(user._id, {
                followersCount: fakeFollowersCount,
                followingCount: fakeFollowingCount,
                postsCount: fakePostsCount
            });

            console.log(`Updated stats for ${user.username}:`);
            console.log(`  - Followers: ${fakeFollowersCount}`);
            console.log(`  - Following: ${fakeFollowingCount}`);
            console.log(`  - Posts: ${fakePostsCount}`);
        }

        console.log('✅ Fake stats seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding fake stats:', error);
        process.exit(1);
    }
};

seedFakeStats();
