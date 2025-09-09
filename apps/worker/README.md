# Smart News Aggregator - Worker Service

A NestJS-based worker service for the Smart News Aggregator that handles background job processing, news aggregation, and queue management with a modular Bull Board UI.

## 🏗️ Architecture

The worker service is built with a modular architecture following SOLID principles:

```
src/
├── common/
│   ├── config/           # Configuration files
│   ├── interfaces/       # TypeScript interfaces
│   ├── modules/          # Feature modules
│   └── services/         # Core services
├── controllers/          # API controllers
├── database/            # Database services
├── processors/          # BullMQ job processors
├── services/            # Business logic services
├── sources/             # External data sources
└── tasks/               # Scheduled tasks
```

## 🚀 Features

### Core Functionality
- **News Aggregation**: Automated fetching from Hacker News API
- **Background Processing**: BullMQ-based job queue system
- **Scheduled Tasks**: Cron-based news collection every 30 minutes
- **Database Storage**: PostgreSQL integration with Prisma ORM
- **Deduplication**: Advanced article deduplication with retry strategy
- **Logging**: Winston-based structured logging

### Queue Management
- **Bull Board UI**: Web-based queue monitoring and management
- **Queue Statistics**: Real-time queue performance metrics
- **Job Management**: View, retry, and clean up jobs
- **Health Monitoring**: Queue health checks and status reporting

## 📦 Installation

```bash
# Install dependencies
pnpm install

# Build the application
pnpm build

# Start in development mode
pnpm dev
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/smartnews"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Logging
LOG_LEVEL=debug
NODE_ENV=development
```

### Docker Setup

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f worker
```

## 🌐 API Endpoints

### Queue Management API (`/v1/queues/`)

#### Statistics
- `GET /stats` - Get statistics for all queues
- `GET /stats/:queueName` - Get statistics for specific queue

#### Job Management
- `GET /jobs` - Get recent jobs from all queues
- `GET /jobs/:queueName` - Get jobs from specific queue with filtering

#### Maintenance
- `POST /clean` - Clean old completed/failed jobs
- `GET /health` - Health check for all queues
- `GET /list` - List all registered queues
- `GET /info/:queueName` - Detailed queue information

### Bull Board UI (`/v1/admin/`)

- `GET /queues` - Bull Board web interface
- `GET /status` - Bull Board status and configuration

### Scheduler API (`/v1/scheduler/`)

- `POST /news/trigger` - Manually trigger news aggregation
- `GET /news/status` - Get aggregation status
- `GET /database/stats` - Database statistics
- `GET /database/duplicates` - Duplicate article statistics
- `POST /database/bulk-insert` - Bulk insert articles
- `POST /database/cleanup-duplicates` - Clean up duplicates

## 🎯 Queue System

### Available Queues

1. **news-queue**: Processes news aggregation jobs
   - `process-news-batch`: Batch processing of news articles
   - `cleanup-old-articles`: Cleanup of old articles

### Job Types

#### News Batch Processing
```typescript
{
  stories: ProcessedStory[],
  source: 'hacker-news',
  batchId: string,
  timestamp: string
}
```

#### Cleanup Jobs
```typescript
{
  olderThanDays: number
}
```

## 🏛️ Modular Architecture

### Core Services

#### QueueAdapterService
- **Purpose**: Manages queue registration and discovery
- **Features**: Register/unregister queues, queue enumeration
- **Interface**: `IQueueAdapterService`

#### QueueStatsService
- **Purpose**: Handles queue statistics and job management
- **Features**: Statistics, job retrieval, cleanup operations
- **Interface**: `IQueueManagementService`

#### BullBoardService
- **Purpose**: Manages Bull Board UI configuration
- **Features**: UI setup, reinitialization, status monitoring

### Controllers

#### QueueManagementController
- **Purpose**: RESTful API for queue operations
- **Features**: Statistics, job management, health checks

#### BullBoardController
- **Purpose**: Serves Bull Board web interface
- **Features**: UI routing, status endpoints

#### SchedulerController
- **Purpose**: Manages scheduled tasks and news sources
- **Features**: Manual triggers, database operations

## 📊 Monitoring & Observability

### Bull Board UI

Access the web interface at: `http://localhost:3001/v1/admin/queues/`

**Features:**
- Real-time queue monitoring
- Job inspection and management
- Retry failed jobs
- Clean up old jobs
- Queue statistics and performance metrics

### Logging

The service uses Winston for structured logging:

```typescript
// Log levels: error, warn, info, debug
// Log files: worker-debug.log, worker-exceptions.log
```

### Health Checks

```bash
# Check queue health
curl http://localhost:3001/v1/queues/health

# Check Bull Board status
curl http://localhost:3001/v1/admin/status
```

## 🔄 Background Processing

### News Aggregation Flow

1. **Scheduled Trigger**: Cron job runs every 30 minutes
2. **Data Fetching**: Retrieves stories from Hacker News API
3. **Queue Processing**: Jobs are queued for background processing
4. **Deduplication**: Articles are checked for duplicates
5. **Database Storage**: Valid articles are stored in PostgreSQL
6. **Cleanup**: Old articles are cleaned up automatically

### Retry Strategy

- **Max Retries**: 3 attempts
- **Backoff Strategy**: Exponential backoff (1s, 2s, 4s)
- **Error Handling**: Comprehensive error logging and recovery

## 🛠️ Development

### Adding New Queues

1. Register queue in `app.module.ts`:
```typescript
BullModule.registerQueue({
  name: 'new-queue',
  connection: { host: process.env.REDIS_HOST, port: 6379 }
})
```

2. Create processor:
```typescript
@Processor('new-queue')
export class NewQueueProcessor extends WorkerHost {
  @Process('job-name')
  async processJob(job: Job) {
    // Job processing logic
  }
}
```

3. Queue will be automatically discovered by `QueueAdapterService`

### Adding New Job Types

1. Define job data interface
2. Add processor method with `@Process('job-type')`
3. Use `NewsQueueService` to add jobs to queue

### Testing

```bash
# Run tests
pnpm test

# Run e2e tests
pnpm test:e2e

# Test coverage
pnpm test:cov
```

## 🚀 Deployment

### Production Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start:prod
```

### Docker Deployment

```bash
# Build Docker image
docker build -t smart-news-worker .

# Run container
docker run -p 3001:3001 smart-news-worker
```

## 📈 Performance

### Optimization Features

- **Batch Processing**: Articles processed in chunks
- **Connection Pooling**: Efficient database connections
- **Redis Caching**: Fast queue operations
- **Retry Strategy**: Resilient error handling
- **Deduplication**: Prevents duplicate processing

### Monitoring Metrics

- Queue depth and processing rates
- Job success/failure rates
- Database operation performance
- Memory and CPU usage
- Error rates and types

## 🔒 Security

- **Input Validation**: All inputs are validated
- **Error Handling**: Secure error messages
- **Rate Limiting**: Prevents API abuse
- **Health Checks**: Monitoring for anomalies

## 🤝 Contributing

1. Follow the modular architecture patterns
2. Add proper TypeScript interfaces
3. Include comprehensive logging
4. Write tests for new features
5. Update documentation

## 📝 License

This project is part of the Smart News Aggregator system.

---

For more information, see the main project documentation or contact the development team.