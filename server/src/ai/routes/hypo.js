const express = require('express');
const router = express.Router();
const hypoController = require('../controllers/hypoController');

console.log('🛣️ AI Routes file loaded');

// Original chat endpoint
router.post('/chat', (req, res, next) => {
  console.log('📥 Chat route hit!');
  hypoController.chat(req, res, next);
});

// New streaming chat endpoint
router.post('/chat-stream', (req, res, next) => {
  console.log('🌊 Streaming chat route hit!');
  hypoController.chatStream(req, res, next);
});

console.log('✅ Chat routes registered');

module.exports = router;
