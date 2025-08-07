

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const Login = require('../models/Login');

function generatePassword() {
  return crypto.randomBytes(4).toString('hex'); // 8-character hex password
}


function generatePassword() {
  return crypto.randomBytes(4).toString('hex'); // 8-char random password
}

router.post('/generate-password', async (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) return res.status(400).json({ error: 'Email and name required' });

  try {
    const existing = await Login.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Account already exists' });

    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const newLogin = new Login({
      email,
      name,
      password: hashedPassword,
      plainPassword // 🔥 Store it for future reference
    });

    await newLogin.save();

    // ✅ Send plain password once to user
    res.json({ message: 'Password generated', email, password: plainPassword });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});
router.get('/admin/logins', async (req, res) => {
  try {
    const logins = await Login.find({}, {
      email: 1,
      name: 1,
      plainPassword: 1,
      _id: 0
    });
    res.json(logins); // here will return plainPassword
  } catch (err) {
    res.status(500).json({ error: 'Error fetching logins' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

  try {
    const user = await Login.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/logins', async (req, res) => {
  try {
    const logins = await Login.find({}, { email: 1, name: 1, plainPassword: 1, _id: 0 });
    res.json(logins);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching logins' });
  }
});

router.get('/admin/update-attempts', async (req, res) => {
  try {
    const attempts = await UpdateAttempt.find().sort({ timestamp: -1 });
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
