const axios = require('axios');
const { createResponse } = require('../utils/response');

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY;

//tim kiem phim
const searchMovies = async (req, res) => {
    try {
        const { query, page=1 } = req.query; // Lấy query từ tham số truy vấn
        if (!query) {
            return res.status(400).json(
                createResponse(false, null, 'search query is required')
            );
        }

        const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
            params: {
                api_key: TMDB_API_KEY,
                query,
                page,
                language: 'en-US',
            }
        });

        const movies = response.data.results.map(movie => ({
            id: movie.id,
            title: movie.title,
            overview: movie.overview,
            posterPath: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null, // Chỉ lấy đường dẫn poster nếu có
            backdropPath: movie.backdrop_path ? `https://image.tmdb.org/t/p/w500${movie.backdrop_path}` : null, // Chỉ lấy đường dẫn backdrop nếu có
            releaseDate: movie.release_date,
            voteAverage: movie.vote_average,
            voteCount: movie.vote_count
        }));

        res.json(
            createResponse(true, {
                movies,
                totalPages: response.data.total_pages,
                totalResults: response.data.total_results,
                currentPage: response.data.page
            }, 'Movies fetched successfully')
        );
    }
    catch (error) {
        console.error('Search movies error:', error);
        res.status(500).json(
            createResponse(false, null, 'Failed to fetch movies', error.message)
        );
    }
};

// Lay chi tiet phim
const getMovieDetails = async (req, res) => {
    try {
        const { movieId } = req.params;
        
        const response = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}`, {
            params: {
                api_key: TMDB_API_KEY,
                language: 'en-US'
            }
    });

    const movie = response.data;
    const movieDetails = {
        id: movie.id,
        title: movie.title,
        overview: movie.overview,
        posterPath: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
        backdropPath: movie.backdrop_path ? `https://image.tmdb.org/t/p/w500${movie.backdrop_path}` : null,
        releaseDate: movie.release_date,
        runtime: movie.runtime,
        genres: movie.genres,
        voteAverage: movie.vote_average,
        voteCount: movie.vote_count,
        streamUrl: `https://vidsrc.xyz/embed/movie/${movie.id}` // virdsrc.xyz là một trang web cung cấp dịch vụ xem phim trực tuyến
    };
    res.json(
        createResponse(true, movieDetails, 'Movie details fetched successfully')
    );
    } catch (error) {
        console.error('Get movie details error:', error);
        res.status(500).json(
            createResponse(false, null, 'Failed to fetch movie details', error.message)
        );
    }
};

// Lay danh sach phim noi bat
const getTrendingMovies = async (req, res) => {
    try {
         const { timeWindow = 'day', page = 1 } = req.query; // Lấy tham số truy vấn
         const response = await axios.get(`${TMDB_BASE_URL}/trending/movie/${timeWindow}`, {
            params: {
                api_key: TMDB_API_KEY,
            }
        });

    const movies = response.data.results.slice(0, 20).map(movie => ({
        id: movie.id,
        title: movie.title,
        overview: movie.overview,
        posterPath: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
        backdropPath: movie.backdrop_path ? `https://image.tmdb.org/t/p/w500${movie.backdrop_path}` : null,
        releaseDate: movie.release_date,
        voteAverage: movie.vote_average
    }));

    res.json(
        createResponse(true, movies, 'Trending movies fetched successfully')
    );
    } catch (error) {
        console.error('Get trending movies error:', error);
        res.status(500).json(
            createResponse(false, null, 'Failed to fetch trending movies', error.message)
        );
    }
};

module.exports = {
    searchMovies,
    getMovieDetails,
    getTrendingMovies
};