# Queue Management System

A modular queue management system built with BullMQ, Bull Board, and NestJS that provides comprehensive queue monitoring, job management, and web-based administration.

## 🏗️ Architecture Overview

```
common/
├── interfaces/          # TypeScript contracts
│   └── queue.interface.ts
├── modules/            # Feature modules
│   └── queue.module.ts
├── services/           # Core services
│   ├── queue-adapter.service.ts
│   ├── queue-stats.service.ts
│   └── bull-board.service.ts
└── config/            # Configuration
    └── bull-board.config.ts
```

## 🎯 Design Principles

### Single Responsibility Principle
Each service has one clear purpose:
- **QueueAdapterService**: Queue registration and discovery
- **QueueStatsService**: Statistics and job management
- **BullBoardService**: UI configuration and setup

### Dependency Injection
Services are properly injected and testable with clear interfaces.

### Interface Segregation
Clear contracts between components with focused interfaces.

## 📋 Interfaces

### QueueAdapterService Interface
```typescript
interface QueueAdapterService {
  getQueues(): Queue[];
  getQueueByName(name: string): Queue | undefined;
  registerQueue(queue: Queue): void;
  unregisterQueue(name: string): void;
}
```

### QueueManagementService Interface
```typescript
interface QueueManagementService {
  getQueueStats(): Promise<QueueStats[]>;
  getRecentJobs(limit?: number): Promise<{ [queueName: string]: JobInfo[] }>;
  cleanOldJobs(olderThanDays?: number): Promise<QueueCleanupResult>;
  getHealthStatus(): Promise<QueueHealthStatus>;
}
```

## 🔧 Services

### QueueAdapterService

**Purpose**: Central registry for all BullMQ queues

**Features**:
- Automatic queue discovery on module initialization
- Queue registration and unregistration
- Queue enumeration and lookup
- Thread-safe queue management

**Usage**:
```typescript
// Get all queues
const queues = queueAdapter.getQueues();

// Get specific queue
const newsQueue = queueAdapter.getQueueByName('news-queue');

// Register new queue
queueAdapter.registerQueue(newQueue);
```

### QueueStatsService

**Purpose**: Comprehensive queue statistics and job management

**Features**:
- Real-time queue statistics
- Job retrieval with filtering
- Bulk cleanup operations
- Health monitoring
- Per-queue operations

**Usage**:
```typescript
// Get all queue stats
const stats = await queueStatsService.getQueueStats();

// Get recent jobs
const jobs = await queueStatsService.getRecentJobs(10);

// Clean old jobs
const result = await queueStatsService.cleanOldJobs(7);
```

### BullBoardService

**Purpose**: Bull Board UI configuration and management

**Features**:
- Automatic UI setup with all registered queues
- Reinitialization when queues change
- Status monitoring
- Express adapter management

**Usage**:
```typescript
// Get Express adapter for routing
const adapter = bullBoardService.getServerAdapter();

// Check initialization status
const isReady = bullBoardService.isInitialized();

// Reinitialize with current queues
await bullBoardService.reinitialize();
```

## 🌐 API Endpoints

### Queue Management (`/v1/queues/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats` | All queue statistics |
| GET | `/stats/:queueName` | Specific queue stats |
| GET | `/jobs` | Recent jobs from all queues |
| GET | `/jobs/:queueName` | Jobs from specific queue |
| POST | `/clean` | Clean old jobs |
| GET | `/health` | Health check |
| GET | `/list` | List all queues |
| GET | `/info/:queueName` | Queue information |

### Bull Board UI (`/v1/admin/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/queues` | Bull Board web interface |
| GET | `/queues/*` | All Bull Board routes |
| GET | `/status` | Bull Board status |

## 📊 Data Models

### QueueStats
```typescript
interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}
```

### JobInfo
```typescript
interface JobInfo {
  id: string | number;
  name: string;
  data: any;
  progress: number | object;
  state: string;
  createdAt: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
}
```

### QueueHealthStatus
```typescript
interface QueueHealthStatus {
  status: 'healthy' | 'unhealthy';
  message: string;
  queues: number;
  timestamp: string;
  error?: string;
}
```

## 🔄 Usage Examples

### Adding a New Queue

1. **Register in Module**:
```typescript
BullModule.registerQueue({
  name: 'email-queue',
  connection: { host: 'localhost', port: 6379 }
})
```

2. **Inject in Service**:
```typescript
constructor(
  @InjectQueue('email-queue') private emailQueue: Queue
) {}
```

3. **Auto-Discovery**: Queue is automatically registered by `QueueAdapterService`

### Custom Queue Operations

```typescript
// Get queue-specific statistics
const emailStats = await queueStatsService.getQueueStatsByName('email-queue');

// Get jobs by state
const failedJobs = await queueStatsService.getJobsByState(
  'email-queue', 
  ['failed'], 
  50
);

// Check queue health
const health = await queueStatsService.getHealthStatus();
```

### Bull Board Integration

```typescript
// Serve UI in controller
@Get('admin/queues/*')
async serveUI(@Req() req, @Res() res, @Next() next) {
  const adapter = this.bullBoardService.getServerAdapter();
  return adapter.getRouter()(req, res, next);
}
```

## 🧪 Testing

### Unit Testing
```typescript
describe('QueueStatsService', () => {
  let service: QueueStatsService;
  let queueAdapter: QueueAdapterService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [QueueStatsService, QueueAdapterService]
    }).compile();

    service = module.get<QueueStatsService>(QueueStatsService);
    queueAdapter = module.get<QueueAdapterService>(QueueAdapterService);
  });

  it('should get queue statistics', async () => {
    const stats = await service.getQueueStats();
    expect(stats).toBeDefined();
  });
});
```

### Integration Testing
```typescript
describe('Queue Management API', () => {
  it('should return queue statistics', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/queues/stats')
      .expect(200);

    expect(response.body.queues).toBeDefined();
  });
});
```

## 🚀 Performance Considerations

### Optimization Strategies
- **Batch Operations**: Process multiple jobs efficiently
- **Connection Pooling**: Reuse Redis connections
- **Caching**: Cache frequently accessed statistics
- **Lazy Loading**: Load job details only when needed

### Monitoring
- Queue depth monitoring
- Job processing rates
- Error rates and patterns
- Memory usage tracking

## 🔒 Security

### Best Practices
- Input validation on all endpoints
- Rate limiting for API calls
- Secure error messages
- Authentication for admin endpoints

### Error Handling
```typescript
try {
  const stats = await queueStatsService.getQueueStats();
  return { success: true, data: stats };
} catch (error) {
  logger.error('Failed to get queue stats', error);
  return { success: false, error: 'Internal server error' };
}
```

## 📈 Extensibility

### Adding New Features
1. Define interfaces for new functionality
2. Implement services following existing patterns
3. Add controllers for API endpoints
4. Update module exports
5. Add comprehensive tests

### Plugin Architecture
The modular design allows for easy extension:
- Custom queue adapters
- Additional statistics providers
- Alternative UI implementations
- Custom job processors

---

This queue management system provides a robust, scalable foundation for background job processing with comprehensive monitoring and administration capabilities.
