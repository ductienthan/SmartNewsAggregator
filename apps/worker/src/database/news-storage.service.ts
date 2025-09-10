import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ProcessedStory } from '../sources/hacker-news/hacker-news.service';
import * as crypto from 'crypto';

@Injectable()
export class NewsStorageService {
  private readonly logger = new Logger(NewsStorageService.name);
  private readonly prisma = new PrismaClient();
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second base delay

  /**
   * Retry utility with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string,
    retries: number = this.maxRetries
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === retries) {
          this.logger.error(`❌ ${operationName} failed after ${retries} attempts: ${lastError.message}`);
          throw lastError;
        }
        
        const delay = this.baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        this.logger.warn(`⚠️ ${operationName} failed (attempt ${attempt}/${retries}), retrying in ${delay}ms: ${lastError.message}`);
        
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get article by ID
   */
  async getArticleById(articleId: string) {
    return this.retryWithBackoff(
      () => this.prisma.article.findUnique({
        where: { id: articleId },
        include: { source: true },
      }),
      'Get article by ID'
    );
  }

  /**
   * Update article processing status
   */
  async updateArticleProcessingStatus(articleId: string, status: 'pending' | 'processing' | 'completed' | 'failed') {
    return this.retryWithBackoff(
      () => this.prisma.article.update({
        where: { id: articleId },
        data: { processingStatus: status },
      }),
      'Update article processing status'
    );
  }

  /**
   * Update article content with processed data
   */
  async updateArticleContent(articleId: string, data: {
    htmlContent?: string;
    cleanedText?: string;
    summary?: string;
    processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
    processedAt?: Date;
    lastError?: string | null;
  }) {
    return this.retryWithBackoff(
      () => this.prisma.article.update({
        where: { id: articleId },
        data,
      }),
      'Update article content'
    );
  }

  /**
   * Get articles that need content processing
   */
  async getArticlesForContentProcessing(limit: number = 100) {
    return this.retryWithBackoff(
      () => this.prisma.article.findMany({
        where: {
          processingStatus: 'pending',
          url: { not: '' },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { source: true },
      }),
      'Get articles for content processing'
    );
  }

  /**
   * Get articles with failed processing for retry
   */
  async getFailedProcessingArticles(limit: number = 50) {
    return this.retryWithBackoff(
      () => this.prisma.article.findMany({
        where: {
          processingStatus: 'failed',
          url: { not: '' },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { source: true },
      }),
      'Get failed processing articles'
    );
  }

  /**
   * Save Hacker News stories to the database with enhanced deduplication
   */
  async saveHackerNewsStories(stories: ProcessedStory[]): Promise<{
    saved: number;
    skipped: number;
    errors: number;
    duplicates: number;
  }> {
    this.logger.log(`💾 Saving ${stories.length} Hacker News stories to database...`);
    
    let saved = 0;
    let skipped = 0;
    let errors = 0;
    let duplicates = 0;

    // First, ensure we have a Hacker News source in the database
    const hackerNewsSource = await this.retryWithBackoff(
      () => this.ensureHackerNewsSource(),
      'Ensure Hacker News source'
    );

    // Process stories in batches for better performance
    const batchSize = 50;
    const batches = this.chunkArray(stories, batchSize);

    for (const batch of batches) {
      try {
        const result = await this.processBatch(batch, hackerNewsSource.id);
        saved += result.saved;
        skipped += result.skipped;
        errors += result.errors;
        duplicates += result.duplicates;
      } catch (error) {
        this.logger.error(`❌ Batch processing failed: ${error.message}`);
        errors += batch.length;
      }
    }

    this.logger.log(`💾 Database save complete: ${saved} saved, ${skipped} skipped, ${duplicates} duplicates, ${errors} errors`);
    
    return { saved, skipped, errors, duplicates };
  }

  /**
   * Process a batch of stories with transaction support
   */
  private async processBatch(stories: ProcessedStory[], sourceId: string): Promise<{
    saved: number;
    skipped: number;
    errors: number;
    duplicates: number;
  }> {
    let saved = 0;
    let skipped = 0;
    let errors = 0;
    let duplicates = 0;

    // Use transaction for atomic operations with retry
    await this.retryWithBackoff(
      () => this.prisma.$transaction(async (tx) => {
      for (const story of stories) {
        try {
          // Create content hash for idempotency
          const contentHash = this.createContentHash(story);
          
          // Check for duplicates using multiple strategies
          const duplicateCheck = await this.checkForDuplicates(tx, story, contentHash);
          
          if (duplicateCheck.isDuplicate) {
            if (duplicateCheck.reason === 'hash') {
              skipped++;
              this.logger.debug(`⏭️ Skipped story (hash duplicate): "${story.title}" - matches existing article ${duplicateCheck.existingArticle?.id}`);
            } else {
              duplicates++;
              this.logger.debug(`🔄 Found ${duplicateCheck.reason} duplicate: "${story.title}" - matches existing article ${duplicateCheck.existingArticle?.id}`);
            }
            continue;
          }

          // Save the article
          await tx.article.create({
            data: {
              sourceId,
              url: story.sourceUrl,
              title: story.title,
              author: story.author,
              outlet: 'Hacker News',
              publishedAt: new Date(story.time * 1000), // Convert Unix timestamp to Date
              lang: 'en',
              paywalled: false,
              cleanedText: story.title, // For now, just use title as cleaned text
              hash: contentHash,
              // Note: embedding will be added later when we implement vector embeddings
            }
          });

          saved++;
          this.logger.log(`✅ Saved story: "${story.title}" by ${story.author}`);
        } catch (error) {
          errors++;
          this.logger.error(`❌ Failed to save story "${story.title}": ${error.message}`);
        }
      }
    }),
      'Process batch transaction'
    );

    return { saved, skipped, errors, duplicates };
  }

  /**
   * Check for duplicates using multiple strategies
   */
  private async checkForDuplicates(tx: any, story: ProcessedStory, contentHash: string): Promise<{
    isDuplicate: boolean;
    reason: 'hash' | 'url' | 'title' | 'canonical' | 'none';
    existingArticle?: any;
  }> {
    // 1. Check by content hash (exact match) - most reliable
    const existingByHash = await this.retryWithBackoff(
      () => tx.article.findUnique({
        where: { hash: contentHash }
      }),
      'Check hash duplicate'
    );

    if (existingByHash) {
      return { isDuplicate: true, reason: 'hash', existingArticle: existingByHash };
    }

    // 2. Check by URL (exact match)
    const existingByUrl = await this.retryWithBackoff(
      () => tx.article.findUnique({
        where: { url: story.sourceUrl }
      }),
      'Check URL duplicate'
    );

    if (existingByUrl) {
      return { isDuplicate: true, reason: 'url', existingArticle: existingByUrl };
    }

    // 3. Check by canonical URL if different from source URL
    // Note: ProcessedStory only has sourceUrl, so we skip canonical URL check for now
    // This would be useful when we have more sophisticated URL processing

    // 4. Check by title similarity (fuzzy match) - more sophisticated
    const normalizedTitle = this.normalizeTitle(story.title);
    const titleWords = normalizedTitle.split(' ').filter(word => word.length > 3); // Only words longer than 3 chars
    
    if (titleWords.length > 0) {
      // Check for articles with similar titles within the last 30 days
      const existingByTitle = await this.retryWithBackoff(
        () => tx.article.findFirst({
        where: {
          AND: [
            {
              OR: [
                // Exact title match
                { title: { equals: story.title, mode: 'insensitive' } },
                // Contains normalized title
                { title: { contains: normalizedTitle, mode: 'insensitive' } },
                // Contains significant words from title
                ...titleWords.map(word => ({
                  title: { contains: word, mode: 'insensitive' }
                }))
              ]
            },
            {
              publishedAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Within last 30 days
              }
            }
          ]
        },
        orderBy: { publishedAt: 'desc' }
      }),
        'Check title duplicate'
      );

      if (existingByTitle && (existingByTitle as any).title) {
        // Additional validation: check if titles are actually similar
        const similarity = this.calculateTitleSimilarity(story.title, (existingByTitle as any).title);
        if (similarity > 0.8) { // 80% similarity threshold
          return { isDuplicate: true, reason: 'title', existingArticle: existingByTitle };
        }
      }
    }

    return { isDuplicate: false, reason: 'none' };
  }

  /**
   * Calculate title similarity using simple word overlap
   */
  private calculateTitleSimilarity(title1: string, title2: string): number {
    const words1 = new Set(this.normalizeTitle(title1).split(' ').filter(w => w.length > 2));
    const words2 = new Set(this.normalizeTitle(title2).split(' ').filter(w => w.length > 2));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Normalize title for similarity comparison
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Ensure Hacker News source exists in the database
   */
  private async ensureHackerNewsSource() {
    const existingSource = await this.retryWithBackoff(
      () => this.prisma.source.findUnique({
        where: { url: 'https://hacker-news.firebaseio.com/v0' }
      }),
      'Find existing Hacker News source'
    );

    if (existingSource) {
      return existingSource;
    }

    // Create Hacker News source
    const newSource = await this.retryWithBackoff(
      () => this.prisma.source.create({
        data: {
          type: 'api',
          title: 'Hacker News API',
          url: 'https://hacker-news.firebaseio.com/v0',
          country: 'US',
          reputation: 90, // High reputation for Hacker News
          enabled: true
        }
      }),
      'Create Hacker News source'
    );

    this.logger.log(`✅ Created Hacker News source: ${newSource.id}`);
    return newSource;
  }

  /**
   * Create a content hash for idempotency using crypto.createHash
   */
  private createContentHash(story: ProcessedStory): string {
    // Create a more robust hash using multiple story attributes
    const content = JSON.stringify({
      id: story.id,
      title: this.normalizeTitle(story.title),
      author: story.author?.toLowerCase() || 'unknown',
      time: story.time,
      url: story.sourceUrl
    });
    
    // Use SHA-256 for better collision resistance
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return `hn_${hash.substring(0, 16)}`; // Use first 16 characters for shorter hash
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    totalArticles: number;
    totalSources: number;
    recentArticles: number;
    hackerNewsArticles: number;
  }> {
    const [
      totalArticles,
      totalSources,
      recentArticles,
      hackerNewsSource
    ] = await Promise.all([
      this.prisma.article.count(),
      this.prisma.source.count(),
      this.prisma.article.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      }),
      this.prisma.source.findUnique({
        where: { url: 'https://hacker-news.firebaseio.com/v0' }
      })
    ]);

    const hackerNewsArticles = hackerNewsSource 
      ? await this.prisma.article.count({
          where: { sourceId: hackerNewsSource.id }
        })
      : 0;

    return {
      totalArticles,
      totalSources,
      recentArticles,
      hackerNewsArticles
    };
  }

  /**
   * Get recent articles from Hacker News
   */
  async getRecentHackerNewsArticles(limit: number = 10) {
    const hackerNewsSource = await this.prisma.source.findUnique({
      where: { url: 'https://hacker-news.firebaseio.com/v0' }
    });

    if (!hackerNewsSource) {
      return [];
    }

    return this.prisma.article.findMany({
      where: { sourceId: hackerNewsSource.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        author: true,
        url: true,
        publishedAt: true,
        createdAt: true
      }
    });
  }

  /**
   * Clean up old articles (older than specified days)
   */
  async cleanupOldArticles(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    const result = await this.prisma.article.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    this.logger.log(`🧹 Cleaned up ${result.count} articles older than ${olderThanDays} days`);
    return result.count;
  }

  /**
   * Bulk insert articles with enhanced deduplication (alternative method)
   */
  async bulkInsertArticles(stories: ProcessedStory[]): Promise<{
    saved: number;
    skipped: number;
    errors: number;
    duplicates: number;
  }> {
    this.logger.log(`🚀 Bulk inserting ${stories.length} articles...`);
    
    const hackerNewsSource = await this.retryWithBackoff(
      () => this.ensureHackerNewsSource(),
      'Ensure Hacker News source for bulk insert'
    );
    
    // Prepare data for bulk operations
    const articlesToInsert: any[] = [];
    const existingHashes = new Set<string>();
    const existingUrls = new Set<string>();
    
    // First, get all existing hashes and URLs to avoid duplicates
    const existingArticles = await this.retryWithBackoff(
      () => this.prisma.article.findMany({
        where: {
          OR: [
            { sourceId: hackerNewsSource.id },
            { url: { in: stories.map(s => s.sourceUrl) } }
          ]
        },
        select: { hash: true, url: true }
      }),
      'Find existing articles for bulk insert'
    );
    
    existingArticles.forEach(article => {
      existingHashes.add(article.hash);
      existingUrls.add(article.url);
    });
    
    // Filter out duplicates and prepare for insertion
    for (const story of stories) {
      const contentHash = this.createContentHash(story);
      
      if (existingHashes.has(contentHash) || existingUrls.has(story.sourceUrl)) {
        continue; // Skip duplicates
      }
      
      articlesToInsert.push({
        sourceId: hackerNewsSource.id,
        url: story.sourceUrl,
        title: story.title,
        author: story.author,
        outlet: 'Hacker News',
        publishedAt: new Date(story.time * 1000),
        lang: 'en',
        paywalled: false,
        cleanedText: story.title,
        hash: contentHash,
      });
    }
    
    if (articlesToInsert.length === 0) {
      this.logger.log(`📝 No new articles to insert (all duplicates)`);
      return { saved: 0, skipped: stories.length, errors: 0, duplicates: 0 };
    }
    
    try {
      // Use createMany for bulk insertion
      const result = await this.retryWithBackoff(
        () => this.prisma.article.createMany({
          data: articlesToInsert,
          skipDuplicates: true // Additional safety net
        }),
        'Bulk insert articles'
      );
      
      const saved = result.count;
      const skipped = stories.length - saved;
      
      this.logger.log(`✅ Bulk insert complete: ${saved} saved, ${skipped} skipped`);
      
      return { saved, skipped, errors: 0, duplicates: 0 };
    } catch (error) {
      this.logger.error(`❌ Bulk insert failed: ${error.message}`);
      return { saved: 0, skipped: 0, errors: stories.length, duplicates: 0 };
    }
  }

  /**
   * Get duplicate statistics for all articles in the database
   */
  async getDuplicateStats(): Promise<{
    totalArticles: number;
    totalDuplicates: number;
    duplicatesByHash: number;
    duplicatesByUrl: number;
    duplicatesByTitle: number;
    duplicateDetails: {
      hashDuplicates: Array<{ hash: string; count: number; articles: Array<{ id: string; title: string; url: string }> }>;
      urlDuplicates: Array<{ url: string; count: number; articles: Array<{ id: string; title: string; hash: string }> }>;
      titleDuplicates: Array<{ title: string; count: number; articles: Array<{ id: string; url: string; hash: string }> }>;
    };
  }> {
    // Get all articles in the database
    const totalArticles = await this.retryWithBackoff(
      () => this.prisma.article.count(),
      'Count total articles'
    );

    if (totalArticles === 0) {
      return {
        totalArticles: 0,
        totalDuplicates: 0,
        duplicatesByHash: 0,
        duplicatesByUrl: 0,
        duplicatesByTitle: 0,
        duplicateDetails: {
          hashDuplicates: [],
          urlDuplicates: [],
          titleDuplicates: []
        }
      };
    }

    // Find hash duplicates
    const hashGroups = await this.retryWithBackoff(
      () => this.prisma.article.groupBy({
      by: ['hash'],
      where: {
        hash: {
          not: ''
        }
      },
      _count: { hash: true },
      having: {
        hash: {
          _count: {
            gt: 1
          }
        }
      }
    }),
      'Find hash duplicates'
    );

    // Find URL duplicates
    const urlGroups = await this.retryWithBackoff(
      () => this.prisma.article.groupBy({
        by: ['url'],
        _count: { url: true },
        having: {
          url: {
            _count: {
              gt: 1
            }
          }
        }
      }),
      'Find URL duplicates'
    );

    // Find title duplicates (normalized titles)
    const titleGroups = await this.retryWithBackoff(
      () => this.prisma.article.groupBy({
        by: ['title'],
        _count: { title: true },
        having: {
          title: {
            _count: {
              gt: 1
            }
          }
        }
      }),
      'Find title duplicates'
    );

    // Get detailed information for each type of duplicate
    const hashDuplicates = await Promise.all(
      hashGroups.map(async (group) => {
        const articles = await this.prisma.article.findMany({
          where: { hash: group.hash },
          select: { id: true, title: true, url: true },
          take: 5 // Limit to first 5 for performance
        });
        return {
          hash: group.hash!,
          count: (group._count as any).hash || 0,
          articles
        };
      })
    );

    const urlDuplicates = await Promise.all(
      urlGroups.map(async (group) => {
        const articles = await this.prisma.article.findMany({
          where: { url: group.url },
          select: { id: true, title: true, hash: true },
          take: 5 // Limit to first 5 for performance
        });
        return {
          url: group.url,
          count: (group._count as any).url || 0,
          articles
        };
      })
    );

    const titleDuplicates = await Promise.all(
      titleGroups.map(async (group) => {
        const articles = await this.prisma.article.findMany({
          where: { title: group.title },
          select: { id: true, url: true, hash: true },
          take: 5 // Limit to first 5 for performance
        });
        return {
          title: group.title,
          count: (group._count as any).title || 0,
          articles
        };
      })
    );

    // Calculate total duplicates (articles that are duplicates, not unique duplicate groups)
    const duplicatesByHash = hashDuplicates.reduce((sum, group) => sum + (group.count - 1), 0);
    const duplicatesByUrl = urlDuplicates.reduce((sum, group) => sum + (group.count - 1), 0);
    const duplicatesByTitle = titleDuplicates.reduce((sum, group) => sum + (group.count - 1), 0);

    return {
      totalArticles,
      totalDuplicates: Math.max(duplicatesByHash, duplicatesByUrl, duplicatesByTitle),
      duplicatesByHash,
      duplicatesByUrl,
      duplicatesByTitle,
      duplicateDetails: {
        hashDuplicates,
        urlDuplicates,
        titleDuplicates
      }
    };
  }

  /**
   * Clean up existing duplicates in the database
   */
  async cleanupDuplicates(): Promise<{
    removed: number;
    hashDuplicatesRemoved: number;
    urlDuplicatesRemoved: number;
    titleDuplicatesRemoved: number;
  }> {
    this.logger.log(`🧹 Starting duplicate cleanup...`);
    
    let removed = 0;
    let hashDuplicatesRemoved = 0;
    let urlDuplicatesRemoved = 0;
    let titleDuplicatesRemoved = 0;

    try {
      // 1. Remove hash duplicates (keep the oldest)
      const hashDuplicates = await this.retryWithBackoff(
        () => this.prisma.article.groupBy({
        by: ['hash'],
        where: { 
          hash: { 
            not: ''
          } 
        },
        _count: { hash: true },
        having: { 
          hash: { 
            _count: { 
              gt: 1 
            } 
          } 
        }
      }),
        'Find hash duplicates for cleanup'
      );

      for (const group of hashDuplicates) {
        const articles = await this.prisma.article.findMany({
          where: { hash: group.hash },
          orderBy: { createdAt: 'asc' }, // Keep the oldest
          skip: 1 // Skip the first (oldest) one
        });

        for (const article of articles) {
          await this.retryWithBackoff(
            () => this.prisma.article.delete({ where: { id: article.id } }),
            `Delete hash duplicate article ${article.id}`
          );
          hashDuplicatesRemoved++;
          removed++;
        }
      }

      // 2. Remove URL duplicates (keep the oldest)
      const urlDuplicates = await this.retryWithBackoff(
        () => this.prisma.article.groupBy({
          by: ['url'],
          _count: { url: true },
          having: { url: { _count: { gt: 1 } } }
        }),
        'Find URL duplicates for cleanup'
      );

      for (const group of urlDuplicates) {
        const articles = await this.prisma.article.findMany({
          where: { url: group.url },
          orderBy: { createdAt: 'asc' }, // Keep the oldest
          skip: 1 // Skip the first (oldest) one
        });

        for (const article of articles) {
          await this.retryWithBackoff(
            () => this.prisma.article.delete({ where: { id: article.id } }),
            `Delete URL duplicate article ${article.id}`
          );
          urlDuplicatesRemoved++;
          removed++;
        }
      }

      // 3. Remove title duplicates (keep the oldest, more conservative approach)
      const titleDuplicates = await this.retryWithBackoff(
        () => this.prisma.article.groupBy({
          by: ['title'],
          _count: { title: true },
          having: { title: { _count: { gt: 1 } } }
        }),
        'Find title duplicates for cleanup'
      );

      for (const group of titleDuplicates) {
        const articles = await this.prisma.article.findMany({
          where: { title: group.title },
          orderBy: { createdAt: 'asc' }, // Keep the oldest
          skip: 1 // Skip the first (oldest) one
        });

        for (const article of articles) {
          await this.retryWithBackoff(
            () => this.prisma.article.delete({ where: { id: article.id } }),
            `Delete title duplicate article ${article.id}`
          );
          titleDuplicatesRemoved++;
          removed++;
        }
      }

      this.logger.log(`✅ Duplicate cleanup completed: ${removed} articles removed (${hashDuplicatesRemoved} hash, ${urlDuplicatesRemoved} URL, ${titleDuplicatesRemoved} title)`);
      
      return {
        removed,
        hashDuplicatesRemoved,
        urlDuplicatesRemoved,
        titleDuplicatesRemoved
      };
    } catch (error) {
      this.logger.error(`❌ Duplicate cleanup failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
