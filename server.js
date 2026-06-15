const express = require('express');
const cookieSession = require('cookie-session');
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

// Session management — cookie-session stores session data inside a signed
// browser cookie. Works across all Vercel serverless instances because
// there is no server-side store to lose between cold starts.
app.use(cookieSession({
  name: 'sid',
  keys: [process.env.SESSION_SECRET || 'super_secret_cafeteria_token_key_12345'],
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
  httpOnly: true,
  secure: false,       // false — Vercel handles HTTPS at edge, internal traffic is HTTP
  sameSite: 'lax',
  overwrite: true
}));

// cookie-session does not have a save() method — shim it so existing
// route code that calls req.session.save(cb) does not crash
app.use((req, res, next) => {
  if (req.session && typeof req.session.save !== 'function') {
    req.session.save = (cb) => { if (cb) cb(null); };
  }
  next();
});

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

// Health check — shows DB mode for debugging
app.get('/api/health', (req, res) => {
  const db = require('./db');
  res.json({
    status: 'ok',
    dbMode: db.getDbMode(),
    isFallback: db.isFallback(),
    hasDatabase: !!process.env.DATABASE_URL,
    timestamp: new Date().toISOString()
  });
});

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

// Admin HTML Views — auth is enforced client-side by admin.js (Admin.init())
// which checks /api/auth/me and redirects if not admin. The API routes
// themselves are protected server-side by the isAdmin middleware.
app.get('/admin', sendHTML('admin/index.html'));
app.get('/admin/foods', sendHTML('admin/foods.html'));
app.get('/admin/orders', sendHTML('admin/orders.html'));
app.get('/admin/categories', sendHTML('admin/categories.html'));
app.get('/admin/reports', sendHTML('admin/reports.html'));

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
