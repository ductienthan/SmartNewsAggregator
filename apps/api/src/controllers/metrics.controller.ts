import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { MetricsService } from '../common/services/metrics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Metrics')
@Controller({
  version: '1',
  path: 'metrics'
})
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Public() // Metrics endpoint should be public for monitoring tools
  @ApiOperation({ 
    summary: 'Get Prometheus metrics',
    description: 'Exposes application metrics in Prometheus format for monitoring and observability'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Prometheus metrics in text format',
    schema: {
      type: 'string',
      example: '# HELP http_requests_total Total number of HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total{method="GET",path="/health",status_code="200"} 42'
    }
  })
  async getMetrics(@Res() res: Response): Promise<void> {
    try {
      const metrics = await this.metricsService.getMetrics();
      
      res.set({
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.send(metrics);
    } catch (error) {
      res.status(500).send('# Error collecting metrics\n');
    }
  }

  @Get('health')
  @Public()
  @ApiOperation({ 
    summary: 'Metrics service health check',
    description: 'Check if the metrics service is healthy and collecting data'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Metrics service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', example: '2024-01-15T10:00:00.000Z' },
        service: { type: 'string', example: 'metrics' },
        uptime: { type: 'number', example: 3600 }
      }
    }
  })
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'metrics',
      uptime: process.uptime()
    };
  }

  @Get('reset')
  @UseGuards(JwtAuthGuard) // Only authenticated users can reset metrics
  @ApiOperation({ 
    summary: 'Reset metrics (Admin only)',
    description: 'Reset all collected metrics. Use with caution in production.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Metrics reset successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Metrics reset successfully' },
        timestamp: { type: 'string', example: '2024-01-15T10:00:00.000Z' }
      }
    }
  })
  async resetMetrics() {
    this.metricsService.resetMetrics();
    
    return {
      message: 'Metrics reset successfully',
      timestamp: new Date().toISOString()
    };
  }
} 