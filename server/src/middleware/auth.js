const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createResponse } = require('../utils/response');

// Main authentication middleware (alias for protect)
const auth = async (req, res, next) => {
  try {
    console.log('🔐 Auth middleware - checking token...');
    
    let token;

    // Extract token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('📋 Token extracted from Bearer header');
    }
    // Alternative: Check for token in cookies (if using cookie auth)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('📋 Token extracted from cookies');
    }
    // Alternative: Check for token in query params (for WebSocket connections)
    else if (req.query && req.query.token) {
      token = req.query.token;
      console.log('📋 Token extracted from query params');
    }

    // No token found
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json(
        createResponse(false, null, 'Access denied. No token provided.')
      );
    }

    console.log('🔍 Verifying token...');

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token verified successfully, user ID:', decoded.id || decoded.userId);
    } catch (jwtError) {
      console.log('❌ Token verification failed:', jwtError.message);
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json(
          createResponse(false, null, 'Token expired. Please log in again.')
        );
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json(
          createResponse(false, null, 'Invalid token. Please log in again.')
        );
      } else {
        return res.status(401).json(
          createResponse(false, null, 'Token verification failed.')
        );
      }
    }

    // Handle both possible JWT payload structures
    const userId = decoded.id || decoded.userId;
    if (!userId) {
      console.log('❌ No user ID in token payload');
      return res.status(401).json(
        createResponse(false, null, 'Invalid token payload.')
      );
    }

    console.log('👤 Looking up user:', userId);

    // Get user from database
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      console.log('❌ User not found in database:', userId);
      return res.status(401).json(
        createResponse(false, null, 'Token is valid but user no longer exists.')
      );
    }

    // Check if user account is active
    if (user.isActive === false) {
      console.log('❌ User account is deactivated:', userId);
      return res.status(401).json(
        createResponse(false, null, 'User account has been deactivated.')
      );
    }

    // Attach user to request object (compatible with stories routes)
    req.user = {
      id: user._id,
      _id: user._id, // For backwards compatibility
      username: user.username,
      email: user.email,
      role: user.role || 'user',
      avatar: user.avatar,
      isActive: user.isActive,
      createdAt: user.createdAt
    };

    console.log('✅ User authenticated:', user.username);
    next();

  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    return res.status(500).json(
      createResponse(false, null, 'Server error during authentication.')
    );
  }
};

// Alternative name for compatibility (same as auth)
const protect = auth;

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    try {
      console.log('🛡️ Checking user authorization...');
      
      // Ensure user is authenticated first
      if (!req.user) {
        console.log('❌ No user in request - auth middleware not run?');
        return res.status(401).json(
          createResponse(false, null, 'Authentication required before authorization.')
        );
      }

      const userRole = req.user.role || 'user';
      console.log(`👤 User role: ${userRole}, Required roles: ${roles.join(', ')}`);

      // Check if user has required role
      if (!roles.includes(userRole)) {
        console.log(`❌ Access denied - user role '${userRole}' not in required roles`);
        return res.status(403).json(
          createResponse(false, null, `Access denied. Required role: ${roles.join(' or ')}. Your role: ${userRole}`)
        );
      }

      console.log('✅ User authorized');
      next();

    } catch (error) {
      console.error('❌ Authorization error:', error.message);
      return res.status(500).json(
        createResponse(false, null, 'Server error during authorization.')
      );
    }
  };
};

// Optional user middleware - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Extract token if present
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // If no token, continue without user
    if (!token) {
      console.log('ℹ️ No token provided - continuing without authentication');
      req.user = null;
      return next();
    }

    try {
      // Verify and attach user if token is valid
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id || decoded.userId;
      
      if (userId) {
        const user = await User.findById(userId).select('-password');
        if (user && user.isActive !== false) {
          req.user = {
            id: user._id,
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role || 'user',
            avatar: user.avatar
          };
          console.log('✅ Optional auth - user attached:', user.username);
        }
      }
    } catch (tokenError) {
      console.log('⚠️ Optional auth - invalid token, continuing without user');
    }

    next();

  } catch (error) {
    console.error('❌ Optional auth error:', error.message);
    // Don't fail the request, just continue without user
    req.user = null;
    next();
  }
};

// Admin only middleware
const adminOnly = authorize('admin');

// Moderator or Admin middleware
const moderatorOrAdmin = authorize('moderator', 'admin');

// Check if user owns resource or is admin
const ownerOrAdmin = (resourceUserIdField = 'userId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json(
          createResponse(false, null, 'Authentication required.')
        );
      }

      const userRole = req.user.role || 'user';
      const userId = req.user.id || req.user._id;

      // Admin can access anything
      if (userRole === 'admin') {
        console.log('✅ Admin access granted');
        return next();
      }

      // Check ownership through different methods
      let resourceUserId;
      
      // Method 1: Direct from request params
      if (req.params.userId) {
        resourceUserId = req.params.userId;
      }
      // Method 2: From request body
      else if (req.body[resourceUserIdField]) {
        resourceUserId = req.body[resourceUserIdField];
      }
      // Method 3: From loaded resource (if middleware loads it)
      else if (req.resource && req.resource[resourceUserIdField]) {
        resourceUserId = req.resource[resourceUserIdField];
      }

      if (!resourceUserId) {
        console.log('❌ Cannot determine resource ownership');
        return res.status(403).json(
          createResponse(false, null, 'Cannot verify resource ownership.')
        );
      }

      // Check if user owns the resource
      if (userId.toString() === resourceUserId.toString()) {
        console.log('✅ Resource owner access granted');
        return next();
      }

      console.log('❌ Access denied - not resource owner or admin');
      return res.status(403).json(
        createResponse(false, null, 'Access denied. You can only access your own resources.')
      );

    } catch (error) {
      console.error('❌ Owner/Admin check error:', error.message);
      return res.status(500).json(
        createResponse(false, null, 'Server error during authorization.')
      );
    }
  };
};

// Middleware to check if user can upload (rate limiting, etc.)
const canUpload = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json(
        createResponse(false, null, 'Authentication required for upload.')
      );
    }

    const userId = req.user.id || req.user._id;
    const now = new Date();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

    // Check if user has uploaded recently (simple rate limiting)
    const recentUploads = await require('../models/Story').countDocuments({
      userId: userId,
      createdAt: { $gt: new Date(now - oneHour) }
    });

    // Allow up to 10 stories per hour
    if (recentUploads >= 10) {
      console.log(`❌ Upload rate limit exceeded for user ${userId}: ${recentUploads} uploads in last hour`);
      return res.status(429).json(
        createResponse(false, null, 'Upload rate limit exceeded. Please wait before uploading again.')
      );
    }

    console.log('✅ Upload permission granted');
    next();

  } catch (error) {
    console.error('❌ Upload permission check error:', error.message);
    return res.status(500).json(
      createResponse(false, null, 'Server error checking upload permissions.')
    );
  }
};

// Middleware to validate JWT without requiring user existence (for cleanup tasks)
const validateJWT = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(
        createResponse(false, null, 'Bearer token required.')
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.tokenPayload = decoded;
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(
        createResponse(false, null, 'Token expired.')
      );
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(
        createResponse(false, null, 'Invalid token.')
      );
    }
    
    return res.status(401).json(
      createResponse(false, null, 'Token validation failed.')
    );
  }
};

module.exports = {
  auth,           // Main authentication middleware
  protect,        // Alias for auth (backwards compatibility)
  authorize,      // Role-based authorization
  optionalAuth,   // Optional authentication
  adminOnly,      // Admin only access
  moderatorOrAdmin, // Moderator or Admin access
  ownerOrAdmin,   // Resource owner or Admin access
  canUpload,      // Upload permission check
  validateJWT     // JWT validation only
};
