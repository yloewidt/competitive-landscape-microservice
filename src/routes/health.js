import express from 'express';
import db from '../models/database.js';
import { config } from '../config.js';

const router = express.Router();

// GET /health
router.get('/', async (req, res) => {
  try {
    // Check database connection
    await db.get('SELECT 1');
    
    res.json({
      status: 'healthy',
      service: 'competitive-landscape-microservice',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: config.server.nodeEnv,
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'competitive-landscape-microservice',
      error: 'Database connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /health/detailed
router.get('/detailed', async (req, res) => {
  const checks = {
    database: false,
    openai: !!config.openai.apiKey,
    cloudTasks: false,
  };
  
  try {
    // Check database
    await db.get('SELECT 1');
    checks.database = true;
    
    // Check Cloud Tasks configuration
    if (config.googleCloud.projectId && config.googleCloud.cloudTasks.queue) {
      checks.cloudTasks = true;
    }
    
    const healthy = Object.values(checks).every(v => v);
    
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'degraded',
      checks,
      config: {
        databaseType: config.database.type,
        environment: config.server.nodeEnv,
        cloudTasksEnabled: config.server.nodeEnv === 'production' || process.env.USE_CLOUD_TASKS === 'true',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      checks,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;