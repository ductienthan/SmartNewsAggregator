import { Logger, BadRequestException, ValidationPipe, HttpStatus } from '@nestjs/common';

export abstract class BaseController {
  protected readonly logger: Logger;

  constructor(loggerContext: string) {
    this.logger = new Logger(loggerContext);
  }

  protected validateEmail(email: string): void {
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Invalid email format');
    }
  }

  protected validatePassword(password: string, minLength: number = 6): void {
    if (!password || password.trim().length < minLength) {
      throw new BadRequestException(`Password must be at least ${minLength} characters long`);
    }
  }

  protected validateRequired(value: any, fieldName: string): void {
    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      throw new BadRequestException(`${fieldName} is required`);
    }
  }

  protected getValidationPipe(): ValidationPipe {
    return new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      errorHttpStatusCode: HttpStatus.BAD_REQUEST
    });
  }

  protected logOperation(operation: string, userId?: string, details?: Record<string, any>): void {
    this.logger.log(`${operation}${userId ? ` for user: ${userId}` : ''}`, details);
  }

  protected logError(operation: string, error: unknown, userId?: string): void {
    this.logger.error(`${operation} failed${userId ? ` for user: ${userId}` : ''}`, 
      error instanceof Error ? error.stack : 'Unknown error');
  }
} 