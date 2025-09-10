import { Controller, Post, Get, Query } from '@nestjs/common';
import { NewsSchedulerService } from '../tasks/news-scheduler.service';
import { ScheduledTasksService } from '../tasks/scheduled-tasks.service';
import { HackerNewsService } from '../sources';
import { NewsStorageService } from '../database/news-storage.service';

@Controller({
  version: '1',
  path: 'scheduler'
})
export class SchedulerController {
  constructor(
    private readonly newsSchedulerService: NewsSchedulerService,
    private readonly scheduledTasksService: ScheduledTasksService,
    private readonly hackerNewsService: HackerNewsService,
    private readonly newsStorageService: NewsStorageService
  ) {}

  @Post('news/trigger')
  async triggerNewsAggregation() {
    await this.newsSchedulerService.triggerNewsAggregation();
    
    return {
      message: 'News aggregation triggered successfully',
      timestamp: new Date().toISOString()
    };
  }

  @Get('news/status')
  async getNewsSchedulerStatus() {
    const status = this.newsSchedulerService.getSchedulerStatus();
    
    return {
      ...status,
      schedule: 'Every 30 minutes',
      nextRun: status.nextRun.toISOString(),
      lastRun: status.lastRun?.toISOString() || null
    };
  }

  @Get('status')
  async getAllSchedulerStatuses() {
    const newsStatus = this.newsSchedulerService.getSchedulerStatus();
    
    return {
      newsScheduler: {
        isRunning: newsStatus.isRunning,
        nextRun: newsStatus.nextRun.toISOString(),
        schedule: 'Every 30 minutes'
      },
      systemTasks: {
        everyMinute: 'Every minute',
        everyHour: 'Every hour',
        daily: 'Daily at midnight',
        every30Seconds: 'Every 30 seconds',
        startup: '5 seconds after startup',
        every15Minutes: 'Every 15 minutes',
        weekdays: 'Weekdays at 9 AM'
      }
    };
  }

  @Get('sources/stats')
  async getNewsSourceStats() {
    return this.newsSchedulerService.getNewsSourceStats();
  }

  @Get('database/stats')
  async getDatabaseStats() {
    return this.newsSchedulerService.getDatabaseStats();
  }

  @Get('database/recent')
  async getRecentArticles(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    const articles = await this.newsSchedulerService.getRecentArticles(limitNumber);
    return {
      message: 'Recent articles retrieved successfully',
      count: articles.length,
      articles
    };
  }

  @Get('queue/stats')
  async getQueueStats() {
    return this.newsSchedulerService.getQueueStats();
  }

  @Get('queue/jobs')
  async getRecentJobs(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    const jobs = await this.newsSchedulerService.getRecentJobs(limitNumber);
    return {
      message: 'Recent jobs retrieved successfully',
      jobs
    };
  }

  @Post('sources/hacker-news/test')
  async testHackerNewsSource() {
    try {
      const stories = await this.hackerNewsService.fetchAllStories();
      
      return {
        message: 'Hacker News source test successful',
        timestamp: new Date().toISOString(),
        stats: {
          total: stories.top.length + stories.best.length + stories.new.length,
          top: stories.top.length,
          best: stories.best.length,
          new: stories.new.length
        },
        sampleStories: {
          top: stories.top.slice(0, 3).map(s => ({ title: s.title, author: s.author, score: s.score })),
          best: stories.best.slice(0, 3).map(s => ({ title: s.title, author: s.author, score: s.score })),
          new: stories.new.slice(0, 3).map(s => ({ title: s.title, author: s.author, score: s.score }))
        }
      };
    } catch (error) {
      return {
        message: 'Hacker News source test failed',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  @Get('sources/hacker-news/top')
  async getHackerNewsTopStories() {
    try {
      const stories = await this.hackerNewsService.fetchTopStories();
      return {
        message: 'Top stories fetched successfully',
        count: stories.length,
        stories: stories.slice(0, 10) // Return first 10 stories
      };
    } catch (error) {
      return {
        message: 'Failed to fetch top stories',
        error: error.message
      };
    }
  }

  @Get('sources/hacker-news/best')
  async getHackerNewsBestStories() {
    try {
      const stories = await this.hackerNewsService.fetchBestStories();
      return {
        message: 'Best stories fetched successfully',
        count: stories.length,
        stories: stories.slice(0, 10) // Return first 10 stories
      };
    } catch (error) {
      return {
        message: 'Failed to fetch best stories',
        error: error.message
      };
    }
  }

  @Get('sources/hacker-news/new')
  async getHackerNewsNewStories() {
    try {
      const stories = await this.hackerNewsService.fetchNewStories();
      return {
        message: 'New stories fetched successfully',
        count: stories.length,
        stories: stories.slice(0, 10) // Return first 10 stories
      };
    } catch (error) {
      return {
        message: 'Failed to fetch new stories',
        error: error.message
      };
    }
  }

  @Get('database/duplicates')
  async getDuplicateStats() {
    try {
      const stats = await this.newsStorageService.getDuplicateStats();
      return {
        message: 'Duplicate statistics retrieved successfully',
        timestamp: new Date().toISOString(),
        stats
      };
    } catch (error) {
      return {
        message: 'Failed to retrieve duplicate statistics',
        error: error.message
      };
    }
  }

  @Post('database/bulk-insert')
  async bulkInsertArticles() {
    try {
      // Fetch fresh stories for bulk insertion
      const stories = await this.hackerNewsService.fetchAllStories();
      const allStories = [...stories.top, ...stories.best, ...stories.new];
      
      const result = await this.newsStorageService.bulkInsertArticles(allStories);
      
      return {
        message: 'Bulk insertion completed',
        timestamp: new Date().toISOString(),
        result
      };
    } catch (error) {
      return {
        message: 'Bulk insertion failed',
        error: error.message
      };
    }
  }

  @Post('database/cleanup-duplicates')
  async cleanupDuplicates() {
    try {
      const result = await this.newsStorageService.cleanupDuplicates();
      
      return {
        message: 'Duplicate cleanup completed',
        timestamp: new Date().toISOString(),
        result
      };
    } catch (error) {
      return {
        message: 'Duplicate cleanup failed',
        error: error.message
      };
    }
  }
}
