const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createResponse } = require('../utils/response');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json(
        createResponse(false, null, 'Not authorized, no token')
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json(
        createResponse(false, null, 'User not found')
      );
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json(
      createResponse(false, null, 'Not authorized, invalid token')
    );
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json(
        createResponse(false, null, `Role ${req.user.role} is not authorized`)
      );
    }
    next();
  };
};

module.exports = { protect, authorize };