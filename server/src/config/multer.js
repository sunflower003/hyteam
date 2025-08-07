const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'documents');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename   : (_, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = 'doc-' + Date.now() + '-' + Math.round(Math.random()*1e9) + ext;
    cb(null, name);
  }
});

const fileFilter = (_, file, cb) => {
  const allowed = /jpg|jpeg|png|gif|pdf|doc|docx|txt|zip|rar|mp4|mov|avi/;
  const ok = allowed.test(file.mimetype) || allowed.test(path.extname(file.originalname).toLowerCase());
  ok ? cb(null, true) : cb(new Error('Định dạng file không hỗ trợ'));
};

module.exports = multer({
  storage,
  limits : { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter
});
