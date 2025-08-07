// server/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const path = require('path');   // thêm
require('dotenv').config();

// Kết nối các phần cấu hình/middleware
const connectDB = require('./config/database');
const corsOptions = require('./config/cors');
const errorHandler = require('./middleware/errorHandler');
const { createResponse } = require('./utils/response');
const { initializeSocket } = require('./config/socket');
const { scheduleStoryCleanup } = require('./utils/storyCleanup');

// Import các route chính
const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const roomRoutes = require('./routes/rooms');
const messageRoutes = require('./routes/messages');
const profileRoutes = require('./routes/profile');
const storyRoutes = require('./routes/stories');
const postRoutes = require('./routes/posts');
const projectRoutes = require('./routes/projects');
const chatRoutes = require('./routes/chats');
// Thêm route dành cho AI Hypo (bạn cần file này ở src/ai/routes/hypo.js)
const hypoRoutes = require('./ai/routes/hypo');
const documentsRoutes = require('./routes/documents');    // ← THÊM
// Kết nối database
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io nếu dùng tính năng socket
const io = initializeSocket(server);

// Initialize story cleanup scheduler
scheduleStoryCleanup();

// Thêm security middlewares
app.use(helmet({ crossOriginEmbedderPolicy: false }));

// Xử lý preflight request
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// Thêm logging request
app.use(morgan('combined'));

// Hạn chế rate limit để tránh abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests mỗi window cho 1 IP
  message: createResponse(false, 'Too many requests, please try again later.')
});
app.use(limiter);

// Phân tích body cho json
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // thêm 
// Route mặc định (test server sống)
app.get('/', (req, res) => {
  res.json(createResponse(true, null, 'Welcome to HyTeam API'));
});

// Đăng ký các route chính
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/projects', projectRoutes);
// Đăng ký endpoint AI chat: FE sẽ POST lên api/ai/hypo/chat
app.use('/api/ai/hypo', hypoRoutes);
app.use('/api/chats', chatRoutes);  
app.use('/api/documents', documentsRoutes);    // thêm
// Route cho các API không tồn tại
app.all('*', (req, res) => {
  res.status(404).json(
    createResponse(false, null, `Route ${req.originalUrl} not found`)
  );
});

// Middleware xử lý lỗi chung
app.use(errorHandler);

// Khởi động server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
