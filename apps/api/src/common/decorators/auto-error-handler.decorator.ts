import { Logger } from '@nestjs/common';

export interface AutoErrorHandlerOptions {
  context?: string;
  logContext?: string;
  includeUserId?: boolean;
  userIdExtractor?: (args: any[]) => string | undefined;
}

export function AutoErrorHandler(options: AutoErrorHandlerOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const logger = new Logger(options.logContext || target.constructor.name);

    descriptor.value = async function (...args: any[]) {
      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } catch (error: unknown) {
        const context = options.context || `${target.constructor.name}.${propertyKey}`;
        
        // Extract user ID if needed
        let userId: string | undefined;
        if (options.includeUserId && options.userIdExtractor) {
          userId = options.userIdExtractor(args);
        }
        
        const userContext = userId ? ` for user: ${userId}` : '';
        logger.error(`${context} failed${userContext}`, error instanceof Error ? error.stack : 'Unknown error');
        
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

// Specialized decorators for common use cases
export function WithAuthErrorHandling() {
  return AutoErrorHandler({
    context: 'Authentication operation',
    logContext: 'AuthService',
    includeUserId: true,
    userIdExtractor: (args) => {
      // Extract email from first argument (usually the payload)
      const payload = args[0];
      return payload?.email || payload?.userId;
    }
  });
}

export function WithDatabaseErrorHandling() {
  return AutoErrorHandler({
    context: 'Database operation',
    logContext: 'DatabaseService',
    includeUserId: false
  });
}

export function WithValidationErrorHandling() {
  return AutoErrorHandler({
    context: 'Validation operation',
    logContext: 'ValidationService',
    includeUserId: false
  });
} 