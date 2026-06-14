const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

// @route   POST /api/auth/signup
// @desc    Register a new customer
router.post('/signup', async (req, res) => {
  const { full_name, email, password } = req.body;

  // Simple validation
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Please enter all fields.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  try {
    // Check if user already exists
    const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Hash the password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // Insert user
    const [result] = await db.query(
      'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
      [full_name, email, hashedPassword, 'customer']
    );

    // Save in session
    const newUser = {
      id: result.insertId,
      full_name,
      email,
      role: 'customer'
    };
    req.session.user = newUser;

    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('Session save error:', saveErr);
        return res.status(500).json({ error: 'Session error. Please try again.' });
      }
      return res.status(201).json({
        message: 'Registration successful.',
        user: newUser
      });
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user and set session
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please enter email and password.' });
  }

  try {
    // Check for user
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!users || users.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const user = users[0];

    // Validate password
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    // Save in session
    const loggedInUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role
    };
    req.session.user = loggedInUser;

    // session.save shim handles cookie-session and express-session both
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('Session save error:', saveErr);
        return res.status(500).json({ error: 'Session error. Please try again.' });
      }
      return res.json({
        message: 'Login successful.',
        user: loggedInUser
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user and clear session
router.post('/logout', (req, res) => {
  req.session = null; // cookie-session: nulling the session clears the cookie
  return res.json({ message: 'Logged out successfully.' });
});

// @route   GET /api/auth/me
// @desc    Get current user profile session
router.get('/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ user: req.session.user });
  }
  return res.json({ user: null });
});

module.exports = router;
