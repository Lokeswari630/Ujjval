const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Initialize express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const defaultDevOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174'
];

const configuredOrigins = [
  ...(process.env.FRONTEND_URLS || '').split(','),
  process.env.FRONTEND_URL || ''
]
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? configuredOrigins
  : Array.from(new Set([...defaultDevOrigins, ...configuredOrigins]));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));

// Rate limiting
const isProduction = process.env.NODE_ENV === 'production';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/health-prediction', require('./routes/healthPrediction'));
app.use('/api/pharmacy', require('./routes/pharmacy'));
app.use('/api/nlp', require('./routes/nlp'));
app.use('/api/priority', require('./routes/priority'));
app.use('/api/nlp-query', require('./routes/nlp-query'));
app.use('/api/pharmacist', require('./routes/pharmacist'));
app.use('/api/monitoring', require('./routes/monitoring'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const DEFAULT_PORT = Number(process.env.PORT) || 5000;
let server;

const startServer = (port) => {
  server = app.listen(port, () => {
    console.log(`
🏥 Smart Hospital Assistant Backend Server Running!
📍 Port: ${port}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🕒 Started at: ${new Date().toLocaleString()}
📖 API Documentation: http://localhost:${port}/api
    `);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && process.env.NODE_ENV !== 'production') {
      const nextPort = Number(port) + 1;
      console.warn(`Port ${port} is in use. Retrying on port ${nextPort}...`);
      return startServer(nextPort);
    }

    throw error;
  });
};

startServer(DEFAULT_PORT);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;
