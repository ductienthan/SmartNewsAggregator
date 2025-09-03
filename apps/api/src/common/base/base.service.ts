import { Logger, InternalServerErrorException } from '@nestjs/common';

export abstract class BaseService {
  protected readonly logger: Logger;

  constructor(loggerContext: string) {
    this.logger = new Logger(loggerContext);
  }

  protected handleError(error: unknown, context: string, userId?: string): never {
    this.logger.error(`${context} failed${userId ? ` for user: ${userId}` : ''}`, 
      error instanceof Error ? error.stack : 'Unknown error');
    
    // Re-throw known exceptions (HttpException, etc.)
    if (error && typeof error === 'object' && 'getStatus' in error) {
      throw error;
    }
    
    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && error.code.startsWith('P')) {
      this.logger.error(`Database error: ${error.code}`, error);
      throw new InternalServerErrorException('Database error occurred');
    }
    
    // Handle unknown errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(`Unexpected error: ${errorMessage}`);
    throw new InternalServerErrorException('An unexpected error occurred');
  }

  protected logSuccess(context: string, userId?: string, details?: Record<string, any>): void {
    this.logger.log(`${context} completed successfully${userId ? ` for user: ${userId}` : ''}`, details);
  }

  protected logWarning(context: string, message: string, userId?: string): void {
    this.logger.warn(`${context}: ${message}${userId ? ` for user: ${userId}` : ''}`);
  }
} 