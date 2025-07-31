const mongoose = require('mongoose');
const Post = require('../../src/models/Post');
require('dotenv').config();

// Use environment variable for MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

async function deleteOldPosts() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all posts sorted by creation date (newest first)
        const allPosts = await Post.find().sort({ createdAt: -1 });
        console.log(`📊 Found ${allPosts.length} total posts`);

        if (allPosts.length <= 1) {
            console.log('📝 Only 1 or no posts found. Nothing to delete.');
            await mongoose.disconnect();
            return;
        }

        // Keep the newest post (first in sorted array)
        const newestPost = allPosts[0];
        const postsToDelete = allPosts.slice(1); // All posts except the first (newest)

        console.log(`🔝 Keeping newest post: ${newestPost._id} (${newestPost.caption || 'No caption'})`);
        console.log(`🗑️ Will delete ${postsToDelete.length} older posts`);

        // Show posts that will be deleted
        console.log('\nPosts to be deleted:');
        postsToDelete.forEach((post, index) => {
            console.log(`${index + 1}. ${post._id} - ${post.caption || 'No caption'} (${post.createdAt})`);
        });

        // Ask for confirmation (in production, you might want to add readline for interactive confirmation)
        console.log('\n⚠️  WARNING: This will permanently delete these posts!');
        
        // Delete all posts except the newest one
        const postIdsToDelete = postsToDelete.map(post => post._id);
        const deleteResult = await Post.deleteMany({ _id: { $in: postIdsToDelete } });

        console.log(`✅ Successfully deleted ${deleteResult.deletedCount} posts`);
        console.log(`📝 Kept 1 newest post: ${newestPost._id}`);

        // Verify remaining posts
        const remainingPosts = await Post.find();
        console.log(`📊 Remaining posts in database: ${remainingPosts.length}`);

        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Run the script
deleteOldPosts();
