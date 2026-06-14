const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Request body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session management setup
app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'super_secret_cafeteria_token_key_12345',
  resave: true,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    httpOnly: true,
    secure: false, // Set to true if running on HTTPS
    sameSite: 'lax'
  }
}));

// Debug request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Import database to trigger pool connection or fallback setup
require('./db');

// Import API Routers
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

// Mount API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Helper for static file mapping (serving clean URLs)
const sendHTML = (filename) => {
  return (req, res) => {
    res.sendFile(path.join(__dirname, 'public', filename));
  };
};

// Map Clean URLs to HTML Files
app.get('/', sendHTML('index.html'));
app.get('/about', sendHTML('about.html'));
app.get('/contact', sendHTML('contact.html'));
app.get('/menu', sendHTML('menu.html'));
app.get('/login', sendHTML('login.html'));
app.get('/signup', sendHTML('signup.html'));
app.get('/cart', sendHTML('cart.html'));
app.get('/checkout', sendHTML('checkout.html'));
app.get('/dashboard', sendHTML('dashboard.html'));
app.get('/track', sendHTML('track.html'));

// Admin HTML Views (with auth check redirect if trying to load pages directly)
const checkAdminViewAccess = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  // Not authenticated — redirect to login with return path
  const redirectTo = '/login?redirect=' + encodeURIComponent(req.originalUrl);
  console.log(`[Admin Guard] Blocked ${req.originalUrl} — no valid admin session. Redirecting to login.`);
  return res.redirect(redirectTo);
};

app.get('/admin', checkAdminViewAccess, sendHTML('admin/index.html'));
app.get('/admin/foods', checkAdminViewAccess, sendHTML('admin/foods.html'));
app.get('/admin/orders', checkAdminViewAccess, sendHTML('admin/orders.html'));
app.get('/admin/categories', checkAdminViewAccess, sendHTML('admin/categories.html'));
app.get('/admin/reports', checkAdminViewAccess, sendHTML('admin/reports.html'));

// Serve remaining static assets (CSS, JS, Images, etc)
app.use(express.static(path.join(__dirname, 'public')));

// Fallback 404 handler for unmatched pages
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html')); // Fallback to landing page or we could make a custom 404
});

// Launch locally, but export the app for serverless hosts such as Vercel.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n================================================================`);
    console.log(`[SERVER] Smart Food Ordering System running on: http://localhost:${PORT}`);
    console.log(`================================================================\n`);
  });
}

module.exports = app;
