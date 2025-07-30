const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'hyteam-posts',
        resource_type: 'auto',
        transformation: [
            { width: 1080, height: 1080, crop: 'limit' },
            { quality: 'auto:good' }
        ],
        format: async (req, file) => {
            if (file.mimetype.startsWith('image/')) {
                return 'webp';
            }
            return 'mp4';
        }
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    console.log('📁 File upload attempt:', file.originalname, file.mimetype);
    
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image and video files are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
        files: 1
    }
});

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
    console.error('❌ Upload error:', error.message);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 50MB.',
                timestamp: new Date().toISOString()
            });
        }
    }
    
    return res.status(400).json({
        success: false,
        message: error.message || 'File upload failed',
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    upload,
    handleUploadError,
    cloudinary
};
