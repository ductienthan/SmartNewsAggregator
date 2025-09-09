import { Controller, Get, Post, Query, Param } from '@nestjs/common';
import { QueueStatsService } from '../common/services/queue-stats.service';
import { QueueAdapterService } from '../common/services/queue-adapter.service';

@Controller({
  version: '1',
  path: 'queues'
})
export class QueueManagementController {
  constructor(
    private readonly queueStatsService: QueueStatsService,
    private readonly queueAdapter: QueueAdapterService,
  ) {}

  /**
   * Get statistics for all queues
   */
  @Get('stats')
  async getQueueStats() {
    const stats = await this.queueStatsService.getQueueStats();
    return {
      message: 'Queue statistics retrieved successfully',
      queues: stats,
      totalQueues: stats.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get statistics for a specific queue
   */
  @Get('stats/:queueName')
  async getQueueStatsByName(@Param('queueName') queueName: string) {
    const stats = await this.queueStatsService.getQueueStatsByName(queueName);
    
    if (!stats) {
      return {
        message: `Queue '${queueName}' not found`,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      message: `Statistics for queue '${queueName}' retrieved successfully`,
      queue: stats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get recent jobs from all queues
   */
  @Get('jobs')
  async getRecentJobs(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    const jobs = await this.queueStatsService.getRecentJobs(limitNumber);
    
    return {
      message: 'Recent jobs retrieved successfully',
      jobs,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get jobs by state for a specific queue
   */
  @Get('jobs/:queueName')
  async getJobsByQueue(
    @Param('queueName') queueName: string,
    @Query('states') states?: string,
    @Query('limit') limit?: string,
  ) {
    const statesArray = states ? states.split(',') : ['completed', 'failed', 'active', 'waiting'];
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    
    const jobs = await this.queueStatsService.getJobsByState(queueName, statesArray, limitNumber);
    
    return {
      message: `Jobs for queue '${queueName}' retrieved successfully`,
      queue: queueName,
      states: statesArray,
      jobs,
      count: jobs.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Clean old completed and failed jobs
   */
  @Post('clean')
  async cleanOldJobs(@Query('days') days?: string) {
    const daysNumber = days ? parseInt(days, 10) : 7;
    const result = await this.queueStatsService.cleanOldJobs(daysNumber);
    
    return {
      message: 'Old jobs cleaned successfully',
      ...result,
    };
  }

  /**
   * Health check for all queues
   */
  @Get('health')
  async getHealth() {
    const health = await this.queueStatsService.getHealthStatus();
    
    return {
      ...health,
      message: health.status === 'healthy' ? 'All queues are healthy' : 'Queue health check failed',
    };
  }

  /**
   * Get list of all registered queues
   */
  @Get('list')
  async getQueueList() {
    const queueNames = this.queueAdapter.getQueueNames();
    const queueCount = this.queueAdapter.getQueueCount();
    
    return {
      message: 'Queue list retrieved successfully',
      queues: queueNames,
      count: queueCount,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get detailed information about a specific queue
   */
  @Get('info/:queueName')
  async getQueueInfo(@Param('queueName') queueName: string) {
    const queue = this.queueAdapter.getQueueByName(queueName);
    
    if (!queue) {
      return {
        message: `Queue '${queueName}' not found`,
        timestamp: new Date().toISOString(),
      };
    }

    const stats = await this.queueStatsService.getQueueStatsByName(queueName);
    
    return {
      message: `Queue information for '${queueName}' retrieved successfully`,
      queue: {
        name: queue.name,
        isPaused: await queue.isPaused(),
        stats,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
