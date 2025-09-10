import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ContentProcessingService } from '../services/content-processing.service';
import { NewsStorageService } from '../database/news-storage.service';

export interface ContentProcessingJobData {
  articleId: string;
  url: string;
  title: string;
}

@Processor('content-queue')
export class ContentProcessor extends WorkerHost {
  private readonly logger = new Logger(ContentProcessor.name);

  constructor(
    private readonly contentProcessingService: ContentProcessingService,
    private readonly newsStorageService: NewsStorageService,
  ) {
    super();
  }

  async process(job: Job) {
    const { name, data } = job;
    
    switch (name) {
      case 'process-article-content':
        return this.handleArticleContentProcessing(job);
      case 'process-batch-content':
        return this.handleBatchContentProcessing(job);
      default:
        this.logger.warn(`Unknown job type: ${name}`);
        return null;
    }
  }

  private async handleArticleContentProcessing(job: Job<ContentProcessingJobData>) {
    const { articleId, url, title } = job.data;
    
    this.logger.log(`🔄 Processing content for article: "${title}" (${articleId})`);
    
    try {
      // Update status to processing
      await this.newsStorageService.updateArticleProcessingStatus(articleId, 'processing');
      
      // Process the article content
      const result = await this.contentProcessingService.processArticle(url, title);
      
      if (result.success) {
        // Update article with processed content
        await this.newsStorageService.updateArticleContent(articleId, {
          htmlContent: result.htmlContent,
          cleanedText: result.cleanedText,
          summary: result.summary,
          processingStatus: 'completed',
          processedAt: new Date(),
          lastError: null,
        });
        
        this.logger.log(`✅ Successfully processed content for: "${title}"`);
        
        return {
          articleId,
          title,
          success: true,
          contentLength: result.cleanedText.length,
          summaryLength: result.summary?.length || 0,
          completedAt: new Date().toISOString(),
        };
      } else {
        // Update article with error status
        await this.newsStorageService.updateArticleContent(articleId, {
          processingStatus: 'failed',
          lastError: result.error || 'Unknown error',
        });
        
        this.logger.error(`❌ Failed to process content for: "${title}" - ${result.error}`);
        
        return {
          articleId,
          title,
          success: false,
          error: result.error,
          completedAt: new Date().toISOString(),
        };
      }
    } catch (error) {
      this.logger.error(`❌ Content processing failed for "${title}": ${error.message}`);
      
      // Update article with error status
      await this.newsStorageService.updateArticleContent(articleId, {
        processingStatus: 'failed',
        lastError: error.message,
      });
      
      throw error;
    }
  }

  private async handleBatchContentProcessing(job: Job<{ articleIds: string[] }>) {
    const { articleIds } = job.data;
    
    this.logger.log(`🔄 Processing content for batch of ${articleIds.length} articles`);
    
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };
    
    for (let i = 0; i < articleIds.length; i++) {
      const articleId = articleIds[i];
      
      try {
        // Get article details
        const article = await this.newsStorageService.getArticleById(articleId);
        if (!article) {
          results.failed++;
          results.errors.push(`Article ${articleId} not found`);
          continue;
        }
        
        // Process the article
        const result = await this.handleArticleContentProcessing({
          data: {
            articleId,
            url: article.url,
            title: article.title,
          },
        } as any);
        
        results.processed++;
        if (result.success) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push(`${article.title}: ${result.error}`);
        }
        
        // Add delay between articles to avoid overwhelming AI services
        if (i < articleIds.length - 1) {
          await this.sleep(2000); // 2 second delay between articles
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Article ${articleId}: ${error.message}`);
      }
    }
    
    this.logger.log(`✅ Batch processing completed: ${results.successful} successful, ${results.failed} failed`);
    
    return {
      ...results,
      completedAt: new Date().toISOString(),
    };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: any) {
    this.logger.log(`✅ Content processing job ${job.id} completed:`, result);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`❌ Content processing job ${job.id} failed:`, err.message);
  }

  async onWorkerReady() {
    this.logger.log('🚀 Content processor worker ready');
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
