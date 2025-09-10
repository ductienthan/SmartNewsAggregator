import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export interface ContentProcessingResult {
  htmlContent: string;
  cleanedText: string;
  summary?: string;
  success: boolean;
  error?: string;
}

@Injectable()
export class ContentProcessingService {
  private readonly logger = new Logger(ContentProcessingService.name);
  private readonly userAgent = 'Mozilla/5.0 (compatible; SmartNewsAggregator/1.0; +https://github.com/ductienthan/SmartNewsAggregator)';
  private readonly timeout = 10000; // 10 seconds
  private readonly maxContentLength = 1000000; // 1MB max content
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
        
        // Check if it's a rate limit error
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.baseDelay * Math.pow(2, attempt - 1);
          this.logger.warn(`⚠️ Rate limited, waiting ${delay}ms before retry ${attempt}/${retries}`);
          await this.sleep(delay);
        } else if (attempt === retries) {
          this.logger.error(`❌ ${operationName} failed after ${retries} attempts: ${lastError.message}`);
          throw lastError;
        } else {
          const delay = this.baseDelay * Math.pow(2, attempt - 1);
          this.logger.warn(`⚠️ ${operationName} failed (attempt ${attempt}/${retries}), retrying in ${delay}ms: ${lastError.message}`);
          await this.sleep(delay);
        }
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
   * Fetch HTML content from a URL
   */
  async fetchHtmlContent(url: string): Promise<string> {
    try {
      this.logger.debug(`🌐 Fetching HTML content from: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        timeout: this.timeout,
        maxRedirects: 5,
        validateStatus: (status) => status < 400,
      });

      if (response.data.length > this.maxContentLength) {
        this.logger.warn(`⚠️ Content too large (${response.data.length} bytes), truncating`);
        return response.data.substring(0, this.maxContentLength);
      }

      this.logger.debug(`✅ Successfully fetched ${response.data.length} bytes from ${url}`);
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Failed to fetch HTML from ${url}: ${error.message}`);
      throw new Error(`Failed to fetch HTML content: ${error.message}`);
    }
  }

  /**
   * Extract clean, readable text from HTML using Mozilla Readability
   */
  async extractReadableText(htmlContent: string, url: string): Promise<string> {
    try {
      this.logger.debug(`📖 Extracting readable text from HTML (${htmlContent.length} bytes)`);
      
      // Create a JSDOM document
      const dom = new JSDOM(htmlContent, { url });
      const document = dom.window.document;
      
      // Use Mozilla Readability to extract clean content
      const reader = new Readability(document);
      const article = reader.parse();
      
      if (!article) {
        this.logger.warn(`⚠️ Readability failed to extract content from ${url}, falling back to basic extraction`);
        return this.fallbackTextExtraction(htmlContent);
      }
      
      // Clean up the extracted text
      const cleanedText = this.cleanExtractedText(article.textContent || '');
      
      this.logger.debug(`✅ Extracted ${cleanedText.length} characters of readable text`);
      return cleanedText;
    } catch (error) {
      this.logger.error(`❌ Failed to extract readable text: ${error.message}`);
      // Fallback to basic extraction
      return this.fallbackTextExtraction(htmlContent);
    }
  }

  /**
   * Fallback text extraction using Cheerio when Readability fails
   */
  private fallbackTextExtraction(htmlContent: string): string {
    try {
      const $ = cheerio.load(htmlContent);
      
      // Remove script and style elements
      $('script, style, nav, header, footer, aside, .advertisement, .ads').remove();
      
      // Try to find main content areas
      const contentSelectors = [
        'article',
        '.article-content',
        '.post-content',
        '.entry-content',
        '.content',
        'main',
        '.main-content',
        '#content',
        '.story-body',
        '.article-body'
      ];
      
      let content = '';
      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          content = element.text();
          break;
        }
      }
      
      // If no specific content area found, use body
      if (!content) {
        content = $('body').text();
      }
      
      return this.cleanExtractedText(content);
    } catch (error) {
      this.logger.error(`❌ Fallback text extraction failed: ${error.message}`);
      return 'Failed to extract content';
    }
  }

  /**
   * Clean and normalize extracted text
   */
  private cleanExtractedText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n\n') // Normalize line breaks
      .trim();
  }

  /**
   * Generate AI summary using Ollama (local) or OpenAI
   */
  async generateSummary(text: string, title: string): Promise<string> {
    try {
      this.logger.debug(`🤖 Generating summary for: "${title}" (${text.length} chars)`);
      
      // Truncate text if too long (keep first 8000 chars for context)
      const truncatedText = text.length > 8000 ? text.substring(0, 8000) + '...' : text;
      
      // Try Ollama first (local), fallback to OpenAI
      try {
        return await this.generateSummaryWithOllama(truncatedText, title);
      } catch (ollamaError) {
        this.logger.warn(`⚠️ Ollama failed, trying OpenAI: ${ollamaError.message}`);
        try {
          return await this.generateSummaryWithOpenAI(truncatedText, title);
        } catch (openaiError) {
          this.logger.warn(`⚠️ OpenAI also failed, using fallback summary: ${openaiError.message}`);
          return this.generateFallbackSummary(truncatedText, title);
        }
      }
    } catch (error) {
      this.logger.error(`❌ Failed to generate summary: ${error.message}`);
      // Return a fallback summary instead of throwing
      return this.generateFallbackSummary(text, title);
    }
  }

  /**
   * Generate summary using Ollama (local LLM)
   */
  private async generateSummaryWithOllama(text: string, title: string): Promise<string> {
    return this.retryWithBackoff(async () => {
      const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
      const model = process.env.OLLAMA_MODEL || 'llama3.2:3b';
      
      const prompt = `Please provide a concise summary (2-3 sentences) of the following article:

Title: ${title}

Content: ${text}

Summary:`;

      const response = await axios.post(`${ollamaUrl}/api/generate`, {
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          max_tokens: 200,
        }
      }, {
        timeout: 30000, // 30 seconds for local LLM
        validateStatus: (status) => status < 500, // Accept 4xx errors but not 5xx
      });

      if (response.status >= 400) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      return response.data.response?.trim() || 'Summary generation failed';
    }, 'Ollama summary generation');
  }

  /**
   * Generate summary using OpenAI
   */
  private async generateSummaryWithOpenAI(text: string, title: string): Promise<string> {
    return this.retryWithBackoff(async () => {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that creates concise, informative summaries of news articles. Keep summaries to 2-3 sentences and focus on the key points.'
          },
          {
            role: 'user',
            content: `Please summarize this article:

Title: ${title}

Content: ${text}`
          }
        ],
        max_tokens: 200,
        temperature: 0.3,
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
        validateStatus: (status) => status < 500, // Accept 4xx errors but not 5xx
      });

      if (response.status >= 400) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      return response.data.choices[0]?.message?.content?.trim() || 'Summary generation failed';
    }, 'OpenAI summary generation');
  }

  /**
   * Generate a fallback summary when AI services fail
   */
  private generateFallbackSummary(text: string, title: string): string {
    // Extract first few sentences as a basic summary
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const firstSentences = sentences.slice(0, 2).join('. ').trim();
    
    if (firstSentences.length > 0) {
      return `${firstSentences}. [Summary generated from article content due to AI service unavailability]`;
    }
    
    // If no sentences found, create a basic summary from title
    return `Article: ${title}. [Content summary unavailable due to AI service issues]`;
  }

  /**
   * Process a complete article: fetch HTML, extract text, and generate summary
   */
  async processArticle(url: string, title: string): Promise<ContentProcessingResult> {
    try {
      this.logger.log(`🔄 Processing article: "${title}" from ${url}`);
      
      // Step 1: Fetch HTML content
      const htmlContent = await this.fetchHtmlContent(url);
      
      // Step 2: Extract readable text
      const cleanedText = await this.extractReadableText(htmlContent, url);
      
      // Step 3: Generate summary
      const summary = await this.generateSummary(cleanedText, title);
      
      this.logger.log(`✅ Successfully processed article: "${title}"`);
      
      return {
        htmlContent,
        cleanedText,
        summary,
        success: true,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to process article "${title}": ${error.message}`);
      
      return {
        htmlContent: '',
        cleanedText: '',
        summary: '',
        success: false,
        error: error.message,
      };
    }
  }
}
