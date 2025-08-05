const express = require('express');
const router = express.Router();
const hypoController = require('../controllers/hypoController');

console.log('🛣️ Optimized AI Routes loaded');

// Main streaming chat endpoint
router.post('/chat-stream', (req, res, next) => {
  console.log('🚀 Optimized streaming chat route hit!');
  hypoController.chatStream(req, res, next);
});

// Conversation management
router.get('/conversation/:conversationId/history', (req, res, next) => {
  console.log('📖 Get conversation history route hit!');
  hypoController.getConversationHistory(req, res, next);
});

router.delete('/conversation/:conversationId', (req, res, next) => {
  console.log('🗑️ Clear conversation route hit!');
  hypoController.clearConversation(req, res, next);
});

// Health check with cache stats
router.get('/health', (req, res, next) => {
  console.log('🏥 Health check route hit!');
  hypoController.healthCheck(req, res, next);
});

// Sonar model management
router.get('/sonar/models', (req, res, next) => {
  console.log('🌐 Get Sonar models route hit!');
  hypoController.getSonarModels(req, res, next);
});

router.post('/sonar/switch', (req, res, next) => {
  console.log('🔄 Switch Sonar model route hit!');
  hypoController.switchSonarModel(req, res, next);
});

// NEW: Cache management endpoint
router.post('/cache/manage', (req, res, next) => {
  console.log('💾 Cache management route hit!');
  hypoController.managCache(req, res, next);
});

// NEW: Sonar model management endpoint
router.get('/models/sonar', (req, res, next) => {
  console.log('🔍 Get Sonar models route hit!');
  hypoController.getSonarModels(req, res, next);
});

router.post('/models/sonar/switch', (req, res, next) => {
  console.log('🔄 Switch Sonar model route hit!');
  hypoController.switchSonarModel(req, res, next);
});

console.log('✅ All optimized AI routes registered');

module.exports = router;
