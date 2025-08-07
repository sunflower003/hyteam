const path      = require('path');
const fs        = require('fs');
const Document  = require('../models/document');

// GET /api/documents
exports.getAll = async (req, res, next) => {
  try {
    const { search = '', sortBy = 'createdAt', sort = -1 } = req.query;
    const regex = new RegExp(search, 'i');

    const docs = await Document
      .find({ $or:[{ name: regex }, { tags: regex }] })
      .sort({ [sortBy]: sort });

    res.json({ success: true, data: docs });
  } catch (err) { next(err); }
};

// POST /api/documents/upload
exports.upload = async (req, res, next) => {
  try {
    if (!req.files?.length) return res.status(400).json({ success:false, message:'Không có file' });

    const saved = await Promise.all(req.files.map(f => Document.create({
      name        : f.originalname,
      originalName: f.originalname,
      type        : f.mimetype,
      size        : f.size,
      path        : `/uploads/documents/${f.filename}`,
      url         : `/api/documents/${f.filename}/download`,
      user        : req.user?._id
    })));

    res.json({ success:true, message:`Tải lên ${saved.length} file`, data:saved });
  } catch (err) { next(err); }
};

// PUT /api/documents/:id
exports.rename = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const doc = await Document.findByIdAndUpdate(id, { name }, { new:true });
    if (!doc) return res.status(404).json({ success:false, message:'Không tìm thấy' });
    res.json({ success:true, data:doc });
  } catch (err) { next(err); }
};

// DELETE /api/documents
exports.remove = async (req, res, next) => {
  try {
    const { ids = [] } = req.body;
    
    console.log('🗑️ DELETE REQUEST RECEIVED');
    console.log('📋 IDs to delete:', ids);
    
    const docs = await Document.find({ _id: { $in: ids } });
    console.log('📄 Found documents in DB:', docs.length);
    
    docs.forEach((doc, index) => {
      console.log(`📄 Document ${index + 1}:`, {
        id: doc._id,
        name: doc.name,
        path: doc.path
      });
      
      // Test multiple possible paths
      const paths = [
        path.join(__dirname, '..', '..', 'uploads', 'documents', path.basename(doc.path)),
        path.join(__dirname, '..', '..', doc.path),
        path.join(__dirname, '..', doc.path),
        path.join(__dirname, '..', '..', 'uploads', 'documents', doc.path)
      ];
      
      let fileDeleted = false;
      paths.forEach((filePath, pathIndex) => {
        console.log(`🔍 Path ${pathIndex + 1}:`, filePath);
        const exists = fs.existsSync(filePath);
        console.log(`📁 Exists:`, exists);
        
        if (exists && !fileDeleted) {
          try {
            fs.unlinkSync(filePath);
            console.log('✅ Successfully deleted file!');
            fileDeleted = true;
          } catch (fileErr) {
            console.error('❌ Error deleting file:', fileErr.message);
          }
        }
      });
      
      if (!fileDeleted) {
        console.warn('⚠️ No file was deleted for:', doc.name);
      }
    });

    // Delete from database
    const deleteResult = await Document.deleteMany({ _id: { $in: ids } });
    console.log('🗄️ Deleted from database:', deleteResult.deletedCount);

    res.json({ 
      success: true, 
      message: `Đã xóa ${docs.length} file`,
      deletedCount: deleteResult.deletedCount
    });
  } catch (err) { 
    console.error('💥 Error in remove function:', err);
    next(err); 
  }
};
// GET /api/documents/:filename/download
exports.download = (req, res, next) => {
  try {
   const filePath = path.join(__dirname, '..', '..', 'uploads', 'documents', req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success:false, message:'File không tồn tại' });
    res.download(filePath);
  } catch (err) { next(err); }
};
