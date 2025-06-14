const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  _id: String,
  content: Object,
});

module.exports = mongoose.model('Document', DocumentSchema);
