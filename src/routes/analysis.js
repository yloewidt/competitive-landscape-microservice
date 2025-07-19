import express from 'express';
import Joi from 'joi';
import { CloudTasksService } from '../services/cloudTasksService.js';
import { CompetitiveLandscapeAnalyzer } from '../services/competitiveLandscapeAnalyzer.js';
import db from '../models/database.js';
import { logInfo, logError } from '../utils/logger.js';

const router = express.Router();
const cloudTasks = new CloudTasksService();
const analyzer = new CompetitiveLandscapeAnalyzer();

// Validation schemas
const analyzeSchema = Joi.object({
  solutionDescription: Joi.string().min(10).max(5000).required(),
  industryId: Joi.string().optional(),
  metadata: Joi.object().optional(),
});

const paginationSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

// POST /api/competitive-landscape/analyze
router.post('/analyze', async (req, res) => {
  try {
    const { error, value } = analyzeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { solutionDescription, industryId, metadata } = value;

    // Queue the analysis job
    const jobId = await cloudTasks.addJob('competitive_analysis', {
      solutionDescription,
      industryId,
      metadata: {
        ...metadata,
        userId: req.user?.id,
        requestedAt: new Date().toISOString(),
      },
    });

    logInfo('Competitive analysis queued', { jobId, industryId });

    res.status(202).json({
      message: 'Competitive analysis queued for processing',
      jobId,
      status: 'pending',
      statusUrl: `/api/jobs/${jobId}`,
    });
  } catch (error) {
    logError('Error queuing competitive analysis', error);
    res.status(500).json({ error: 'Failed to queue analysis' });
  }
});

// GET /api/competitive-landscape/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.get(`
      SELECT * FROM competitive_analyses 
      WHERE id = ?
    `, id);

    if (!result) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json({
      id: result.id,
      industryId: result.industry_id,
      solutionDescription: result.solution_description,
      results: JSON.parse(result.results),
      metadata: result.metadata ? JSON.parse(result.metadata) : {},
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    });
  } catch (error) {
    logError('Error fetching competitive landscape', error);
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
});

// GET /api/competitive-landscape
router.get('/', async (req, res) => {
  try {
    const { error, value } = paginationSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { limit, offset } = value;

    const analyses = await db.all(`
      SELECT id, industry_id, solution_description, created_at,
             json_extract(results, '$.analysisDate') as analysis_date,
             json_extract(results, '$.summary') as summary
      FROM competitive_analyses 
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const total = await db.get(`
      SELECT COUNT(*) as count FROM competitive_analyses
    `);

    res.json({
      analyses: analyses.map(a => ({
        id: a.id,
        industryId: a.industry_id,
        solutionDescription: a.solution_description,
        analysisDate: a.analysis_date,
        summary: a.summary,
        createdAt: a.created_at,
      })),
      pagination: {
        total: total.count,
        limit,
        offset,
        hasMore: offset + limit < total.count,
      },
    });
  } catch (error) {
    logError('Error fetching competitive analyses', error);
    res.status(500).json({ error: 'Failed to fetch analyses' });
  }
});

// GET /api/competitive-landscape/:id/competitors
router.get('/:id/competitors', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = paginationSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { limit, offset } = value;

    const competitors = await db.all(`
      SELECT * FROM competitors
      WHERE analysis_id = ?
      ORDER BY relevancy DESC
      LIMIT ? OFFSET ?
    `, [id, limit, offset]);

    const total = await db.get(`
      SELECT COUNT(*) as count FROM competitors
      WHERE analysis_id = ?
    `, id);

    res.json({
      competitors: competitors.map(c => ({
        id: c.id,
        name: c.name,
        relevancy: c.relevancy,
        details: JSON.parse(c.details || '{}'),
        strategicNote: c.strategic_note,
        createdAt: c.created_at,
      })),
      pagination: {
        total: total.count,
        limit,
        offset,
        hasMore: offset + limit < total.count,
      },
    });
  } catch (error) {
    logError('Error fetching competitors', error);
    res.status(500).json({ error: 'Failed to fetch competitors' });
  }
});

// POST /api/competitive-landscape/analyze-sync (for testing/development)
router.post('/analyze-sync', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Synchronous analysis not available in production' });
  }

  try {
    const { error, value } = analyzeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { solutionDescription, industryId, metadata } = value;

    logInfo('Running synchronous competitive analysis', { industryId });

    const result = await analyzer.analyzeCompetitiveLandscape(
      solutionDescription,
      industryId,
      metadata
    );

    res.json({
      message: 'Analysis completed',
      analysis: result,
    });
  } catch (error) {
    logError('Error in synchronous analysis', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

export default router;