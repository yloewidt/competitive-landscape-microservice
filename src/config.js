import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3700', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  
  database: {
    type: process.env.DATABASE_TYPE || 'sqlite',
    sqlite: {
      path: process.env.DATABASE_PATH || './competitive_landscape.db',
    },
    mysql: {
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQL_USER || '',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'competitive_analysis_db',
    },
    cloudSql: {
      connectionName: process.env.CLOUD_SQL_CONNECTION_NAME || '',
      user: process.env.CLOUD_SQL_USER || '',
      password: process.env.CLOUD_SQL_PASSWORD || '',
      database: process.env.CLOUD_SQL_DATABASE || 'competitive_analysis_db',
    },
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  
  googleCloud: {
    projectId: process.env.GCP_PROJECT_ID || '',
    region: process.env.GCP_REGION || 'us-central1',
    cloudTasks: {
      queue: process.env.CLOUD_TASKS_QUEUE || 'competitive-analysis',
      serviceUrl: process.env.CLOUD_TASKS_SERVICE_URL || '',
      serviceAccountEmail: process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL || '',
    },
  },
  
  security: {
    apiKey: process.env.API_KEY || '',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
  },
  
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
};

// Validate required configuration
export function validateConfig() {
  const errors = [];
  
  if (!config.openai.apiKey) {
    errors.push('OPENAI_API_KEY is required');
  }
  
  if (config.database.type === 'mysql') {
    if (!config.database.mysql.user || !config.database.mysql.password) {
      errors.push('MySQL credentials are required when DATABASE_TYPE=mysql');
    }
  }
  
  if (process.env.NODE_ENV === 'production') {
    if (!config.googleCloud.projectId) {
      errors.push('GCP_PROJECT_ID is required in production');
    }
    if (!config.googleCloud.cloudTasks.serviceUrl) {
      errors.push('CLOUD_TASKS_SERVICE_URL is required in production');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}