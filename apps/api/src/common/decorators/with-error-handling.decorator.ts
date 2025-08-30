import { Logger } from '@nestjs/common';

export interface ErrorHandlingOptions {
  context?: string;
  logContext?: string;
  rethrowKnown?: boolean;
}

export function WithErrorHandling(options: ErrorHandlingOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const logger = new Logger(options.logContext || target.constructor.name);

    descriptor.value = async function (...args: any[]) {
      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } catch (error: unknown) {
        const context = options.context || `${target.constructor.name}.${propertyKey}`;
        
        logger.error(`${context} failed`, error instanceof Error ? error.stack : 'Unknown error');
        
        // Re-throw known exceptions (HttpException, etc.)
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

    return descriptor;
  };
} 