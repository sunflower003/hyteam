const express = require('express');
const { searchMovies, getMovieDetails, getTrendingMovies } = require('../controllers/movieController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Tat ca routes can authentication
router.use(protect);

router.get('/search', searchMovies);
router.get('/trending', getTrendingMovies);
router.get('/:movieId', getMovieDetails);

module.exports = router;