import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';

export const winstonConfig = {
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        nestWinstonModuleUtilities.format.nestLike('SmartNewsAPI', {
          prettyPrint: true,
          colors: true,
        }),
      ),
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),

    // File transport for production logs
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({
        filename: 'logs/error.log',
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
        filename: 'logs/combined.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json(),
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ] : []),

    // HTTP transport for external logging services (optional)
    ...(process.env.LOG_HTTP_URL ? [
      new winston.transports.Http({
        host: process.env.LOG_HTTP_HOST || 'localhost',
        port: parseInt(process.env.LOG_HTTP_PORT || '3000'),
        path: process.env.LOG_HTTP_PATH || '/logs',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    ] : []),
  ],

  // Global log level
  level: process.env.LOG_LEVEL || 'info',

  // Handle uncaught exceptions and unhandled rejections
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: 'logs/exceptions.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
    }),
  ],

  rejectionHandlers: [
    new winston.transports.File({ 
      filename: 'logs/rejections.log',
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