const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  name         : { type: String, required: true },
  originalName : { type: String, required: true },
  type         : { type: String, required: true },
  size         : { type: Number, required: true },
  path         : { type: String, required: true },
  url          : { type: String, required: true },
  user         : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tags         : [String]
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
