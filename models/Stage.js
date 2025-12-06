const mongoose = require('mongoose');

const stageSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  order: { type: Number, default: 0 }
});

module.exports = mongoose.model('Stage', stageSchema);
