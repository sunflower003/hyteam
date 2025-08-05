const mongoose = require('mongoose');
const Post = require('../../src/models/Post');
const User = require('../../src/models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function deleteAllCommentsFromAllPosts() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all posts that have comments
        const postsWithComments = await Post.find({
            'comments.0': { $exists: true } // Posts that have at least 1 comment
        }).populate('comments.user', 'username');

        console.log(`📊 Found ${postsWithComments.length} posts with comments`);

        if (postsWithComments.length === 0) {
            console.log('🎉 No comments found in any posts!');
            await mongoose.disconnect();
            return;
        }

        let totalDeletedComments = 0;
        let totalProcessedPosts = 0;

        // Process each post
        for (const post of postsWithComments) {
            const commentsCount = post.comments.length;
            
            console.log(`\n📌 Post ${post._id}: Found ${commentsCount} comments`);
            
            // Show some of the comments that will be deleted
            post.comments.slice(0, 3).forEach((comment, index) => {
                const truncatedText = comment.text.length > 50 ? 
                    comment.text.substring(0, 50) + '...' : comment.text;
                console.log(`   ${index + 1}. "${truncatedText}" by ${comment.user?.username || 'Unknown'}`);
            });
            
            if (post.comments.length > 3) {
                console.log(`   ... and ${post.comments.length - 3} more comments`);
            }

            // Remove ALL comments from this post
            post.comments = [];
            await post.save();
            
            totalDeletedComments += commentsCount;
            totalProcessedPosts++;
            console.log(`   ✅ Deleted ${commentsCount} comments`);
        }

        console.log(`\n🎉 COMPLETED!`);
        console.log(`Total deleted: ${totalDeletedComments} comments from ${totalProcessedPosts} posts`);

        // Verify deletion
        const remainingComments = await Post.find({
            'comments.0': { $exists: true }
        });

        console.log(`📊 Verification: ${remainingComments.length} posts still have comments (should be 0)`);

        // Show summary statistics
        const allPosts = await Post.find({});
        const totalPosts = allPosts.length;
        const postsWithoutComments = allPosts.filter(post => post.comments.length === 0).length;

        console.log(`\n📈 Final Summary:`);
        console.log(`- Total posts in database: ${totalPosts}`);
        console.log(`- Posts without comments: ${postsWithoutComments}`);
        console.log(`- Posts with comments: ${totalPosts - postsWithoutComments}`);

        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

console.log('⚠️  WARNING: This will delete ALL comments from ALL posts!');
console.log('🚀 Starting in 3 seconds...');

setTimeout(() => {
    deleteAllCommentsFromAllPosts();
}, 3000);
