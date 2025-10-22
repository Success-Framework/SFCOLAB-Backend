const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectMongo } = require('./db/mongoose');
const authRoutes = require('./routes/auth');
const ideationRoutes = require('./routes/ideation');
const startupRoutes = require('./routes/startup');
const knowledgeRoutes = require('./routes/knowledge');
const settingsRoutes = require('./routes/settings');
const { router: notificationRoutes } = require('./routes/notifications');
const profileRoutes = require('./routes/profile');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://yourdomain.com' 
];

const corsOptionsDelegate = (req, callback) => {
  let requestOrigin = req.header('Origin');

  // If no Origin header, fall back to Referer for safety
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

  const isAllowed = requestOrigin && allowedOrigins.includes(requestOrigin);
  const isLocalhost = requestOrigin && requestOrigin.includes('localhost:5173');

  const corsOptions = {
    origin: isAllowed || isLocalhost ? requestOrigin || true : false,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 204,
  };

  callback(null, corsOptions);
};

// ✅ Apply CORS globally (for all routes including file uploads)
app.use(cors(corsOptionsDelegate));
app.options('*', cors(corsOptionsDelegate));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: false, 
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, 
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

// Connect to MongoDB then start server
(async () => {
  try {
    const conn = await connectMongo();
    console.log(`🗄️  MongoDB connected: ${conn.host}`);

    app.listen(PORT, () => {
      console.log(`🚀 SFCollab Backend server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  }
})();

module.exports = app;
