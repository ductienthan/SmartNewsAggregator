import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface HackerNewsStory {
  by: string;
  descendants: number;
  id: number;
  kids?: number[];
  score: number;
  time: number;
  title: string;
  type: string;
  url?: string;
}

export interface ProcessedStory {
  id: number;
  title: string;
  sourceUrl: string;
  author: string;
  score: number;
  time: number;
  comments: number;
  storyType: 'top' | 'best' | 'new';
}

@Injectable()
export class HackerNewsService {
  private readonly logger = new Logger(HackerNewsService.name);
  private readonly baseUrl = 'https://hacker-news.firebaseio.com/v0';

  /**
   * Fetch top stories from Hacker News
   */
  async fetchTopStories(): Promise<ProcessedStory[]> {
    this.logger.log('📰 Fetching top stories from Hacker News...');
    
    try {
      const response = await axios.get(`${this.baseUrl}/topstories.json`);
      const storyIds: number[] = response.data;
      
      this.logger.log(`📰 Found ${storyIds.length} top stories`);
      
      // Process first 20 stories to avoid rate limiting
      const limitedIds = storyIds.slice(0, 20);
      const stories = await this.processStories(limitedIds, 'top');
      
      this.logger.log(`✅ Successfully processed ${stories.length} top stories`);
      return stories;
    } catch (error) {
      this.logger.error(`❌ Failed to fetch top stories: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch best stories from Hacker News
   */
  async fetchBestStories(): Promise<ProcessedStory[]> {
    this.logger.log('⭐ Fetching best stories from Hacker News...');
    
    try {
      const response = await axios.get(`${this.baseUrl}/beststories.json`);
      const storyIds: number[] = response.data;
      
      this.logger.log(`⭐ Found ${storyIds.length} best stories`);
      
      // Process first 20 stories to avoid rate limiting
      const limitedIds = storyIds.slice(0, 20);
      const stories = await this.processStories(limitedIds, 'best');
      
      this.logger.log(`✅ Successfully processed ${stories.length} best stories`);
      return stories;
    } catch (error) {
      this.logger.error(`❌ Failed to fetch best stories: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch new stories from Hacker News
   */
  async fetchNewStories(): Promise<ProcessedStory[]> {
    this.logger.log('🆕 Fetching new stories from Hacker News...');
    
    try {
      const response = await axios.get(`${this.baseUrl}/newstories.json`);
      const storyIds: number[] = response.data;
      
      this.logger.log(`🆕 Found ${storyIds.length} new stories`);
      
      // Process first 20 stories to avoid rate limiting
      const limitedIds = storyIds.slice(0, 20);
      const stories = await this.processStories(limitedIds, 'new');
      
      this.logger.log(`✅ Successfully processed ${stories.length} new stories`);
      return stories;
    } catch (error) {
      this.logger.error(`❌ Failed to fetch new stories: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process multiple stories by their IDs
   */
  private async processStories(storyIds: number[], storyType: 'top' | 'best' | 'new'): Promise<ProcessedStory[]> {
    const stories: ProcessedStory[] = [];
    
    // Process stories in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < storyIds.length; i += batchSize) {
      const batch = storyIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(id => this.fetchStoryDetail(id, storyType));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          stories.push(result.value);
        } else {
          this.logger.warn(`⚠️ Failed to fetch story ${batch[index]}: ${result.status === 'rejected' ? result.reason : 'Unknown error'}`);
        }
      });
      
      // Add delay between batches to be respectful to the API
      if (i + batchSize < storyIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return stories;
  }

  /**
   * Fetch detailed information for a specific story
   */
  private async fetchStoryDetail(storyId: number, storyType: 'top' | 'best' | 'new'): Promise<ProcessedStory | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/item/${storyId}.json`);
      const story: HackerNewsStory = response.data;
      
      // Only process actual stories (not comments, polls, etc.)
      if (story.type !== 'story' || !story.title) {
        return null;
      }
      
      return {
        id: story.id,
        title: story.title,
        sourceUrl: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
        author: story.by,
        score: story.score,
        time: story.time,
        comments: story.descendants || 0,
        storyType
      };
    } catch (error) {
      this.logger.warn(`⚠️ Failed to fetch story detail for ID ${storyId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch all types of stories (top, best, new)
   */
  async fetchAllStories(): Promise<{
    top: ProcessedStory[];
    best: ProcessedStory[];
    new: ProcessedStory[];
  }> {
    this.logger.log('🚀 Fetching all story types from Hacker News...');
    
    try {
      const [topStories, bestStories, newStories] = await Promise.allSettled([
        this.fetchTopStories(),
        this.fetchBestStories(),
        this.fetchNewStories()
      ]);
      
      const result = {
        top: topStories.status === 'fulfilled' ? topStories.value : [],
        best: bestStories.status === 'fulfilled' ? bestStories.value : [],
        new: newStories.status === 'fulfilled' ? newStories.value : []
      };
      
      const totalStories = result.top.length + result.best.length + result.new.length;
      this.logger.log(`✅ Successfully fetched ${totalStories} total stories from Hacker News`);
      
      return result;
    } catch (error) {
      this.logger.error(`❌ Failed to fetch all stories: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get service statistics
   */
  getServiceStats(): {
    name: string;
    endpoints: string[];
    rateLimit: string;
  } {
    return {
      name: 'Hacker News API',
      endpoints: [
        '/topstories.json',
        '/beststories.json', 
        '/newstories.json',
        '/{id}.json'
      ],
      rateLimit: 'Respectful batching with 100ms delays'
    };
  }
}
