const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
require('dotenv').config();

const connectDB = require('./config/database');
const corsOptions = require('./config/cors');
const errorHandler = require('./middleware/errorHandler');
const { createResponse } = require('./utils/response');
const { initializeSocket } = require('./config/socket');

//import routes
const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const roomRoutes = require('./routes/rooms');
const messageRoutes = require('./routes/messages');


//Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocket(server);

// security middlewares
app.use(helmet({
    crossOriginEmbedderPolicy: false,
}));

// Handle preflight requests
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

//Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: createResponse(false, 'Too many requests, please try again later.')
});
app.use(limiter);

// body parsing middleware
app.use(express.json({ limit: '10mb' }));
 

// Routes 
app.get('/', (req, res) => {
    res.json(createResponse(true, null, 'Welcome to HyTeam API'));
});

app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);

// Handle undefined routes
app.all('*', (req, res) => {
    res.status(404).json(
        createResponse(false, null , `Route ${req.originalUrl} not found`)
    );
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;