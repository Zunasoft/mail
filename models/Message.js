const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  room: {
    type: String,
    default: 'general'
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Only for private messages
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
messageSchema.index({ room: 1, timestamp: -1 });
messageSchema.index({ sender: 1, recipient: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);
