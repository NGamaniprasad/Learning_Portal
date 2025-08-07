
const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  course: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  attendance: [
    {
      date: String,
      status: String,
    },
  ],
});

module.exports = mongoose.model("Student", studentSchema);
