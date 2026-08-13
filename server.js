const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://your-domain.vercel.app' : '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve favicon
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'assets', 'images', 'favicon.ico'));
});

// Serve logo
app.get('/logo', (req, res) => {
  res.redirect('https://i.postimg.cc/BbDyR0CR/lwjw.jpg');
});

// ==================================================
// API Routes
// ==================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================================================
// AUTH API Routes
// ==================================================

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'يرجى إدخال اسم المستخدم وكلمة المرور'
    });
  }

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      user: { username: ADMIN_USERNAME, role: 'admin' }
    });
  } else {
    return res.status(401).json({
      success: false,
      message: 'اسم المستخدم أو كلمة المرور غير صحيحة'
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'تم تسجيل الخروج' });
});

// DEVELOPMENT MODE: Always return success for verification
// REPLACE THIS WITH REAL JWT VERIFICATION IN PRODUCTION
app.get('/api/auth/verify', (req, res) => {
  // In development, always return success
  // In production, check JWT token from cookie/header
  res.json({ 
    success: true, 
    user: { username: 'admin', role: 'admin' }
  });
});

// ==================================================
// Catch-all route for SPA - must be after API routes
// ==================================================
app.get('*', (req, res) => {
  // Check if request is for an API route
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  // For all other routes, serve the appropriate HTML file
  // Clean routing - map routes to HTML files
  const routeMap = {
    '/': 'index.html',
    '/login': 'login.html',
    '/dashboard': 'dashboard.html',
    '/church': 'church.html',
    '/masses': 'masses.html',
    '/services': 'services.html',
    '/events': 'events.html',
    '/news': 'news.html',
    '/sermons': 'sermons.html',
    '/gallery': 'gallery.html',
    '/priests': 'priests.html',
    '/saints': 'saints.html',
    '/faq': 'faq.html',
    '/search': 'search.html',
    '/prayer-request': 'prayer-request.html',
    '/contact': 'contact.html'
  };

  // Remove trailing slash if present
  let cleanPath = req.path.replace(/\/+$/, '');

  // If path is empty or just '/', serve index
  if (cleanPath === '') cleanPath = '/';

  const file = routeMap[cleanPath];
  if (file) {
    res.sendFile(path.join(__dirname, 'public', file));
  } else {
    // Check if it's a dynamic page route (e.g., /pages/...)
    if (cleanPath.startsWith('/pages/')) {
      // For dynamic pages, serve a page template or handle via API
      // For now, serve the 404 page
      res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    } else {
      res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
