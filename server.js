const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { initializeData } = require('./utils/dataPersistence');
const authRoutes = require('./routes/auth');
const ideationRoutes = require('./routes/ideation');
const startupRoutes = require('./routes/startup');
const knowledgeRoutes = require('./routes/knowledge');
const settingsRoutes = require('./routes/settings');
const { router: notificationRoutes } = require('./routes/notifications');
const profileRoutes = require('./routes/profile');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS with support for Referer-based allowance when Origin is missing
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://yourdomain.com']
  : ['http://localhost:5173', 'http://localhost:5174'];

const corsOptionsDelegate = (req, callback) => {
  let requestOrigin = req.header('Origin');

  if (!requestOrigin) {
    const refererHeader = req.header('Referer') || req.header('Referrer');
    if (refererHeader) {
      try {
        const refererUrl = new URL(refererHeader);
        requestOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      } catch (_) {
        requestOrigin = null;
      }
    }
  }

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    // Reflect the derived/received origin and allow credentials
    callback(null, { origin: requestOrigin, credentials: true });
  } else {
    // Disable CORS for non-whitelisted origins but keep credentials flag consistent
    callback(null, { origin: false, credentials: true });
  }
};

app.use(cors(corsOptionsDelegate));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'SFCollab Backend is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/ideation', ideationRoutes);
app.use('/api/startup', startupRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.errors
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Initialize data persistence
initializeData();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SFCollab Backend server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`💾 Data persistence: JSON file storage initialized`);
});

module.exports = app;
