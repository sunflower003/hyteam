const { body, validationResult } = require('express-validator');
const { createResponse } = require('../utils/response');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(
      createResponse(false, null, 'Validation failed', errors.array())
    );
  }
  next();
};

const validateRegister = [
  // Bỏ hết validation, chỉ kiểm tra có dữ liệu
  body('username').notEmpty().withMessage('Username is required'),
  body('email').notEmpty().withMessage('Email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  
  handleValidationErrors
];

const validateLogin = [
  body('email').notEmpty().withMessage('Email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  
  handleValidationErrors
];

const validateRoom = [
  body('roomId')
    .isLength({ min: 3, max: 20 })
    .withMessage('Room ID must be between 3-20 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Room ID can only contain letters, numbers, hyphens, and underscores'),
  
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Room name must be between 1-100 characters'),
  
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validateRoom,
  handleValidationErrors
};