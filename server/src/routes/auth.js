const express = require('express');
const { register, login, getProfile } = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/validation');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/profile', protect, getProfile);

module.exports = router;