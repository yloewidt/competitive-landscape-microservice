import { config } from '../config.js';
import { logWarn } from '../utils/logger.js';

// Simple API key authentication middleware
export const authenticateApiKey = (req, res, next) => {
  // Skip auth in test/development if no API key is configured
  if (!config.security.apiKey && config.server.nodeEnv !== 'production') {
    req.user = { id: 'dev-user' };
    return next();
  }

  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  if (apiKey !== config.security.apiKey) {
    logWarn('Invalid API key attempt', { 
      ip: req.ip,
      userAgent: req.headers['user-agent'] 
    });
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Set a basic user object
  req.user = { id: 'api-user' };
  next();
};

// Optional: Bearer token authentication for future OAuth integration
export const authenticateBearer = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Bearer token required' });
  }

  const token = authHeader.substring(7);
  
  // TODO: Implement actual token validation
  // For now, just check if token exists
  if (!token) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = { id: 'bearer-user' };
  next();
};