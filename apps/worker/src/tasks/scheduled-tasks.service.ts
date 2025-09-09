import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval, Timeout } from '@nestjs/schedule';

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

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
   * Run every day at midnight - useful for daily maintenance
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  handleCronDaily() {
    this.logger.log('Running scheduled task daily at midnight');
    // Add your daily task logic here
    // Example: Database maintenance, backup, analytics, etc.
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
   * Custom cron expression - every 15 minutes
   */
  @Cron('0 */15 * * * *')
  handleCustomCron() {
    this.logger.log('Running scheduled task every 15 minutes');
    // Add your custom schedule task logic here
    // Example: Sync data, check external services, etc.
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