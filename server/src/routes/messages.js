const express = require('express');
const { getRoomMessages, deleteMessage } = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // Apply authentication middleware to all routes

router.get('/room/:roomId', getRoomMessages);
router.delete('/:messageId', deleteMessage);

module.exports = router;