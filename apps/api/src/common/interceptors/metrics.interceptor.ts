import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MetricsService } from '../services/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const method = request.method;
    const path = request.route?.path || request.path;
    const startTime = Date.now();

    // Start tracking request
    this.metricsService.startHttpRequest(method, path);

    return next.handle().pipe(
      tap(() => {
        // Record successful request
        const duration = (Date.now() - startTime) / 1000; // Convert to seconds
        this.metricsService.recordHttpRequest(method, path, response.statusCode, duration);
        this.metricsService.endHttpRequest(method, path);
      }),
      catchError((error) => {
        // Record failed request
        const duration = (Date.now() - startTime) / 1000; // Convert to seconds
        const statusCode = error.status || 500;
        this.metricsService.recordHttpRequest(method, path, statusCode, duration);
        this.metricsService.endHttpRequest(method, path);
        
        throw error;
      })
    );
  }
} 