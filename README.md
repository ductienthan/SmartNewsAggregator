# Smart News Aggregator

A modern news aggregation platform built with NestJS, featuring a microservices architecture with API and worker services, powered by BullMQ for job processing and PostgreSQL for data persistence.

## 🏗️ Architecture

This application follows a microservices architecture with the following components:

- **API Service** (`@snag/api`) - RESTful API for news aggregation
- **Worker Service** (`@snag/worker`) - Background job processing
- **Shared Package** (`@snag/share`) - Common utilities and DTOs
- **PostgreSQL** - Primary database
- **Redis** - BullMQ queue management

## 🚀 Features

- **News Aggregation** - Collect and process news from various sources
- **Job Queue System** - Asynchronous job processing with BullMQ
- **API Versioning** - RESTful API with version control
- **Swagger Documentation** - Interactive API documentation
- **Environment Configuration** - Flexible configuration management
- **Docker Support** - Containerized deployment
- **TypeScript** - Full type safety

## 📋 Prerequisites

- **Node.js** 22.18.0 or higher
- **pnpm** 10.5.2 or higher
- **Docker** and **Docker Compose** (for containerized deployment)
- **PostgreSQL** 15+ (if running locally)
- **Redis** 7+ (if running locally)

## 🛠️ Installation

### Option 1: Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smart-news-aggregator
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start PostgreSQL and Redis**
   ```bash
   # Using Docker (recommended)
   docker run -d --name postgres -e POSTGRES_DB=smart-news -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=smartnews123 -p 5432:5432 postgres:15-alpine
   docker run -d --name redis -p 6379:6379 redis:7-alpine
   
   # Or install locally and start services
   ```

5. **Build shared packages**
   ```bash
   pnpm build:share
   ```

6. **Start the services**
   ```bash
   # Start both API and worker in development mode
   pnpm dev
   
   # Or start individually
   pnpm api:dev      # API only
   pnpm worker:dev   # Worker only
   ```

### Option 2: Docker Compose (Recommended)

1. **Clone and navigate to the repository**
   ```bash
   git clone <repository-url>
   cd smart-news-aggregator
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env if needed
   ```

3. **Start all services**
   ```bash
   docker-compose up --build
   ```

4. **Access the services**
   - API: http://localhost:3000
   - Worker: http://localhost:3001
   - Swagger Docs: http://localhost:3000/docs

## 🔧 Available Scripts

### Root Level Commands
```bash
# Development
pnpm dev                    # Start both API and worker in dev mode
pnpm start                  # Start both services in production mode
pnpm start:prod            # Start both services in production mode

# Individual Services
pnpm api:dev               # Start API in development mode
pnpm api:start             # Start API in production mode
pnpm worker:dev            # Start worker in development mode
pnpm worker:start          # Start worker in production mode

# Building
pnpm build                 # Build all packages
pnpm build:api             # Build API only
pnpm build:worker          # Build worker only
pnpm build:share           # Build shared package only

# Testing
pnpm api:test              # Run API unit tests
pnpm worker:test           # Run worker unit tests
pnpm test:e2e              # Run e2e tests
```

### Docker Commands
```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f api
docker-compose logs -f worker

# Rebuild and start
docker-compose up --build
```

## 🌐 API Endpoints

### Base URL: `http://localhost:3000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/` | Health check |
| GET | `/v1/health` | Health status |
| POST | `/v1/add-job` | Add a job to the queue |
| GET | `/docs` | Swagger documentation |

### Example Usage

```bash
# Health check
curl http://localhost:3000/v1/health

# Add a job
curl -X POST http://localhost:3000/v1/add-job \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello World!"}'
```

## 🔍 Monitoring

### BullMQ Dashboard
Access the BullMQ dashboard to monitor job queues:
- Navigate to your API endpoint
- Check Redis for queue status

### Redis Commands for Queue Monitoring
```bash
# Connect to Redis
redis-cli

# Check BullMQ keys
KEYS "*SnagWorker*"

# Get queue status
LLEN bull:SnagWorker:wait
LLEN bull:SnagWorker:active
LLEN bull:SnagWorker:completed

# Get job data
HGETALL bull:SnagWorker:1
```

## 🧪 Testing

```bash
# Unit tests
pnpm api:test
pnpm worker:test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm api:test:cov
```

## 📁 Project Structure

```
smart-news-aggregator/
├── apps/
│   ├── api/                 # API service
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   └── main.ts
│   │   └── package.json
│   └── worker/              # Worker service
│       ├── src/
│       │   ├── processors/
│       │   └── main.ts
│       └── package.json
├── packages/
│   └── share/               # Shared utilities
│       ├── src/
│       └── package.json
├── docker-compose.yml       # Docker services
├── package.json            # Root package.json
└── README.md
```

## 🔐 Environment Variables

See `.env.example` for all available environment variables.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the Swagger docs at `/docs`
