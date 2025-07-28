const express = require('express');
const router = express.Router();
const cloudinaryConfig = require('../config/cloudinary');
const { protect } = require('../middleware/auth');
const profileController = require('../controllers/profileController');

const { uploadAvatar } = cloudinaryConfig;
const { getProfile, getUserProfile, getAllUsers, updateProfile, uploadAvatarHandler, removeAvatar } = profileController;

// @route   GET /api/profile
// @desc    Get current user profile
// @access  Private
router.get('/', protect, getProfile);

// @route   GET /api/profile/users
// @desc    Get all users (for story display)
// @access  Private
router.get('/users', protect, getAllUsers);

// @route   GET /api/profile/user/:userId
// @desc    Get user profile by ID
// @access  Private
router.get('/user/:userId', protect, getUserProfile);

// @route   PUT /api/profile
// @desc    Update user profile
// @access  Private
router.put('/', protect, updateProfile);

// @route   POST /api/profile/avatar
// @desc    Upload user avatar
// @access  Private
router.post('/avatar', protect, uploadAvatar.single('avatar'), uploadAvatarHandler);

// @route   DELETE /api/profile/avatar
// @desc    Remove user avatar
// @access  Private
router.delete('/avatar', protect, removeAvatar);

module.exports = router;
