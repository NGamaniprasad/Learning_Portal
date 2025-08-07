// models/UpdateAttempt.js
const mongoose = require('mongoose');

const UpdateAttemptSchema = new mongoose.Schema({
  email: String,
  timestamp: { type: Date, default: Date.now },
  success: Boolean,
  details: String,
});

module.exports = mongoose.model('UpdateAttempt', UpdateAttemptSchema);
