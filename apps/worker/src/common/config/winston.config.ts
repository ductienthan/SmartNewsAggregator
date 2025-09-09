import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import { join } from 'path';

// Get the worker directory path
const workerDir = join(__dirname, '../../../..');
const logsDir = join(workerDir, 'logs');

export const winstonConfig = {
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        nestWinstonModuleUtilities.format.nestLike('SmartNewsWorker', {
          prettyPrint: true,
          colors: true,
        }),
      ),
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),

    // File transport for production logs
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({
        filename: join(logsDir, 'worker-error.log'),
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json(),
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: join(logsDir, 'worker-combined.log'),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json(),
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ] : []),

    // File transport for development (always enabled for worker)
    new winston.transports.File({
      filename: join(logsDir, 'worker-debug.log'),
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      maxsize: 10485760, // 10MB
      maxFiles: 3,
    }),
  ],

  // Global log level
  level: process.env.LOG_LEVEL || 'info',

  // Handle uncaught exceptions and unhandled rejections
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: join(logsDir, 'worker-exceptions.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
    }),
  ],

  rejectionHandlers: [
    new winston.transports.File({ 
      filename: join(logsDir, 'worker-rejections.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
    }),
  ],

  // Exit on error
  exitOnError: false,
};

// Custom log format for structured logging
export const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  winston.format.printf(({ timestamp, level, message, metadata, stack }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (metadata && typeof metadata === 'object' && Object.keys(metadata as object).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  }),
);

// Environment-specific configurations
export const getWinstonConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    ...winstonConfig,
    level: isProduction ? 'info' : 'debug',
    silent: process.env.NODE_ENV === 'test',
  };
};
