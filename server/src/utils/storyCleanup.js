const cron = require('node-cron');
const Story = require('../models/Story');
const { cloudinary } = require('../config/cloudinary');

// Cleanup expired stories every hour
const scheduleStoryCleanup = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('🧹 Running story cleanup job...');
      
      // Find expired stories
      const expiredStories = await Story.find({
        expiresAt: { $lte: new Date() }
      });

      console.log(`Found ${expiredStories.length} expired stories to clean up`);

      // Delete from Cloudinary and database
      for (const story of expiredStories) {
        try {
          // Delete from cloudinary if exists
          if (story.mediaMetadata?.publicId) {
            await cloudinary.uploader.destroy(story.mediaMetadata.publicId);
            console.log(`✅ Deleted media from Cloudinary: ${story.mediaMetadata.publicId}`);
          }
          
          // Delete from database
          await Story.findByIdAndDelete(story._id);
          console.log(`✅ Deleted story from database: ${story._id}`);
        } catch (error) {
          console.error(`❌ Error deleting story ${story._id}:`, error);
        }
      }

      console.log('✨ Story cleanup job completed');
    } catch (error) {
      console.error('❌ Story cleanup job failed:', error);
    }
  });

  console.log('📅 Story cleanup scheduler initialized - runs every hour');
};

module.exports = { scheduleStoryCleanup };
