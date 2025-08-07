
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  name: String,
  email: String,
  date: String,
  status: String,
  queries: String
});

module.exports = mongoose.model('Attendance', attendanceSchema);
