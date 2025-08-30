import { createParamDecorator, ExecutionContext, Logger } from '@nestjs/common';

export interface ErrorHandlerOptions {
  logContext?: string;
  includeStack?: boolean;
}

export const ErrorHandler = (options: ErrorHandlerOptions = {}) => {
  return createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    const logger = new Logger(options.logContext || 'ErrorHandler');
    
    return {
      logger,
      handleError: (error: unknown, context: string) => {
        logger.error(`${context} failed`, error instanceof Error ? error.stack : 'Unknown error');
        
        // Re-throw known exceptions
        if (error && typeof error === 'object' && 'getStatus' in error) {
          throw error;
        }
        
        // Handle Prisma errors
        if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && error.code.startsWith('P')) {
          logger.error(`Database error: ${error.code}`, error);
          throw new Error('Database error occurred');
        }
        
        // Handle unknown errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Unexpected error: ${errorMessage}`);
        throw new Error('An unexpected error occurred');
      }
    };
  });
}; 