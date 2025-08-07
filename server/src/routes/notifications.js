const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
} = require('../controllers/notificationController');

// Debug middleware
router.use((req, res, next) => {
  console.log(`🔔 Notification Route: ${req.method} ${req.originalUrl}`, {
    body: req.body,
    query: req.query,
    headers: req.headers.authorization ? 'Bearer ***' : 'No auth'
  });
  next();
});

// Protect all routes
router.use(protect);

// Get notifications
router.get('/', getNotifications);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Mark notification as read
router.patch('/:notificationId/read', markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', markAllAsRead);

module.exports = router;
