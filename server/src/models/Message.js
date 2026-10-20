const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  seen: {
    type: Boolean,
    default: false
  },
  reaction: {
    type: String,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
