import express from 'express';
import { CompetitiveLandscapeAnalyzer } from './services/competitiveLandscapeAnalyzer.js';
import { CloudTasksService } from './services/cloudTasksService.js';
import db from './models/database.js';
import { logInfo, logError } from './utils/logger.js';
import { config } from './config.js';

const app = express();
app.use(express.json());

// Initialize services
const analyzer = new CompetitiveLandscapeAnalyzer();
const cloudTasks = new CloudTasksService();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    service: 'competitive-landscape-worker',
    timestamp: new Date().toISOString()
  });
});

// Process job endpoint - called by Cloud Tasks
app.post('/process-job', async (req, res) => {
  const { jobId, type, data } = req.body;
  
  try {
    logInfo(`Processing Cloud Task job: ${jobId}, type: ${type}`);
    
    // Update job status to running
    await cloudTasks.updateJobStatus(jobId, 'running');
    
    // Process based on job type
    let result;
    switch (type) {
      case 'competitive_analysis':
        result = await processCompetitiveAnalysis(data);
        break;
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
    
    // Update job status to completed
    await cloudTasks.updateJobStatus(jobId, 'completed', { result });
    
    logInfo(`Job ${jobId} completed successfully`);
    res.status(200).json({ success: true, jobId });
    
  } catch (error) {
    logError(`Job ${jobId} failed:`, error);
    
    // Update job status to failed
    await cloudTasks.updateJobStatus(jobId, 'failed', { error: error.message });
    
    // Return 200 to prevent Cloud Tasks retry for application errors
    res.status(200).json({ 
      success: false, 
      jobId, 
      error: error.message 
    });
  }
});

async function processCompetitiveAnalysis(data) {
  const { solutionDescription, industryId, metadata } = data;
  
  logInfo(`Starting competitive analysis for: ${solutionDescription.substring(0, 50)}...`);
  
  const result = await analyzer.analyzeCompetitiveLandscape(
    solutionDescription,
    industryId,
    metadata
  );
  
  logInfo(`Competitive analysis completed. ID: ${result.id}`);
  
  return result;
}

// Initialize and start worker
async function startWorker() {
  try {
    // Initialize database
    await db.init();
    logInfo('Worker database initialized successfully');
    
    // Start server
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      logInfo(`Cloud Worker listening on port ${PORT}`);
      console.log(`🔧 Worker running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logError('Failed to initialize worker:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logInfo('Worker received SIGTERM, shutting down gracefully');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logInfo('Worker received SIGINT, shutting down gracefully');
  await db.close();
  process.exit(0);
});

// Start the worker
startWorker();