import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NewsStorageService } from '../database/news-storage.service';

export interface ContentProcessingJobData {
  articleId: string;
  url: string;
  title: string;
}

@Injectable()
export class ContentQueueService {
  private readonly logger = new Logger(ContentQueueService.name);

  constructor(
    @InjectQueue('content-queue') private readonly contentQueue: Queue,
    private readonly newsStorageService: NewsStorageService,
  ) {}

  /**
   * Queue a single article for content processing
   */
  async queueArticleForProcessing(articleId: string, url: string, title: string) {
    try {
      const job = await this.contentQueue.add(
        'process-article-content',
        { articleId, url, title } as ContentProcessingJobData,
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000, // Increased delay for retries
          },
          removeOnComplete: 10,
          removeOnFail: 5,
          delay: Math.random() * 10000, // Random delay up to 10 seconds to spread out requests
        }
      );

      this.logger.log(`📝 Queued article for content processing: "${title}" (Job: ${job.id})`);
      return job;
    } catch (error) {
      this.logger.error(`❌ Failed to queue article for processing: ${error.message}`);
      throw error;
    }
  }

  /**
   * Queue multiple articles for content processing
   */
  async queueArticlesForProcessing(articles: Array<{ id: string; url: string; title: string }>) {
    const jobs: any[] = [];
    
    for (const article of articles) {
      try {
        const job = await this.queueArticleForProcessing(article.id, article.url, article.title);
        jobs.push(job);
      } catch (error) {
        this.logger.error(`❌ Failed to queue article "${article.title}": ${error.message}`);
      }
    }

    this.logger.log(`📝 Queued ${jobs.length}/${articles.length} articles for content processing`);
    return jobs;
  }

  /**
   * Queue articles that need content processing
   */
  async queuePendingArticles(limit: number = 50) {
    try {
      const articles = await this.newsStorageService.getArticlesForContentProcessing(limit);
      
      if (articles.length === 0) {
        this.logger.log('📝 No articles pending content processing');
        return [];
      }

      this.logger.log(`📝 Found ${articles.length} articles pending content processing`);
      
      const jobs = await this.queueArticlesForProcessing(
        articles.map(article => ({
          id: article.id,
          url: article.url,
          title: article.title,
        }))
      );

      return jobs;
    } catch (error) {
      this.logger.error(`❌ Failed to queue pending articles: ${error.message}`);
      throw error;
    }
  }

  /**
   * Queue failed articles for retry
   */
  async queueFailedArticlesForRetry(limit: number = 25) {
    try {
      const articles = await this.newsStorageService.getFailedProcessingArticles(limit);
      
      if (articles.length === 0) {
        this.logger.log('📝 No failed articles to retry');
        return [];
      }

      this.logger.log(`📝 Found ${articles.length} failed articles to retry`);
      
      const jobs = await this.queueArticlesForProcessing(
        articles.map(article => ({
          id: article.id,
          url: article.url,
          title: article.title,
        }))
      );

      return jobs;
    } catch (error) {
      this.logger.error(`❌ Failed to queue failed articles for retry: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      const waiting = await this.contentQueue.getWaiting();
      const active = await this.contentQueue.getActive();
      const completed = await this.contentQueue.getCompleted();
      const failed = await this.contentQueue.getFailed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get queue stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean up old jobs
   */
  async cleanupOldJobs() {
    try {
      await this.contentQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'); // 24 hours
      await this.contentQueue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed'); // 7 days
      
      this.logger.log('🧹 Cleaned up old content processing jobs');
    } catch (error) {
      this.logger.error(`❌ Failed to cleanup old jobs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Pause the queue
   */
  async pauseQueue() {
    await this.contentQueue.pause();
    this.logger.log('⏸️ Content processing queue paused');
  }

  /**
   * Resume the queue
   */
  async resumeQueue() {
    await this.contentQueue.resume();
    this.logger.log('▶️ Content processing queue resumed');
  }
}
