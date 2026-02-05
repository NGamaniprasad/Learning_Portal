require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');

// Models
const User = require('./models/User');
const Attendance = require('./models/Attendance');
const Student = require('./models/Student');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// }).then(() => console.log('✅ MongoDB connected'))
//   .catch(err => console.error('❌ MongoDB connection error:', err));
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error(err));


// Session setup -- im changed 
// app.use(session({
//   secret: process.env.SESSION_SECRET,
//   resave: false,
//   saveUninitialized: false
// }));
const MongoStore = require('connect-mongo');

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret123',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI
  })
}));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve public files: home.html, login.html, signup.html
app.use(express.static(path.join(__dirname, 'public')));

// Protect all private HTML files
app.use('/private', (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login.html');
  }
});
app.use('/private', express.static(path.join(__dirname, 'private')));

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});


// ------------------ AUTH ROUTES ------------------

// Signup
app.post('/api/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name: username, email, password: hashed });
    await user.save();
    res.json({ message: 'Signup successful' });
  } catch (err) {
    res.status(500).json({ error: 'Signup failed' });
  }
});



app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    req.session.user = { name: user.name, email: user.email };
    res.json({ message: 'Login successful', user: req.session.user });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
app.get('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/home.html');
  });
});


// ------------------ ATTENDANCE ROUTES ------------------

app.post('/attendance', async (req, res) => {
  try {
    const attendance = new Attendance(req.body);
    await attendance.save();
    res.json({ message: 'Attendance submitted' });
  } catch {
    res.status(500).json({ error: 'Error saving attendance' });
  }
});

app.get('/attendance', async (req, res) => {
  try {
    const records = await Attendance.find();
    res.json(records);
  } catch {
    res.status(500).json({ error: 'Error fetching attendance' });
  }
});

app.put('/attendance', async (req, res) => {
  const { email, date, status, queries } = req.body;

  if (!email || !date) {
    return res.status(400).json({ error: 'Email and date are required to update.' });
  }

  try {
    const result = await Attendance.updateOne(
      { email, date },
      { $set: { status, queries } }
    );

    res.json({ message: `Updated ${result.modifiedCount} record(s)` });
  } catch (err) {
    res.status(500).json({ error: 'Error updating attendance' });
  }
});

app.delete('/attendance', async (req, res) => {
  const { email, date } = req.body;

  if (!email || !date) {
    return res.status(400).json({ error: 'Email and date are required to delete.' });
  }

  try {
    const result = await Attendance.deleteOne({ email, date });
    res.json({ message: `Deleted ${result.deletedCount} record(s)` });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting attendance' });
  }
});


// ------------------ STUDENT ROUTES ------------------

app.get("/students", async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST new student
app.post("/students", async (req, res) => {
  try {
    const newStudent = new Student(req.body);
    await newStudent.save();
    res.json({ message: "Student added", student: newStudent });
  } catch (err) {
    res.status(400).json({ error: "Invalid data", details: err.message });
  }
});

// PUT update student
app.put("/students/:id", async (req, res) => {
  try {
    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedStudent) {
      return res.status(404).json({ error: "Student not found" });
    }
    res.json({ message: "Student updated", student: updatedStudent });
  } catch (err) {
    res.status(400).json({ error: "Invalid data", details: err.message });
  }
});

// DELETE student
app.delete("/students/:id", async (req, res) => {
  try {
    const deletedStudent = await Student.findByIdAndDelete(req.params.id);
    if (!deletedStudent) {
      return res.status(404).json({ error: "Student not found" });
    }
    res.json({ message: "Student deleted" });
  } catch (err) {
    res.status(400).json({ error: "Invalid ID", details: err.message });
  }
});
// ------------------ EMAIL SENDING ------------------

// const GMAIL_USER = '';
// const GMAIL_PASS = ''; // Gmail App Password
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS,
  },
});

app.post('/send', (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ success: false, message: 'Email and message are required.' });
  }

  const mailOptions = {
    from: GMAIL_USER,
    to,
    subject: 'Message from Teacher',
    text: message,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Mail Error:', error);
      return res.status(500).json({ success: false, message: 'Failed to send email.' });
    } else {
      console.log('Email sent:', info.response);
      return res.status(200).json({ success: true, message: 'Email sent successfully!' });
    }
  });
});


// ------------------ PROTECTED HTML EXAMPLE ------------------

app.get('/courses', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(__dirname, 'private', 'courses.html'));
});


// ------------------ START SERVER ------------------
const UpdateAttempt = require('./models/UpdateAttempt');
//const Student = require('./models/Student');

app.put('/students/:id', async (req, res) => {
  const { email } = req.body;
  try {
    const updatedStudent = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });

    await UpdateAttempt.create({
      email,
      success: true,
      details: `Updated student ${req.params.id}`,
    });

    res.json({ message: 'Student updated successfully' });
  } catch (err) {
    await UpdateAttempt.create({
      email,
      success: false,
      details: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});
app.put('/students/:id', async (req, res) => {
  const { email } = req.body;
  try {
    const updatedStudent = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });

    await UpdateAttempt.create({
      email,
      success: true,
      details: `Updated student ${req.params.id}`,
    });

    res.json({ message: 'Student updated successfully' });
  } catch (err) {
    await UpdateAttempt.create({
      email,
      success: false,
      details: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});
app.get('/admin/update-attempts', async (req, res) => {
  if (!req.isAdmin) { // Implement your admin check here
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const attempts = await UpdateAttempt.find().sort({ timestamp: -1 });
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch update attempts' });
  }
});
const secureUsersRoutes = require('./routes/secureUsers');
app.use('/secure-users', secureUsersRoutes);
//pwd change

const Login = require('./models/Login'); // ✅ Adjust the path if needed

app.post("/secure-users/change-password", async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long" });
    }

    const user = await Login.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
      return res.status(401).json({ error: "Incorrect old password" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    user.plainPassword = newPassword; // ✅ overwrite plain password too
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error changing password:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
//------------------
//http://localhost:3000/secure-users/admin/all?adminPassword=Gamani@505891LMS
