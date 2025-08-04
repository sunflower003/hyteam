const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getConversations,
  createOrGetPrivateConversation,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  searchUsers
} = require('../controllers/chatController');

// Protect all routes
router.use(protect);

router.get('/users/search', searchUsers);

// Conversation routes
router.get('/conversations', getConversations);
router.post('/conversations', createOrGetPrivateConversation);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations/:conversationId/read', markMessagesAsRead);

// Message routes
router.post('/messages', sendMessage);

module.exports = router;