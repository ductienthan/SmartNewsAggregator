// Set environment variables for e2e tests
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.DATABASE_URL = 'sqlite::memory:'; 