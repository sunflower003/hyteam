const express = require('express');
const { upload } = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const {
  createStory,
  getAllStories,
  getUserStories,
  viewStory,
  deleteStory,
  getStoryViewers
} = require('../controllers/storyController');

const router = express.Router();

// Protect all routes
router.use(protect);

// @route   GET /api/stories
// @desc    Get all active stories
// @access  Private
router.get('/', getAllStories);

// @route   POST /api/stories
// @desc    Create new story
// @access  Private
router.post('/', upload.single('media'), createStory);

// @route   GET /api/stories/user/:userId
// @desc    Get user stories
// @access  Private
router.get('/user/:userId', getUserStories);

// @route   POST /api/stories/:storyId/view
// @desc    Mark story as viewed
// @access  Private
router.post('/:storyId/view', viewStory);

// @route   DELETE /api/stories/:storyId
// @desc    Delete story
// @access  Private
router.delete('/:storyId', deleteStory);

// @route   GET /api/stories/:storyId/viewers
// @desc    Get story viewers
// @access  Private
router.get('/:storyId/viewers', getStoryViewers);

module.exports = router;
