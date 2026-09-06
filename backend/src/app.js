const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors());

// Rate limiting (Skip during automated testing)
if (process.env.NODE_ENV !== 'test') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        message: 'Too many requests from this IP, please try again after 15 minutes'
      }
    }
  });
  app.use(limiter);
}

// Body parser
app.use(express.json({ limit: '10kb' }));

// Mount API routes (both / and /api/v1 for convenience)
app.use('/api/v1', routes);
app.use('/', routes);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
});

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;
