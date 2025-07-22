const express = require('express');
const { createRoom, getRoomInfo, updateCurrentMovie } = require('../controllers/roomController');
const { validateRoom } = require('../middleware/validation');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Tat ca routes can authentication
router.use(protect);

router.post('/', validateRoom, createRoom);
router.get('/:roomId', getRoomInfo);
router.put('/:roomId/movie', updateCurrentMovie);

module.exports = router;