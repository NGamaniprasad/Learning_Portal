

const mongoose = require('mongoose');

const loginSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  plainPassword: { type: String } // Optional: only if needed for admin access
});

module.exports = mongoose.model('Login', loginSchema);
