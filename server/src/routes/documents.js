// server/src/routes/documents.js
const router     = require('express').Router();
const { protect } = require('../middleware/auth');
const uploadMdw  = require('../config/multer');
const docCtrl    = require('../controllers/documentController');

router.get('/',             protect, docCtrl.getAll);
router.post('/upload', protect, uploadMdw.array('documents', 10), docCtrl.upload);
router.put('/:id',          protect, docCtrl.rename);
router.delete('/',          protect, docCtrl.remove);
router.get('/:filename/download', docCtrl.download);

module.exports = router;
