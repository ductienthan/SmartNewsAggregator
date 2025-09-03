import { Injectable, OnModuleInit } from '@nestjs/common';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  // HTTP request metrics
  private httpRequestsTotal!: Counter<string>;
  private httpRequestDuration!: Histogram<string>;
  private httpRequestsInProgress!: Gauge<string>;

  // Authentication metrics
  private authAttemptsTotal!: Counter<string>;
  private authSuccessTotal!: Counter<string>;
  private authFailureTotal!: Counter<string>;

  // Database metrics
  private dbQueryDuration!: Histogram<string>;
  private dbConnectionsActive!: Gauge<string>;

  // Business logic metrics
  private usersRegisteredTotal!: Counter<string>;
  private tokensGeneratedTotal!: Counter<string>;
  private tokensBlacklistedTotal!: Counter<string>;

  onModuleInit() {
    this.initializeMetrics();
    this.startDefaultMetrics();
  }

  private initializeMetrics() {
    // HTTP metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status_code'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path'],
      buckets: [0.1, 0.5, 1, 2, 5],
    });

    this.httpRequestsInProgress = new Gauge({
      name: 'http_requests_in_progress',
      help: 'Number of HTTP requests currently in progress',
      labelNames: ['method', 'path'],
    });

    // Authentication metrics
    this.authAttemptsTotal = new Counter({
      name: 'auth_attempts_total',
      help: 'Total number of authentication attempts',
      labelNames: ['method', 'status'],
    });

    this.authSuccessTotal = new Counter({
      name: 'auth_success_total',
      help: 'Total number of successful authentications',
      labelNames: ['method'],
    });

    this.authFailureTotal = new Counter({
      name: 'auth_failure_total',
      help: 'Total number of failed authentications',
      labelNames: ['method', 'reason'],
    });

    // Database metrics
    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
    });

    this.dbConnectionsActive = new Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      labelNames: ['database'],
    });

    // Business logic metrics
    this.usersRegisteredTotal = new Counter({
      name: 'users_registered_total',
      help: 'Total number of users registered',
      labelNames: ['status'],
    });

    this.tokensGeneratedTotal = new Counter({
      name: 'tokens_generated_total',
      help: 'Total number of JWT tokens generated',
      labelNames: ['type'],
    });

    this.tokensBlacklistedTotal = new Counter({
      name: 'tokens_blacklisted_total',
      help: 'Total number of JWT tokens blacklisted',
      labelNames: ['reason'],
    });
  }

  private startDefaultMetrics() {
    // Collect default Node.js metrics
    collectDefaultMetrics({
      prefix: 'node_',
      labels: { app: 'smart-news-aggregator' },
    });
  }

  // HTTP metrics methods
  recordHttpRequest(method: string, path: string, statusCode: number, duration: number) {
    this.httpRequestsTotal.inc({ method, path, status_code: statusCode.toString() });
    this.httpRequestDuration.observe({ method, path }, duration);
  }

  startHttpRequest(method: string, path: string) {
    this.httpRequestsInProgress.inc({ method, path });
  }

  endHttpRequest(method: string, path: string) {
    this.httpRequestsInProgress.dec({ method, path });
  }

  // Authentication metrics methods
  recordAuthAttempt(method: string, status: 'success' | 'failure') {
    this.authAttemptsTotal.inc({ method, status });
    if (status === 'success') {
      this.authSuccessTotal.inc({ method });
    } else {
      this.authFailureTotal.inc({ method, reason: 'invalid_credentials' });
    }
  }

  recordAuthFailure(method: string, reason: string) {
    this.authFailureTotal.inc({ method, reason });
  }

  // Database metrics methods
  recordDbQuery(operation: string, table: string, duration: number) {
    this.dbQueryDuration.observe({ operation, table }, duration);
  }

  setDbConnectionsActive(database: string, count: number) {
    this.dbConnectionsActive.set({ database }, count);
  }

  // Business logic metrics methods
  recordUserRegistration(status: 'success' | 'failure') {
    this.usersRegisteredTotal.inc({ status });
  }

  recordTokenGeneration(type: 'access' | 'refresh') {
    this.tokensGeneratedTotal.inc({ type });
  }

  recordTokenBlacklist(reason: 'logout' | 'expired' | 'manual') {
    this.tokensBlacklistedTotal.inc({ reason });
  }

  // Get metrics for Prometheus endpoint
  async getMetrics(): Promise<string> {
    return await register.metrics();
  }

  // Reset metrics (useful for testing)
  resetMetrics() {
    register.clear();
    this.initializeMetrics();
  }
} 