const path      = require('path');
const fs        = require('fs');
const Document  = require('../models/document');

// GET /api/documents
exports.getAll = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { search = '', sortBy = 'createdAt', sort = -1 } = req.query;
    const regex = new RegExp(search, 'i');

    const docs = await Document
      .find({ 
        user: userId, // Chỉ lấy documents của user hiện tại
        $or:[{ name: regex }, { tags: regex }] 
      })
      .sort({ [sortBy]: sort });

    // Format response với id field
    const formattedDocs = docs.map(doc => ({
      id: doc._id.toString(), // Chuyển _id thành id
      name: doc.name,
      size: doc.size,
      type: doc.type,
      createdAt: doc.createdAt,
      path: doc.path,
      url: doc.url,
      filename: path.basename(doc.path) // Lấy filename từ path
    }));

    console.log('📋 Found documents for user:', userId, 'count:', formattedDocs.length);
    res.json({ success: true, data: formattedDocs });
  } catch (err) { 
    console.error('Error in getAll:', err);
    next(err); 
  }
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

    // Format the response to match getAll format
    const formattedSaved = saved.map(doc => ({
      id: doc._id.toString(),
      name: doc.name,
      size: doc.size,
      type: doc.type,
      createdAt: doc.createdAt,
      path: doc.path,
      url: doc.url,
      filename: path.basename(doc.path) // Lấy filename từ path
    }));

    res.json({ success:true, message:`Tải lên ${saved.length} file`, data:formattedSaved });
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
    const userId = req.user?._id;
    
    console.log('🗑️ DELETE REQUEST RECEIVED');
    console.log('📋 User ID:', userId);
    console.log('📋 IDs to delete:', ids);

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!ids || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No IDs provided' });
    }

    // Chỉ tìm documents thuộc về user hiện tại
    const docs = await Document.find({ 
      _id: { $in: ids },
      user: userId // QUAN TRỌNG: chỉ lấy file của user hiện tại
    });
    
    console.log('📄 Found documents to delete:', docs.length, 'of', ids.length, 'requested');
    
    if (docs.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No documents found or permission denied' 
      });
    }

    // Delete physical files
    let filesDeleted = 0;
    docs.forEach(doc => {
      const filename = path.basename(doc.path);
      const filePath = path.join(__dirname, '..', '..', 'uploads', 'documents', filename);
      console.log('�️ Attempting to delete file:', filePath);
      
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log('✅ File deleted successfully:', doc.name);
          filesDeleted++;
        } catch (fileErr) {
          console.error('❌ Error deleting file:', fileErr.message);
        }
      } else {
        console.warn('⚠️ File not found on disk:', filePath);
      }
    });

    // Delete from database - chỉ xóa documents của user hiện tại
    const deleteResult = await Document.deleteMany({ 
      _id: { $in: ids },
      user: userId // QUAN TRỌNG: đảm bảo chỉ xóa file của user
    });
    
    console.log('🗄️ Deleted from database:', deleteResult.deletedCount);

    res.json({ 
      success: true, 
      message: `Successfully deleted ${deleteResult.deletedCount} documents`,
      deletedCount: deleteResult.deletedCount,
      filesDeleted: filesDeleted
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
