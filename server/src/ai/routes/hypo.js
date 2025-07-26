const express = require('express');
const router = express.Router();
const hypoController = require('../controllers/hypoController');

console.log('🛣️ AI Routes file loaded');

// Streaming chat endpoint (primary)
router.post('/chat-stream', (req, res, next) => {
  console.log('🦙 Ollama streaming chat route hit!');
  hypoController.chatStream(req, res, next);
});

// Legacy chat endpoint (keep for compatibility)
router.post('/chat', (req, res, next) => {
  console.log('📥 Legacy chat route hit!');
  hypoController.chat(req, res, next);
});

// Conversation management endpoints
router.get('/conversation/:conversationId/history', (req, res, next) => {
  console.log('📖 Get conversation history route hit!');
  hypoController.getConversationHistory(req, res, next);
});

router.delete('/conversation/:conversationId', (req, res, next) => {
  console.log('🗑️ Clear conversation route hit!');
  hypoController.clearConversation(req, res, next);
});

// NEW: Ollama model management routes
router.post('/models/manage', (req, res, next) => {
  console.log('🦙 Model management route hit!');
  hypoController.manageModels(req, res, next);
});

// Enhanced health check endpoint
router.get('/health', (req, res, next) => {
  console.log('🏥 Health check route hit!');
  hypoController.healthCheck(req, res, next);
});

// Enhanced stats endpoint
router.get('/stats', (req, res, next) => {
  console.log('📊 Stats route hit!');
  hypoController.getStats(req, res, next);
});

console.log('✅ All AI routes registered (Ollama ready)');

module.exports = router;
