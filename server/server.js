const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');

// Load environment variables trước khi import các module khác
dotenv.config();

// Import database connection
const { connectDB, checkDatabaseHealth } = require('./src/config/database');

// Import middleware
const auth = require('./src/middleware/auth');

// Import routes
const authRoutes = require('./src/routes/auth');
const storiesRoutes = require('./src/routes/stories');
const roomRoutes = require('./src/routes/rooms');
const messageRoutes = require('./src/routes/messages');
const movieRoutes = require('./src/routes/movies');

// Initialize Express app
const app = express();

// Connect to Database
connectDB();

// Trust proxy (for deployment on services like Render, Vercel)
app.set('trust proxy', 1);

// ===================== CREATE UPLOAD DIRECTORIES =====================
const createUploadDirs = () => {
  const dirs = [
    'uploads',
    'uploads/stories',
    'uploads/avatars',
    'uploads/documents',
    'uploads/temp'
  ];
  
  dirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
};

createUploadDirs();

// ===================== MIDDLEWARE SETUP =====================

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.CLIENT_URL || 'http://localhost:3000',
      process.env.CORS_ORIGIN || 'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5173', // Vite default port
      'https://hyteam.vercel.app', // Replace với domain production thực tế
      'https://hyteam.netlify.app'  // Replace với domain production thực tế
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`🚫 CORS blocked origin: ${origin}`);
      callback(null, true); // Allow all origins in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // For legacy browser support
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb' 
}));

// Serve uploaded files với cache headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d', // Cache static files for 7 days
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Set specific headers for different file types
    if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/*');
    } else if (path.endsWith('.mp4') || path.endsWith('.webm')) {
      res.setHeader('Content-Type', 'video/*');
    }
  }
}));

// Public static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const userAgent = req.headers['user-agent']?.substring(0, 50) || 'Unknown';
    console.log(`📝 [${timestamp}] ${req.method} ${req.originalUrl} - IP: ${req.ip} - UA: ${userAgent}`);
    next();
  });
}

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'");
  }
  
  next();
});

// ===================== SOCKET.IO SETUP =====================
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || corsOptions.origin,
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);
  
  // Join room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`👥 User ${socket.id} joined room: ${roomId}`);
    socket.to(roomId).emit('user-joined', socket.id);
  });
  
  // Leave room
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    console.log(`👋 User ${socket.id} left room: ${roomId}`);
    socket.to(roomId).emit('user-left', socket.id);
  });
  
  // Handle new story notification
  socket.on('new-story', (storyData) => {
    console.log(`📖 New story from ${socket.id}:`, storyData.author);
    socket.broadcast.emit('story-update', storyData);
  });
  
  // Handle new message
  socket.on('new-message', (messageData) => {
    console.log(`💬 New message in room ${messageData.roomId}`);
    socket.to(messageData.roomId).emit('message-received', messageData);
  });
  
  // Handle typing indicators
  socket.on('typing-start', (data) => {
    socket.to(data.roomId).emit('user-typing', { userId: data.userId, isTyping: true });
  });
  
  socket.on('typing-stop', (data) => {
    socket.to(data.roomId).emit('user-typing', { userId: data.userId, isTyping: false });
  });
  
  // Handle AI chat requests
  socket.on('ai-chat', async (data) => {
    try {
      console.log(`🤖 AI chat request from ${socket.id}`);
      // Forward to AI service if needed
      socket.emit('ai-response', { message: 'AI response would go here' });
    } catch (error) {
      console.error('❌ AI chat error:', error);
      socket.emit('ai-error', { message: 'AI service unavailable' });
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`🔌 User disconnected: ${socket.id}, Reason: ${reason}`);
  });
  
  // Handle connection errors
  socket.on('error', (error) => {
    console.error(`🚨 Socket error for ${socket.id}:`, error);
  });
});

// Make io accessible to routes
app.set('io', io);

// ===================== API ROUTES =====================

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    
    res.json({
      status: 'OK',
      message: 'Hyteam API is running successfully',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptime),
        human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
      },
      database: dbHealth,
      memory: {
        used: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
        total: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`
      },
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      features: {
        stories: true,
        realtime: true,
        ai: true,
        fileUpload: true
      }
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(503).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// API Info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Hyteam API',
    description: 'Modern team management platform with social features and AI integration',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      stories: '/api/stories', 
      rooms: '/api/rooms',
      messages: '/api/messages',
      movies: '/api/movies',
      health: '/api/health'
    },
    features: [
      'User Authentication (JWT)',
      'Story Upload & Viewing (24h expiry)',
      'Real-time Chat & Notifications',
      'AI Assistant Integration',
      'File Upload & Management',
      'Team Management Tools'
    ],
    documentation: 'https://hyteam-docs.vercel.app', // Replace với URL thực tế
    support: 'support@hyteam.com' // Replace với email thực tế
  });
});

// Mount API routes với proper error handling
app.use('/api/auth', authRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/movies', movieRoutes);

// ===================== ERROR HANDLING =====================

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    suggestion: 'Check the API documentation for available endpoints'
  });
});

// Serve React app in production (if serving frontend from same server)
if (process.env.NODE_ENV === 'production') {
  // Serve static files from React build
  const clientBuildPath = path.join(__dirname, '../client/dist');
  
  if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
    
    // Handle React routing - send all non-api requests to React
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  } else {
    console.log('⚠️ Client build not found, serving API only');
  }
}

// Global error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error('💥 Global error handler:', err.stack);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value',
      field: Object.keys(err.keyPattern)[0]
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ===================== SERVER STARTUP =====================
const PORT = process.env.PORT || 5000;

const startServer = () => {
  server.listen(PORT, () => {
    console.log('🚀 ===== HYTEAM SERVER STARTED =====');
    console.log(`⚡ Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
    console.log(`📡 API Base: http://localhost:${PORT}/api`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🌐 Socket.IO: Enabled on port ${PORT}`);
    console.log(`📁 Upload Directory: ${path.join(__dirname, 'uploads')}`);
    console.log('====================================');
    
    // Log available endpoints in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📋 Available API Endpoints:');
      console.log('   • POST /api/auth/login');
      console.log('   • POST /api/auth/register');
      console.log('   • GET  /api/stories');
      console.log('   • POST /api/stories');
      console.log('   • GET  /api/rooms');
      console.log('   • POST /api/messages');
      console.log('   • GET  /api/health');
    }
  });
};

// ===================== PROCESS EVENT HANDLERS =====================

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  console.error('📍 Stack:', error.stack);
  
  // Graceful shutdown
  console.log('🛑 Shutting down due to uncaught exception...');
  server.close(() => {
    console.log('🛑 Server closed');
    process.exit(1);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise);
  console.error('📍 Reason:', reason);
  
  // Graceful shutdown
  console.log('🛑 Shutting down due to unhandled rejection...');
  server.close(() => {
    console.log('🛑 Server closed');
    process.exit(1);
  });
});

// Graceful shutdown on SIGTERM (deployment)
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Starting graceful shutdown...');
  
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

// Graceful shutdown on SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received. Starting graceful shutdown...');
  
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

// Start the server
startServer();

// Export for testing purposes
module.exports = { app, server, io };
