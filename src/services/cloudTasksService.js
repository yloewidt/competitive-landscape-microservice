import { CloudTasksClient } from '@google-cloud/tasks';
import { config } from '../config.js';
import { logInfo, logError } from '../utils/logger.js';
import db from '../models/database.js';

export class CloudTasksService {
  constructor() {
    this.client = new CloudTasksClient();
    this.projectId = config.googleCloud.projectId;
    this.location = config.googleCloud.region;
    this.queue = config.googleCloud.cloudTasks.queue;
    this.serviceUrl = config.googleCloud.cloudTasks.serviceUrl;
    this.serviceAccountEmail = config.googleCloud.cloudTasks.serviceAccountEmail;
  }

  async createTask(jobId, jobData) {
    try {
      const parent = this.client.queuePath(this.projectId, this.location, this.queue);
      
      const task = {
        httpRequest: {
          httpMethod: 'POST',
          url: `${this.serviceUrl}/process-job`,
          headers: {
            'Content-Type': 'application/json',
          },
          body: Buffer.from(JSON.stringify({
            jobId,
            type: jobData.type,
            data: jobData.data,
          })).toString('base64'),
        },
      };

      // Add service account for authentication
      if (this.serviceAccountEmail) {
        task.httpRequest.oidcToken = {
          serviceAccountEmail: this.serviceAccountEmail,
        };
      }

      // Set task to execute in 2 seconds (to ensure job is saved in DB first)
      const seconds = 2;
      task.scheduleTime = {
        seconds: Math.floor(Date.now() / 1000) + seconds,
      };

      const request = { parent, task };
      const [response] = await this.client.createTask(request);
      
      logInfo('Created Cloud Task', {
        jobId,
        taskName: response.name,
        queue: this.queue,
      });

      return response.name;
    } catch (error) {
      logError('Failed to create Cloud Task', error, { jobId });
      throw error;
    }
  }

  async addJob(type, data) {
    const jobId = Date.now().toString();
    
    try {
      // Store job in database first
      await db.run(`
        INSERT INTO jobs (id, type, status, data, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [
        jobId,
        type,
        'pending',
        JSON.stringify(data),
        new Date().toISOString(),
      ]);

      // Create Cloud Task
      if (config.server.nodeEnv === 'production' || process.env.USE_CLOUD_TASKS === 'true') {
        await this.createTask(jobId, { type, data });
      } else {
        logInfo('Cloud Tasks disabled in development mode', { jobId });
      }

      return jobId;
    } catch (error) {
      // Mark job as failed if Cloud Task creation fails
      await db.run(`
        UPDATE jobs SET status = ?, error = ?
        WHERE id = ?
      `, ['failed', error.message, jobId]);
      
      throw error;
    }
  }

  async getJobStatus(jobId) {
    const job = await db.get(`
      SELECT * FROM jobs WHERE id = ?
    `, jobId);

    if (!job) {
      throw new Error('Job not found');
    }

    return {
      id: job.id,
      type: job.type,
      status: job.status,
      data: job.data ? JSON.parse(job.data) : null,
      result: job.result ? JSON.parse(job.result) : null,
      error: job.error,
      created_at: job.created_at,
      started_at: job.started_at,
      completed_at: job.completed_at,
    };
  }

  async updateJobStatus(jobId, status, updates = {}) {
    const fields = ['status = ?'];
    const values = [status];

    if (updates.result) {
      fields.push('result = ?');
      values.push(JSON.stringify(updates.result));
    }

    if (updates.error) {
      fields.push('error = ?');
      values.push(updates.error);
    }

    if (status === 'running') {
      fields.push('started_at = ?');
      values.push(new Date().toISOString());
    } else if (status === 'completed' || status === 'failed') {
      fields.push('completed_at = ?');
      values.push(new Date().toISOString());
    }

    values.push(jobId);

    await db.run(`
      UPDATE jobs SET ${fields.join(', ')}
      WHERE id = ?
    `, values);
  }
}