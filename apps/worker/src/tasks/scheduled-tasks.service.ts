import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval, Timeout } from '@nestjs/schedule';
import { ContentQueueService } from '../services/content-queue.service';

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(private readonly contentQueueService: ContentQueueService) {}

  /**
   * Run every minute - useful for health checks, monitoring, etc.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  handleCronEveryMinute() {
    this.logger.log('Running scheduled task every minute');
    // Add your periodic task logic here
    // Example: Check system health, send heartbeat, etc.
  }

  /**
   * Run every hour - useful for data cleanup, reports, etc.
   */
  @Cron(CronExpression.EVERY_HOUR)
  handleCronEveryHour() {
    this.logger.log('Running scheduled task every hour');
    // Add your hourly task logic here
    // Example: Clean up old logs, generate reports, etc.
  }

  /**
   * Run every day at midnight - retry failed content processing
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCronDaily() {
    this.logger.log('Running scheduled task daily at midnight');
    try {
      // Retry failed content processing jobs
      const jobs = await this.contentQueueService.queueFailedArticlesForRetry(50);
      if (jobs.length > 0) {
        this.logger.log(`🔄 Queued ${jobs.length} failed articles for retry`);
      }
      
      // Clean up old jobs
      await this.contentQueueService.cleanupOldJobs();
    } catch (error) {
      this.logger.error(`❌ Failed to retry failed articles: ${error.message}`);
    }
  }

  /**
   * Run every 30 seconds using interval
   */
  @Interval(30000)
  handleInterval() {
    this.logger.log('Running scheduled task every 30 seconds');
    // Add your interval task logic here
    // Example: Check queue status, monitor resources, etc.
  }

  /**
   * Run once after 5 seconds when the service starts
   */
  @Timeout(5000)
  handleTimeout() {
    this.logger.log('Running scheduled task 5 seconds after startup');
    // Add your startup task logic here
    // Example: Initialize services, warm up caches, etc.
  }

  /**
   * Custom cron expression - every 15 minutes - queue articles for content processing
   */
  @Cron('0 */15 * * * *')
  async handleCustomCron() {
    this.logger.log('Running scheduled task every 15 minutes');
    try {
      // Queue pending articles for content processing (reduced to avoid overwhelming AI services)
      const jobs = await this.contentQueueService.queuePendingArticles(5);
      if (jobs.length > 0) {
        this.logger.log(`📝 Queued ${jobs.length} articles for content processing`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to queue articles for content processing: ${error.message}`);
    }
  }

  /**
   * Run every weekday at 9 AM
   */
  @Cron('0 9 * * 1-5')
  handleWeekdayMorning() {
    this.logger.log('Running scheduled task every weekday at 9 AM');
    // Add your weekday morning task logic here
    // Example: Send daily digest, start business processes, etc.
  }
} 