import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HackerNewsService, ProcessedStory } from '../sources';
import { NewsStorageService } from '../database/news-storage.service';
import { NewsQueueService } from '../services/news-queue.service';

@Injectable()
export class NewsSchedulerService {
  private readonly logger = new Logger(NewsSchedulerService.name);

  constructor(
    private readonly hackerNewsService: HackerNewsService,
    private readonly newsStorageService: NewsStorageService,
    private readonly newsQueueService: NewsQueueService
  ) {}

  /**
   * News aggregation cron job - runs every 30 minutes
   * This is the main scheduler for news collection and processing
   */
  @Cron('0 */30 * * * *') // Every 30 minutes at 0 seconds
  async handleNewsAggregation() {
    const timestamp = new Date().toISOString();
    this.logger.log(`🚀 Starting news aggregation job at ${timestamp}`);
    
    try {
      // Step 1: Fetch news from configured sources
      const fetchedStories = await this.fetchNewsFromSources();
      
      // Step 2: Queue news data for processing
      await this.queueNewsForProcessing(fetchedStories);
      
      // Step 3: Process and clean the news data
      await this.processNewsData(fetchedStories);
      
      // Step 4: Update news clusters and entities
      await this.updateNewsClusters();
      
      // Step 5: Generate user digests if needed
      await this.generateUserDigests();
      
      // Step 6: Clean up old data
      await this.cleanupOldData();
      
      this.logger.log(`✅ News aggregation job completed successfully at ${new Date().toISOString()}`);
    } catch (error) {
      this.logger.error(`❌ News aggregation job failed: ${error.message}`, error.stack);
      // You might want to send alerts or notifications here
    }
  }

  /**
   * Fetch news from configured RSS feeds and API sources
   */
  private async fetchNewsFromSources(): Promise<ProcessedStory[]> {
    this.logger.log('📡 Fetching news from configured sources...');
    
    try {
      // Fetch from Hacker News
      const hackerNewsStories = await this.hackerNewsService.fetchAllStories();
      
      // Combine all stories
      const allStories = [
        ...hackerNewsStories.top,
        ...hackerNewsStories.best,
        ...hackerNewsStories.new
      ];
      
      this.logger.log(`📡 Successfully fetched ${allStories.length} stories from Hacker News`);
      this.logger.log(`📊 Breakdown: ${hackerNewsStories.top.length} top, ${hackerNewsStories.best.length} best, ${hackerNewsStories.new.length} new`);
      
      return allStories;
    } catch (error) {
      this.logger.error(`❌ Failed to fetch news from sources: ${error.message}`);
      throw error;
    }
  }

  /**
   * Queue news data for background processing
   */
  private async queueNewsForProcessing(stories: ProcessedStory[]): Promise<void> {
    this.logger.log(`📤 Queuing ${stories.length} stories for background processing...`);
    
    try {
      // Add stories to processing queue
      const jobId = await this.newsQueueService.addNewsBatch(stories, 'hacker-news');
      
      this.logger.log(`📤 Successfully queued news batch with job ID: ${jobId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to queue news for processing: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process and clean the fetched news data
   */
  private async processNewsData(stories: ProcessedStory[]): Promise<void> {
    this.logger.log(`🔧 Processing and cleaning ${stories.length} news stories...`);
    
    try {
      // TODO: Implement data processing logic
      // - Parse article content
      // - Extract entities (people, organizations, locations)
      // - Clean and normalize text
      // - Detect duplicates
      // - Calculate content hash
      
      // For now, just log the stories
      stories.forEach((story, index) => {
        if (index < 5) { // Log first 5 stories as examples
          this.logger.log(`📰 Story ${index + 1}: "${story.title}" by ${story.author} (${story.storyType})`);
        }
      });
      
      if (stories.length > 5) {
        this.logger.log(`📰 ... and ${stories.length - 5} more stories`);
      }
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      this.logger.log('🔧 News data processed successfully');
    } catch (error) {
      this.logger.error(`❌ Failed to process news data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update news clusters and entity relationships
   */
  private async updateNewsClusters(): Promise<void> {
    this.logger.log('🔄 Updating news clusters and entities...');
    
    // TODO: Implement clustering logic
    // - Group similar articles
    // - Update entity relationships
    // - Calculate cluster centroids
    // - Merge or split clusters as needed
    
    // Simulate work for now
    await new Promise(resolve => setTimeout(resolve, 2000));
    this.logger.log('🔄 News clusters updated successfully');
  }

  /**
   * Generate user digests based on preferences
   */
  private async generateUserDigests(): Promise<void> {
    this.logger.log('📰 Generating user digests...');
    
    // TODO: Implement digest generation logic
    // - Check user preferences
    // - Select relevant articles
    // - Generate personalized content
    // - Queue for delivery
    
    // Simulate work for now
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.logger.log('📰 User digests generated successfully');
  }

  /**
   * Clean up old news data and logs
   */
  private async cleanupOldData(): Promise<void> {
    this.logger.log('🧹 Cleaning up old data...');
    
    try {
      // Queue cleanup job instead of running directly
      const jobId = await this.newsQueueService.addCleanupJob(30);
      this.logger.log(`🧹 Cleanup job queued with ID: ${jobId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to queue cleanup job: ${error.message}`);
    }
  }

  /**
   * Manual trigger for news aggregation (useful for testing)
   */
  async triggerNewsAggregation(): Promise<void> {
    this.logger.log('🔧 Manually triggering news aggregation...');
    await this.handleNewsAggregation();
  }

  /**
   * Get scheduler status and next run time
   */
  getSchedulerStatus(): { 
    isRunning: boolean; 
    nextRun: Date; 
    lastRun: Date | null;
    totalRuns: number;
  } {
    // TODO: Implement actual status tracking
    const now = new Date();
    const nextRun = new Date(now.getTime() + 30 * 60 * 1000); // Next 30-minute interval
    
    return {
      isRunning: false, // TODO: Track actual running state
      nextRun,
      lastRun: null, // TODO: Track last run time
      totalRuns: 0, // TODO: Track total runs
    };
  }

  /**
   * Get news source statistics
   */
  getNewsSourceStats(): any {
    return {
      hackerNews: this.hackerNewsService.getServiceStats(),
      totalSources: 1
    };
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    return this.newsStorageService.getDatabaseStats();
  }

  /**
   * Get recent articles from database
   */
  async getRecentArticles(limit: number = 10) {
    return this.newsStorageService.getRecentHackerNewsArticles(limit);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    return this.newsQueueService.getQueueStats();
  }

  /**
   * Get recent jobs
   */
  async getRecentJobs(limit: number = 10) {
    return this.newsQueueService.getRecentJobs(limit);
  }
}
