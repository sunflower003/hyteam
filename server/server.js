// Thêm dòng này để serve uploaded files
app.use('/uploads', express.static('uploads'));

// Import và sử dụng stories route
const storiesRoutes = require('./src/routes/stories');
app.use('/api/stories', storiesRoutes);
