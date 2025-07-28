const User = require('../models/User');
const { uploadAvatar, deleteFromCloudinary, extractPublicId } = require('../config/cloudinary');
const { createResponse } = require('../utils/response');

// Helper functions for responses
const sendSuccess = (res, message, data = null, statusCode = 200) => {
    return res.status(statusCode).json(createResponse(true, data, message));
};

const sendError = (res, message, statusCode = 500, data = null) => {
    return res.status(statusCode).json(createResponse(false, data, message));
};

// Lấy tất cả users (cho story display)
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({})
            .select('username avatar position address followersCount followingCount postsCount')
            .sort({ createdAt: -1 }) // Sắp xếp theo thời gian tạo (mới nhất trước)
            .limit(50); // Giới hạn 50 users để tránh quá tải
        
        sendSuccess(res, 'All users retrieved successfully', { users });
    } catch (error) {
        console.error('Get all users error:', error);
        sendError(res, 'Server error');
    }
};

// Lấy thông tin profile của user khác theo ID
const getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findById(userId).select('-password');
        
        if (!user) {
            return sendError(res, 'User not found', 404);
        }

        sendSuccess(res, 'User profile retrieved successfully', { user });
    } catch (error) {
        console.error('Get user profile error:', error);
        sendError(res, 'Server error');
    }
};

// Lấy thông tin profile hiện tại
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        
        if (!user) {
            return sendError(res, 'User not found', 404);
        }

        sendSuccess(res, 'Profile retrieved successfully', { user });
    } catch (error) {
        console.error('Get profile error:', error);
        sendError(res, 'Server error');
    }
};

// Cập nhật thông tin profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            username,
            email,
            position,
            address,
            website,
            facebook,
            instagram,
            telegram
        } = req.body;

        console.log('Update profile request body:', req.body);
        console.log('User ID:', userId);

        // Kiểm tra username và email có bị trùng không (ngoại trừ user hiện tại)
        if (username) {
            const existingUser = await User.findOne({ 
                username, 
                _id: { $ne: userId } 
            });
            if (existingUser) {
                return sendError(res, 'Username already exists', 400);
            }
        }

        if (email) {
            const existingUser = await User.findOne({ 
                email, 
                _id: { $ne: userId } 
            });
            if (existingUser) {
                return sendError(res, 'Email already exists', 400);
            }
        }

        // Chuẩn bị data để update
        const updateData = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (position !== undefined) updateData.position = position;
        if (address !== undefined) updateData.address = address;
        if (website !== undefined) updateData.website = website;
        if (facebook !== undefined) updateData.facebook = facebook;
        if (instagram !== undefined) updateData.instagram = instagram;
        if (telegram !== undefined) updateData.telegram = telegram;

        console.log('Update data:', updateData);

        // Cập nhật user
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return sendError(res, 'User not found', 404);
        }

        console.log('Updated user:', updatedUser);
        sendSuccess(res, 'Profile updated successfully', { user: updatedUser });
    } catch (error) {
        console.error('Update profile error:', error);
        
        // Xử lý validation error
        if (error.name === 'ValidationError') {
            const errorMessages = Object.values(error.errors).map(err => err.message);
            return sendError(res, errorMessages.join('. '), 400);
        }

        sendError(res, 'Server error');
    }
};

// Upload avatar
const uploadAvatarHandler = async (req, res) => {
    try {
        const userId = req.user.id;
        
        if (!req.file) {
            return sendError(res, 'No file uploaded', 400);
        }

        // Lấy thông tin user hiện tại
        const currentUser = await User.findById(userId);
        if (!currentUser) {
            return sendError(res, 'User not found', 404);
        }

        // Xóa avatar cũ từ Cloudinary (nếu có)
        if (currentUser.avatar && 
            currentUser.avatar !== 'https://example.com/default-avatar.png') {
            try {
                const publicId = extractPublicId(currentUser.avatar);
                if (publicId) {
                    await deleteFromCloudinary(`hyteam/avatars/${publicId}`);
                }
            } catch (error) {
                console.error('Error deleting old avatar:', error);
                // Không throw error vì việc xóa ảnh cũ thất bại không nên dừng quá trình upload
            }
        }

        // Cập nhật URL avatar mới
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { avatar: req.file.path },
            { new: true }
        ).select('-password');

        sendSuccess(res, 'Avatar uploaded successfully', { 
            user: updatedUser,
            avatar: req.file.path
        });
    } catch (error) {
        console.error('Upload avatar error:', error);
        sendError(res, 'Server error');
    }
};

// Xóa avatar (về default)
const removeAvatar = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const currentUser = await User.findById(userId);
        if (!currentUser) {
            return sendError(res, 'User not found', 404);
        }

        // Xóa avatar từ Cloudinary (nếu có)
        if (currentUser.avatar && 
            currentUser.avatar !== 'https://example.com/default-avatar.png') {
            try {
                const publicId = extractPublicId(currentUser.avatar);
                if (publicId) {
                    await deleteFromCloudinary(`hyteam/avatars/${publicId}`);
                }
            } catch (error) {
                console.error('Error deleting avatar:', error);
            }
        }

        // Set về default avatar
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { avatar: null },
            { new: true }
        ).select('-password');

        sendSuccess(res, 'Avatar removed successfully', { user: updatedUser });
    } catch (error) {
        console.error('Remove avatar error:', error);
        sendError(res, 'Server error');
    }
};

// Helper function to update user stats
const updateUserStats = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) return;

        // Calculate actual counts (this would be implemented when you have actual posts/follow relationships)
        // For now, keep the existing fake counts
        
        // You can add real count calculations here later:
        // const actualPostsCount = await Post.countDocuments({ userId });
        // const actualFollowersCount = user.followers.length;
        // const actualFollowingCount = user.following.length;
        
        // await User.findByIdAndUpdate(userId, {
        //     postsCount: actualPostsCount,
        //     followersCount: actualFollowersCount,
        //     followingCount: actualFollowingCount
        // });
        
    } catch (error) {
        console.error('Error updating user stats:', error);
    }
};

module.exports = {
    getProfile,
    getAllUsers,
    getUserProfile,
    updateProfile,
    uploadAvatarHandler,
    removeAvatar,
    updateUserStats
};
