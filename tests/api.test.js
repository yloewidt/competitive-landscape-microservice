import request from 'supertest';
import express from 'express';
import './setup.js';
import healthRoutes from '../src/routes/health.js';
import analysisRoutes from '../src/routes/analysis.js';
import jobsRoutes from '../src/routes/jobs.js';
import { authenticateApiKey } from '../src/middleware/auth.js';
import db from '../src/models/database.js';

describe('API Tests', () => {
  let app;

  beforeAll(async () => {
    // Initialize test database
    await db.init();
    
    // Set up Express app for testing
    app = express();
    app.use(express.json());
    app.use('/health', healthRoutes);
    app.use('/api/competitive-landscape', authenticateApiKey, analysisRoutes);
    app.use('/api/jobs', authenticateApiKey, jobsRoutes);
  });

  afterAll(async () => {
    await db.close();
  });

  describe('Health Check', () => {
    test('GET /health should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'competitive-landscape-microservice',
      });
    });

    test('GET /health/detailed should return detailed health check', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body).toMatchObject({
        status: expect.any(String),
        checks: {
          database: true,
          openai: true,
          cloudTasks: expect.any(Boolean),
        },
      });
    });
  });

  describe('Authentication', () => {
    test('Should reject requests without API key', async () => {
      const response = await request(app)
        .get('/api/competitive-landscape')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'API key required',
      });
    });

    test('Should reject requests with invalid API key', async () => {
      const response = await request(app)
        .get('/api/competitive-landscape')
        .set('X-API-Key', 'invalid-key')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Invalid API key',
      });
    });

    test('Should accept requests with valid API key', async () => {
      const response = await request(app)
        .get('/api/competitive-landscape')
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      expect(response.body).toHaveProperty('analyses');
    });
  });

  describe('Competitive Analysis Endpoints', () => {
    test('POST /api/competitive-landscape/analyze should queue analysis', async () => {
      const response = await request(app)
        .post('/api/competitive-landscape/analyze')
        .set('X-API-Key', 'test-api-key')
        .send({
          solutionDescription: 'Test solution for competitive analysis',
          industryId: 'test-industry',
        })
        .expect(202);

      expect(response.body).toMatchObject({
        message: 'Competitive analysis queued for processing',
        jobId: expect.any(String),
        status: 'pending',
      });
    });

    test('POST /api/competitive-landscape/analyze should validate input', async () => {
      const response = await request(app)
        .post('/api/competitive-landscape/analyze')
        .set('X-API-Key', 'test-api-key')
        .send({
          // Missing required solutionDescription
          industryId: 'test-industry',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('GET /api/competitive-landscape should return list of analyses', async () => {
      const response = await request(app)
        .get('/api/competitive-landscape')
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      expect(response.body).toMatchObject({
        analyses: expect.any(Array),
        pagination: {
          total: expect.any(Number),
          limit: 20,
          offset: 0,
        },
      });
    });

    test('GET /api/competitive-landscape/:id should return 404 for non-existent analysis', async () => {
      const response = await request(app)
        .get('/api/competitive-landscape/non-existent-id')
        .set('X-API-Key', 'test-api-key')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Analysis not found',
      });
    });
  });

  describe('Job Status Endpoints', () => {
    test('GET /api/jobs/:jobId should return 404 for non-existent job', async () => {
      const response = await request(app)
        .get('/api/jobs/non-existent-job')
        .set('X-API-Key', 'test-api-key')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Job not found',
      });
    });

    test('GET /api/jobs/:jobId should return job status', async () => {
      // First create a job
      await db.run(`
        INSERT INTO jobs (id, type, status, data, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, ['test-job-123', 'competitive_analysis', 'pending', '{}', new Date().toISOString()]);

      const response = await request(app)
        .get('/api/jobs/test-job-123')
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'test-job-123',
        type: 'competitive_analysis',
        status: 'pending',
      });
    });
  });
});