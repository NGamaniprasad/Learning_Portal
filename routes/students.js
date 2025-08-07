const express = require("express");
const router = express.Router();
const Student = require("../models/Student");

// Add student
router.post("/", async (req, res) => {
  try {
    const { name, course, email, phone } = req.body;
    const student = new Student({ name, course, email, phone });
    await student.save();
    res.json({ message: "Student added successfully", student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all students
router.get("/", async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update student by ID
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, course, email, phone } = req.body;
    const student = await Student.findByIdAndUpdate(
      id,
      { name, course, email, phone },
      { new: true }
    );
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json({ message: "Student updated", student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete student by ID
router.delete("/:id", async (req, res) => {
  try {
    
    const { id } = req.params;
    const student = await Student.findByIdAndDelete(id);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json({ message: "Student deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
