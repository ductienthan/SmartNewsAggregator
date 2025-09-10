import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ProcessedStory } from '../sources/hacker-news/hacker-news.service';
import { NewsStorageService } from '../database/news-storage.service';

export interface NewsJobData {
  stories: ProcessedStory[];
  source: string;
  batchId: string;
  timestamp: string;
}

@Processor('news-queue')
export class NewsProcessor extends WorkerHost {
  private readonly logger = new Logger(NewsProcessor.name);

  constructor(private readonly newsStorageService: NewsStorageService) {
    super();
  }

  async process(job: Job) {
    const { name, data } = job;
    
    switch (name) {
      case 'process-news-batch':
        return this.handleNewsBatch(job);
      case 'process-single-story':
        return this.handleSingleStory(job);
      case 'cleanup-old-articles':
        return this.handleCleanup(job);
      default:
        this.logger.warn(`Unknown job type: ${name}`);
        return null;
    }
  }

  private async handleNewsBatch(job: Job<NewsJobData>) {
    const { stories, source, batchId, timestamp } = job.data;
    
    this.logger.log(`🔄 Processing news batch ${batchId} from ${source} with ${stories.length} stories`);
    
    try {
      // Save stories to database
      const result = await this.newsStorageService.saveHackerNewsStories(stories);
      
      this.logger.log(`✅ Batch ${batchId} completed: ${result.saved} saved, ${result.skipped} skipped, ${result.duplicates} duplicates, ${result.errors} errors`);
      
      return {
        batchId,
        source,
        processed: stories.length,
        saved: result.saved,
        skipped: result.skipped,
        duplicates: result.duplicates,
        errors: result.errors,
        completedAt: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`❌ Batch ${batchId} failed: ${error.message}`);
      throw error;
    }
  }

  private async handleSingleStory(job: Job<{ story: ProcessedStory; source: string }>) {
    const { story, source } = job.data;
    
    this.logger.log(`📰 Processing single story: "${story.title}" from ${source}`);
    
    try {
      const result = await this.newsStorageService.saveHackerNewsStories([story]);
      
      return {
        storyId: story.id,
        title: story.title,
        source,
        saved: result.saved > 0,
        completedAt: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`❌ Failed to process story "${story.title}": ${error.message}`);
      throw error;
    }
  }

  private async handleCleanup(job: Job<{ olderThanDays: number }>) {
    const { olderThanDays } = job.data;
    
    this.logger.log(`🧹 Starting cleanup of articles older than ${olderThanDays} days`);
    
    try {
      const deletedCount = await this.newsStorageService.cleanupOldArticles(olderThanDays);
      
      this.logger.log(`✅ Cleanup completed: ${deletedCount} articles deleted`);
      
      return {
        deletedCount,
        olderThanDays,
        completedAt: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`❌ Cleanup failed: ${error.message}`);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: any) {
    this.logger.log(`✅ Job ${job.id} completed:`, result);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`❌ Job ${job.id} failed:`, err.message);
  }

  async onWorkerReady() {
    this.logger.log('🚀 News processor worker ready');
  }
}
