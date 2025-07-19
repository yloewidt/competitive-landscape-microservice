import express from 'express';
import { CloudTasksService } from '../services/cloudTasksService.js';
import { logError } from '../utils/logger.js';

const router = express.Router();
const cloudTasks = new CloudTasksService();

// GET /api/jobs/:jobId
router.get('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const jobStatus = await cloudTasks.getJobStatus(jobId);
    
    // Add result URLs for completed analyses
    if (jobStatus.type === 'competitive_analysis' && 
        jobStatus.status === 'completed' && 
        jobStatus.result?.id) {
      jobStatus.analysisUrl = `/api/competitive-landscape/${jobStatus.result.id}`;
      jobStatus.viewUrl = `/view-analysis.html?id=${jobStatus.result.id}`;
    }
    
    res.json(jobStatus);
  } catch (error) {
    if (error.message === 'Job not found') {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    logError('Error fetching job status', error);
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

export default router;