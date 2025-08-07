const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const ensureUploadsDir = () => {
  const uploadsDir = path.join(__dirname, '../../uploads');
  const postsDir = path.join(uploadsDir, 'posts');
  const storiesDir = path.join(uploadsDir, 'stories');

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  if (!fs.existsSync(postsDir)) {
    fs.mkdirSync(postsDir, { recursive: true });
  }
  
  if (!fs.existsSync(storiesDir)) {
    fs.mkdirSync(storiesDir, { recursive: true });
  }
};

module.exports = { ensureUploadsDir };
