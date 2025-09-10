import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueAdapterService as IQueueAdapterService } from '../interfaces/queue.interface';

@Injectable()
export class QueueAdapterService implements IQueueAdapterService, OnModuleInit {
  private readonly logger = new Logger(QueueAdapterService.name);
  private readonly queues = new Map<string, Queue>();

  constructor(
    @InjectQueue('news-queue') private readonly newsQueue: Queue,
  ) {}

  async onModuleInit() {
    this.registerQueue(this.newsQueue);
    this.logger.log(`🚀 Queue adapter service initialized with ${this.queues.size} queue(s)`);
  }

  /**
   * Get all registered queues
   */
  getQueues(): Queue[] {
    return Array.from(this.queues.values());
  }

  /**
   * Get a specific queue by name
   */
  getQueueByName(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  /**
   * Register a new queue
   */
  registerQueue(queue: Queue): void {
    this.queues.set(queue.name, queue);
    this.logger.log(`📊 Registered queue: ${queue.name}`);
  }

  /**
   * Unregister a queue
   */
  unregisterQueue(name: string): void {
    if (this.queues.delete(name)) {
      this.logger.log(`🗑️ Unregistered queue: ${name}`);
    } else {
      this.logger.warn(`⚠️ Queue not found for unregistration: ${name}`);
    }
  }

  /**
   * Get queue names
   */
  getQueueNames(): string[] {
    return Array.from(this.queues.keys());
  }

  /**
   * Check if a queue exists
   */
  hasQueue(name: string): boolean {
    return this.queues.has(name);
  }

  /**
   * Get total number of registered queues
   */
  getQueueCount(): number {
    return this.queues.size;
  }
}
