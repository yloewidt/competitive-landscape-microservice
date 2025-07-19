import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config, validateConfig } from './config.js';
import { logInfo, logError } from './utils/logger.js';
import { authenticateApiKey } from './middleware/auth.js';
import db from './models/database.js';

// Import routes
import healthRoutes from './routes/health.js';
import analysisRoutes from './routes/analysis.js';
import jobsRoutes from './routes/jobs.js';

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimiting.windowMs,
  max: config.rateLimiting.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.security.corsOrigin,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use('/api/', limiter);

// Routes
app.use('/health', healthRoutes);
app.use('/api/competitive-landscape', authenticateApiKey, analysisRoutes);
app.use('/api/jobs', authenticateApiKey, jobsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logError('Unhandled error', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.server.nodeEnv === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Server startup
async function start() {
  try {
    // Validate configuration
    validateConfig();
    
    // Initialize database
    await db.init();
    
    // Start server
    const server = app.listen(config.server.port, () => {
      logInfo(`Competitive Landscape Microservice started`, {
        port: config.server.port,
        environment: config.server.nodeEnv,
        databaseType: config.database.type,
        cloudTasksEnabled: config.server.nodeEnv === 'production' || process.env.USE_CLOUD_TASKS === 'true',
      });
      
      console.log(`🚀 Server running on http://localhost:${config.server.port}`);
      console.log(`📊 Health check: http://localhost:${config.server.port}/health`);
      console.log(`🔐 API endpoints require X-API-Key header`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logInfo('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logInfo('HTTP server closed');
      });
      
      await db.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logInfo('SIGINT received, shutting down gracefully');
      server.close(() => {
        logInfo('HTTP server closed');
      });
      
      await db.close();
      process.exit(0);
    });

  } catch (error) {
    logError('Failed to start server', error);
    console.error('💥 Server failed to start:', error.message);
    process.exit(1);
  }
}

// Start the server
start();