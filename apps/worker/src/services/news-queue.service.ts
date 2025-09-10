import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ProcessedStory } from '../sources/hacker-news/hacker-news.service';
import { NewsJobData } from '../processors/news-processor';

@Injectable()
export class NewsQueueService {
  private readonly logger = new Logger(NewsQueueService.name);

  constructor(
    @InjectQueue('news-queue') private readonly newsQueue: Queue
  ) {}

  /**
   * Add a batch of news stories to the processing queue
   */
  async addNewsBatch(stories: ProcessedStory[], source: string): Promise<string> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const jobData: NewsJobData = {
      stories,
      source,
      batchId,
      timestamp: new Date().toISOString()
    };

    this.logger.log(`📤 Adding news batch ${batchId} to queue with ${stories.length} stories from ${source}`);

    const job = await this.newsQueue.add('process-news-batch', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    });

    this.logger.log(`✅ News batch ${batchId} queued with job ID: ${job.id}`);
    return job.id as string;
  }

  /**
   * Add a single story to the processing queue
   */
  async addSingleStory(story: ProcessedStory, source: string): Promise<string> {
    this.logger.log(`📤 Adding single story "${story.title}" to queue from ${source}`);

    const job = await this.newsQueue.add('process-single-story', {
      story,
      source
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    });

    this.logger.log(`✅ Single story queued with job ID: ${job.id}`);
    return job.id as string;
  }

  /**
   * Add a cleanup job to the queue
   */
  async addCleanupJob(olderThanDays: number = 30): Promise<string> {
    this.logger.log(`📤 Adding cleanup job for articles older than ${olderThanDays} days`);

    const job = await this.newsQueue.add('cleanup-old-articles', {
      olderThanDays
    }, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 5,
      removeOnFail: 3,
    });

    this.logger.log(`✅ Cleanup job queued with job ID: ${job.id}`);
    return job.id as string;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const waiting = await this.newsQueue.getWaiting();
    const active = await this.newsQueue.getActive();
    const completed = await this.newsQueue.getCompleted();
    const failed = await this.newsQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length
    };
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string) {
    return this.newsQueue.getJob(jobId);
  }

  /**
   * Get recent jobs
   */
  async getRecentJobs(limit: number = 10) {
    const [completed, failed] = await Promise.all([
      this.newsQueue.getCompleted(0, limit - 1),
      this.newsQueue.getFailed(0, limit - 1)
    ]);

    return {
      completed: completed.map(job => ({
        id: job.id,
        name: job.name,
        data: job.data,
        returnvalue: job.returnvalue,
        completedOn: job.finishedOn
      })),
      failed: failed.map(job => ({
        id: job.id,
        name: job.name,
        data: job.data,
        failedReason: job.failedReason,
        failedOn: job.finishedOn
      }))
    };
  }
}
