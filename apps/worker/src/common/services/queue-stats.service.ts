import { Injectable, Logger } from '@nestjs/common';
import { QueueAdapterService } from './queue-adapter.service';
import { 
  QueueStats, 
  JobInfo, 
  QueueHealthStatus, 
  QueueCleanupResult,
  QueueManagementService 
} from '../interfaces/queue.interface';

@Injectable()
export class QueueStatsService implements QueueManagementService {
  private readonly logger = new Logger(QueueStatsService.name);

  constructor(private readonly queueAdapter: QueueAdapterService) {}

  /**
   * Get statistics for all queues
   */
  async getQueueStats(): Promise<QueueStats[]> {
    try {
      const queues = this.queueAdapter.getQueues();
      const stats = await Promise.all(
        queues.map(queue => this.getSingleQueueStats(queue))
      );

      this.logger.debug(`📊 Retrieved stats for ${stats.length} queues`);
      return stats;
    } catch (error) {
      this.logger.error(`❌ Failed to get queue stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get statistics for a single queue
   */
  private async getSingleQueueStats(queue: any): Promise<QueueStats> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      name: queue.name,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      total: waiting.length + active.length + completed.length + failed.length + delayed.length,
    };
  }

  /**
   * Get recent jobs from all queues
   */
  async getRecentJobs(limit: number = 10): Promise<{ [queueName: string]: JobInfo[] }> {
    try {
      const queues = this.queueAdapter.getQueues();
      const jobsByQueue: { [queueName: string]: JobInfo[] } = {};

      await Promise.all(
        queues.map(async queue => {
          const jobs = await queue.getJobs(['completed', 'failed', 'active', 'waiting'], 0, limit - 1);
          jobsByQueue[queue.name] = await Promise.all(
            jobs.map(async job => this.mapJobToInfo(job))
          );
        })
      );

      this.logger.debug(`📋 Retrieved recent jobs from ${Object.keys(jobsByQueue).length} queues`);
      return jobsByQueue;
    } catch (error) {
      this.logger.error(`❌ Failed to get recent jobs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Map BullMQ job to JobInfo interface
   */
  private async mapJobToInfo(job: any): Promise<JobInfo> {
    return {
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      state: await job.getState(),
      createdAt: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    };
  }

  /**
   * Clean old completed and failed jobs
   */
  async cleanOldJobs(olderThanDays: number = 7): Promise<QueueCleanupResult> {
    try {
      const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
      const queues = this.queueAdapter.getQueues();
      
      let totalCleaned = 0;
      
      await Promise.all(
        queues.map(async queue => {
          const [completedCleaned, failedCleaned] = await Promise.all([
            queue.clean(cutoffTime, 100, 'completed'),
            queue.clean(cutoffTime, 100, 'failed'),
          ]);
          
          totalCleaned += completedCleaned.length + failedCleaned.length;
        })
      );

      this.logger.log(`🧹 Cleaned ${totalCleaned} old jobs (older than ${olderThanDays} days)`);
      
      return {
        cleaned: totalCleaned,
        olderThanDays,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to clean old jobs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get health status of all queues
   */
  async getHealthStatus(): Promise<QueueHealthStatus> {
    try {
      const stats = await this.getQueueStats();
      const totalQueues = stats.length;
      
      return {
        status: 'healthy',
        message: 'All queues are responding',
        queues: totalQueues,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Queue health check failed',
        queues: 0,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Get detailed statistics for a specific queue
   */
  async getQueueStatsByName(queueName: string): Promise<QueueStats | null> {
    try {
      const queue = this.queueAdapter.getQueueByName(queueName);
      if (!queue) {
        this.logger.warn(`⚠️ Queue not found: ${queueName}`);
        return null;
      }

      return await this.getSingleQueueStats(queue);
    } catch (error) {
      this.logger.error(`❌ Failed to get stats for queue ${queueName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get jobs by state for a specific queue
   */
  async getJobsByState(queueName: string, states: string[], limit: number = 10): Promise<JobInfo[]> {
    try {
      const queue = this.queueAdapter.getQueueByName(queueName);
      if (!queue) {
        throw new Error(`Queue not found: ${queueName}`);
      }

      const jobs = await queue.getJobs(states as any, 0, limit - 1);
      return await Promise.all(jobs.map(job => this.mapJobToInfo(job)));
    } catch (error) {
      this.logger.error(`❌ Failed to get jobs by state for ${queueName}: ${error.message}`);
      throw error;
    }
  }
}
