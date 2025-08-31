import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly redis: Redis;
  private readonly blacklistPrefix = 'blacklist:token:';
  private readonly blacklistExpiry = 24 * 60 * 60; // 24 hours in seconds

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      lazyConnect: true,
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis for token blacklist');
    });
  }

  /**
   * Add a token to the blacklist
   * @param token The JWT token to blacklist
   * @param userId The user ID for logging purposes
   */
  async blacklistToken(token: string, userId?: string): Promise<void> {
    try {
      const key = this.blacklistPrefix + this.hashToken(token);
      await this.redis.setex(key, this.blacklistExpiry, Date.now().toString());
      
      this.logger.log(`Token blacklisted for user: ${userId || 'unknown'}`);
    } catch (error) {
      this.logger.error(`Failed to blacklist token for user: ${userId}`, error);
      throw new Error('Failed to blacklist token');
    }
  }

  /**
   * Check if a token is blacklisted
   * @param token The JWT token to check
   * @returns true if the token is blacklisted, false otherwise
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const key = this.blacklistPrefix + this.hashToken(token);
      const exists = await this.redis.exists(key);
      
      if (exists) {
        this.logger.warn(`Blacklisted token detected: ${this.hashToken(token)}`);
      }
      
      return exists === 1;
    } catch (error) {
      this.logger.error('Failed to check token blacklist:', error);
      // In case of Redis failure, we could either:
      // 1. Allow the request (less secure but maintains availability)
      // 2. Reject the request (more secure but could cause outages)
      // For now, we'll reject the request for security
      throw new Error('Token validation service unavailable');
    }
  }

  /**
   * Remove a token from the blacklist (useful for testing or manual cleanup)
   * @param token The JWT token to remove from blacklist
   */
  async removeFromBlacklist(token: string): Promise<void> {
    try {
      const key = this.blacklistPrefix + this.hashToken(token);
      await this.redis.del(key);
      this.logger.log(`Token removed from blacklist: ${this.hashToken(token)}`);
    } catch (error) {
      this.logger.error('Failed to remove token from blacklist:', error);
      throw new Error('Failed to remove token from blacklist');
    }
  }

  /**
   * Get blacklist statistics (useful for monitoring)
   */
  async getBlacklistStats(): Promise<{ total: number; keys: string[] }> {
    try {
      const pattern = this.blacklistPrefix + '*';
      const keys = await this.redis.keys(pattern);
      return {
        total: keys.length,
        keys: keys.map(key => key.replace(this.blacklistPrefix, '')),
      };
    } catch (error) {
      this.logger.error('Failed to get blacklist stats:', error);
      return { total: 0, keys: [] };
    }
  }

  /**
   * Clean up expired blacklist entries (can be called periodically)
   */
  async cleanupExpiredEntries(): Promise<number> {
    try {
      const pattern = this.blacklistPrefix + '*';
      const keys = await this.redis.keys(pattern);
      let cleaned = 0;

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) { // No expiry set
          await this.redis.del(key);
          cleaned++;
        }
      }

      this.logger.log(`Cleaned up ${cleaned} expired blacklist entries`);
      return cleaned;
    } catch (error) {
      this.logger.error('Failed to cleanup expired entries:', error);
      return 0;
    }
  }

  /**
   * Hash the token for storage (we don't store the actual token for security)
   * @param token The JWT token to hash
   * @returns A hash of the token
   */
  private hashToken(token: string): string {
    // Simple hash function - in production, you might want to use a more secure hash
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Gracefully close Redis connection
   */
  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis connection closed');
    }
  }
} 