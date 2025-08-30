import { ValidationPipe, HttpStatus, Logger, BadRequestException } from '@nestjs/common';

export interface AutoControllerOptions {
  validateEmail?: boolean;
  validatePassword?: boolean;
  validateRequired?: string[];
  logContext?: string;
  includeUserId?: boolean;
  userIdExtractor?: (args: any[]) => string | undefined;
}

export function AutoController(options: AutoControllerOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const logger = new Logger(options.logContext || target.constructor.name);

    descriptor.value = async function (...args: any[]) {
      try {
        // Extract payload from first argument (usually @Body())
        const payload = args[0];
        
        // Auto-validation based on options
        if (options.validateEmail && payload?.email) {
          if (!payload.email || !payload.email.includes('@')) {
            throw new BadRequestException('Invalid email format');
          }
        }

        if (options.validatePassword && payload?.password) {
          if (!payload.password || payload.password.length < 6) {
            throw new BadRequestException('Password must be at least 6 characters long');
          }
        }

        if (options.validateRequired) {
          for (const field of options.validateRequired) {
            if (!payload?.[field] || (typeof payload[field] === 'string' && payload[field].trim().length === 0)) {
              throw new BadRequestException(`${field} is required`);
            }
          }
        }

        // Extract user ID for logging if needed
        let userId: string | undefined;
        if (options.includeUserId && options.userIdExtractor) {
          userId = options.userIdExtractor(args);
        }

        // Log operation start
        const userContext = userId ? ` for user: ${userId}` : '';
        logger.log(`${propertyKey} operation started${userContext}`);

        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Log success
        logger.log(`${propertyKey} operation completed successfully${userContext}`);

        return result;
      } catch (error: unknown) {
        // Extract user ID for error logging
        let userId: string | undefined;
        if (options.includeUserId && options.userIdExtractor) {
          userId = options.userIdExtractor(args);
        }

        const userContext = userId ? ` for user: ${userId}` : '';
        logger.error(`${propertyKey} operation failed${userContext}`, error instanceof Error ? error.stack : 'Unknown error');

        // Re-throw the error (will be handled by global exception filter)
        throw error;
      }
    };

    return descriptor;
  };
}

// Specialized decorators for common controller operations
export function WithAuthValidation() {
  return AutoController({
    validateEmail: true,
    validatePassword: true,
    validateRequired: ['email', 'password'],
    logContext: 'AuthController',
    includeUserId: true,
    userIdExtractor: (args) => args[0]?.email
  });
}

export function WithUserValidation() {
  return AutoController({
    validateEmail: true,
    validateRequired: ['email'],
    logContext: 'UserController',
    includeUserId: true,
    userIdExtractor: (args) => args[0]?.email || args[0]?.userId
  });
}

export function WithBasicValidation(requiredFields: string[] = []) {
  return AutoController({
    validateRequired: requiredFields,
    logContext: 'BaseController',
    includeUserId: false
  });
} 