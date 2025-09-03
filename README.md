# 🚀 Smart News Aggregator

A comprehensive news aggregation platform built with NestJS, featuring JWT authentication, role-based access control, Prometheus metrics, Winston logging, and a microservices architecture.

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [Authentication & Authorization](#-authentication--authorization)
- [Monitoring & Observability](#-monitoring--observability)
- [Database Management](#-database-management)
- [Development](#-development)
- [Production Deployment](#-production-deployment)
- [Contributing](#-contributing)

## ✨ Features

### 🔐 **Authentication & Security**
- **JWT-based authentication** with access and refresh tokens
- **Role-based access control** (USER, ADMIN roles)
- **Token blacklisting** for secure logout
- **Password hashing** with configurable secrets
- **6-hour maximum token validity** for enhanced security

### 📊 **Monitoring & Observability**
- **Prometheus metrics** collection and exposure
- **Winston structured logging** with multiple transports
- **HTTP request monitoring** with response times and status codes
- **Business metrics** tracking (user registrations, token operations)
- **Database performance monitoring**

### 🏗️ **Architecture**
- **Monorepo structure** with pnpm workspaces
- **Microservices architecture** (API + Worker)
- **Docker containerization** for development and production
- **PostgreSQL database** with Prisma ORM
- **Redis** for caching and token blacklist

### 🎯 **API Features**
- **RESTful API** with versioning (v1)
- **Swagger/OpenAPI documentation**
- **Input validation** with class-validator
- **Error handling** with custom filters and decorators
- **Rate limiting** and security headers

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Service   │    │  Worker Service │
│   (React/Vue)   │◄──►│   (NestJS)      │◄──►│   (NestJS)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   PostgreSQL    │    │      Redis      │
                       │   (Database)    │    │   (Cache/Queue) │
                       └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Prometheus    │    │     Grafana     │
                       │   (Metrics)     │    │   (Dashboard)   │
                       └─────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

### **Backend Framework**
- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe JavaScript
- **Prisma** - Modern database ORM
- **Passport.js** - Authentication middleware

### **Database & Cache**
- **PostgreSQL** - Primary database
- **Redis** - Caching and token blacklist
- **Prisma** - Database client and migrations

### **Authentication & Security**
- **JWT** - JSON Web Tokens
- **bcrypt** - Password hashing
- **class-validator** - Input validation

### **Monitoring & Logging**
- **Prometheus** - Metrics collection
- **Winston** - Structured logging
- **Grafana** - Metrics visualization

### **Development Tools**
- **pnpm** - Package manager
- **Docker** - Containerization
- **ESLint** - Code linting
- **Jest** - Testing framework

## 📁 Project Structure

```
smart-news-aggregator/
├── apps/
│   ├── api/                          # Main API service
│   │   ├── src/
│   │   │   ├── common/               # Shared utilities
│   │   │   │   ├── base/            # Base classes
│   │   │   │   ├── decorators/      # Custom decorators
│   │   │   │   ├── filters/         # Exception filters
│   │   │   │   ├── guards/          # Authentication guards
│   │   │   │   ├── interceptors/    # HTTP interceptors
│   │   │   │   ├── services/        # Business logic
│   │   │   │   └── strategies/      # JWT strategy
│   │   │   ├── controllers/         # API endpoints
│   │   │   ├── modules/             # Feature modules
│   │   │   └── prisma/              # Database client
│   │   ├── Dockerfile               # API container
│   │   └── package.json
│   └── worker/                       # Background job worker
│       ├── src/
│       ├── Dockerfile               # Worker container
│       └── package.json
├── packages/
│   └── share/                        # Shared DTOs and types
│       ├── src/
│       │   ├── auth/                # Authentication DTOs
│       │   ├── common/              # Common DTOs
│       │   └── index.ts
│       └── package.json
├── prisma/                           # Database schema and migrations
├── scripts/                          # Utility scripts
├── docker-compose.yml                # Development environment
├── docker-compose.prod.yml           # Production environment
└── package.json                      # Root package.json
```

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+ 
- pnpm 8+
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 6+

### **1. Clone the Repository**
```bash
git clone <repository-url>
cd smart-news-aggregator
```

### **2. Install Dependencies**
```bash
pnpm install
```

### **3. Environment Setup**
```bash
# Copy environment template
cp env.example .env

# Edit .env with your configuration
nano .env
```

**Required Environment Variables:**
```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/smart-news"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_ACCESS_SECRET=your_jwt_access_secret_here
JWT_ACCESS_TTL=30m
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
JWT_REFRESH_TTL=7d

# Security
HASH_SECRET=your_hash_secret_here

# Logging
LOG_LEVEL=info
```

### **4. Start Development Environment**
```bash
# Start PostgreSQL and Redis
pnpm dev:start

# Setup database
pnpm db:setup

# Create admin user
./scripts/create-admin.sh

# Start API in development mode
pnpm api:dev
```

### **5. Verify Installation**
```bash
# Health check
curl http://localhost:3000/v1/auth/ping

# API documentation
open http://localhost:3000/docs
```

## 📚 API Documentation

### **Authentication Endpoints**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/v1/auth/register` | Register new user | ❌ |
| POST | `/v1/auth/login` | Login user | ❌ |
| POST | `/v1/auth/logout` | Logout user | ✅ |
| POST | `/v1/auth/refresh` | Refresh access token | ❌ |

### **User Management Endpoints**

| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| GET | `/v1/users/profile` | Get user profile | ✅ | Any |
| GET | `/v1/users/protected` | Protected route example | ✅ | Any |

### **Admin Endpoints**

| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| DELETE | `/v1/admin/users/:userId` | Delete user by ID | ✅ | ADMIN |
| GET | `/v1/admin/users` | List all users | ✅ | ADMIN |
| GET | `/v1/admin/users/:userId` | Get user details | ✅ | ADMIN |

### **Monitoring Endpoints**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/v1/metrics` | Prometheus metrics | ❌ |
| GET | `/v1/metrics/health` | Metrics service health | ❌ |
| GET | `/v1/metrics/reset` | Reset metrics | ✅ |

## 🔐 Authentication & Authorization

### **JWT Token Structure**
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "USER",
  "iat": 1642234567,
  "exp": 1642236367
}
```

### **Security Features**
- **Token Validation**: Signature, expiry, payload structure
- **Blacklist Checking**: Rejects revoked tokens
- **Maximum Expiry**: 6-hour maximum validity period
- **Role-Based Access**: USER and ADMIN roles
- **Password Security**: bcrypt hashing with configurable secrets

### **Usage Examples**

#### **Login and Get Token**
```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

#### **Access Protected Route**
```bash
curl -X GET http://localhost:3000/v1/users/profile \
  -H "Authorization: Bearer <your_jwt_token>"
```

#### **Admin Operations**
```bash
# Delete user (Admin only)
curl -X DELETE http://localhost:3000/v1/admin/users/user_id \
  -H "Authorization: Bearer <admin_jwt_token>"

# List all users (Admin only)
curl -X GET http://localhost:3000/v1/admin/users \
  -H "Authorization: Bearer <admin_jwt_token>"
```

## 📊 Monitoring & Observability

### **Prometheus Metrics**

The application exposes comprehensive metrics at `/v1/metrics`:

#### **HTTP Metrics**
- `http_requests_total` - Total request count by method, path, status
- `http_request_duration_seconds` - Request duration distribution
- `http_requests_in_progress` - Currently active requests

#### **Authentication Metrics**
- `auth_attempts_total` - Login attempts (success/failure)
- `auth_success_total` - Successful authentications
- `auth_failure_total` - Failed authentications by reason

#### **Business Metrics**
- `users_registered_total` - User registration count
- `tokens_generated_total` - JWT token generation
- `tokens_blacklisted_total` - Token blacklisting

#### **System Metrics**
- `nodejs_heap_size_total_bytes` - Memory usage
- `process_cpu_user_seconds_total` - CPU usage
- `nodejs_eventloop_lag_seconds` - Event loop performance

### **Winston Logging**

Structured logging with multiple transports:

- **Console**: Development-friendly colored output
- **File**: Production logs with rotation
- **HTTP**: External logging service integration

### **Metrics Collection**

Automatic metrics collection via:
- **HTTP Interceptor**: Request/response metrics
- **Service Integration**: Business logic metrics
- **Default Metrics**: Node.js system metrics

## 🗄️ Database Management

### **Prisma Commands**
```bash
# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate:deploy

# Reset database
pnpm prisma:migrate:reset

# Seed database
pnpm prisma:db:seed

# View database
pnpm prisma:studio
```

### **Database Schema**
- **User Management**: Authentication, roles, preferences
- **Content Management**: Articles, sources, clusters
- **User Engagement**: Bookmarks, digests, alerts
- **Analytics**: Feedback, usage tracking

## 🛠️ Development

### **Available Scripts**
```bash
# Development
pnpm dev:start          # Start development services
pnpm dev:stop           # Stop development services
pnpm dev:reset          # Reset development environment
pnpm dev:status         # Show service status
pnpm dev:logs           # Show service logs

# API
pnpm api:dev            # Start API in development mode
pnpm api:build          # Build API
pnpm api:start          # Start API in production mode
pnpm api:test           # Run API tests

# Database
pnpm db:setup           # Setup database and run migrations
pnpm db:reset           # Reset database
pnpm db:seed            # Seed database with sample data

# Prisma
pnpm prisma:generate    # Generate Prisma client
pnpm prisma:migrate     # Run database migrations
pnpm prisma:studio      # Open Prisma Studio
```

### **Code Quality**
- **ESLint**: Code linting and formatting
- **TypeScript**: Strict type checking
- **Prettier**: Code formatting
- **Jest**: Unit and integration testing

### **Development Workflow**
1. **Feature Development**: Create feature branch
2. **Code Implementation**: Follow NestJS patterns
3. **Testing**: Write unit and integration tests
4. **Documentation**: Update API docs and README
5. **Review**: Submit pull request for review

## 🚀 Production Deployment

### **Docker Deployment**
```bash
# Build production images
pnpm build:prod

# Deploy with Docker Compose
pnpm deploy:prod

# Update existing deployment
pnpm update:prod
```

### **Environment Configuration**
```env
NODE_ENV=production
LOG_LEVEL=info
JWT_ACCESS_SECRET=<strong_secret>
JWT_REFRESH_SECRET=<strong_secret>
HASH_SECRET=<strong_secret>
```

### **Monitoring Setup**
1. **Prometheus**: Scrape metrics from `/v1/metrics`
2. **Grafana**: Create dashboards for visualization
3. **Alerting**: Configure alerts for critical metrics
4. **Log Aggregation**: Centralize logs for analysis

### **Security Considerations**
- **HTTPS**: Use SSL/TLS in production
- **Secrets Management**: Use environment variables or secret managers
- **Rate Limiting**: Implement API rate limiting
- **CORS**: Configure appropriate CORS policies
- **Input Validation**: Validate all user inputs

## 🤝 Contributing

### **Development Setup**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests and documentation
5. Submit a pull request

### **Code Standards**
- Follow NestJS conventions
- Use TypeScript strict mode
- Write comprehensive tests
- Document API changes
- Follow commit message conventions

### **Testing**
```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:cov

# Run e2e tests
pnpm test:e2e

# Run specific test suite
pnpm test:unit
pnpm test:integration
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **NestJS Team** - For the excellent framework
- **Prisma Team** - For the modern database toolkit
- **Prometheus Community** - For the monitoring ecosystem
- **Open Source Contributors** - For all the amazing libraries

---

**Built with ❤️ using modern web technologies**

For questions and support, please open an issue or contact the development team.
