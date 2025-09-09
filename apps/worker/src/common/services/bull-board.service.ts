import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createBullBoardConfig, BullBoardConfig } from '../config/bull-board.config';
import { QueueAdapterService } from './queue-adapter.service';

@Injectable()
export class BullBoardService implements OnModuleInit {
  private readonly logger = new Logger(BullBoardService.name);
  private bullBoardConfig: BullBoardConfig | null = null;

  constructor(private readonly queueAdapter: QueueAdapterService) {}

  async onModuleInit() {
    try {
      // Initialize Bull Board with all available queues
      const queues = this.queueAdapter.getQueues();
      
      this.bullBoardConfig = createBullBoardConfig(queues);
      
      this.logger.log('🚀 Bull Board service initialized successfully');
      this.logger.log(`📊 Monitoring ${queues.length} queue(s): ${queues.map(q => q.name).join(', ')}`);
    } catch (error) {
      this.logger.error(`❌ Failed to initialize Bull Board: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the Bull Board server adapter for Express integration
   */
  getServerAdapter() {
    if (!this.bullBoardConfig) {
      throw new Error('Bull Board not initialized');
    }
    return this.bullBoardConfig.serverAdapter;
  }

  /**
   * Reinitialize Bull Board with current queues (useful when queues are added/removed)
   */
  async reinitialize() {
    try {
      const queues = this.queueAdapter.getQueues();
      this.bullBoardConfig = createBullBoardConfig(queues);
      
      this.logger.log(`🔄 Bull Board reinitialized with ${queues.length} queue(s)`);
    } catch (error) {
      this.logger.error(`❌ Failed to reinitialize Bull Board: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if Bull Board is properly initialized
   */
  isInitialized(): boolean {
    return this.bullBoardConfig !== null;
  }

  /**
   * Get the number of queues being monitored
   */
  getMonitoredQueueCount(): number {
    return this.queueAdapter.getQueueCount();
  }

  /**
   * Get the names of monitored queues
   */
  getMonitoredQueueNames(): string[] {
    return this.queueAdapter.getQueueNames();
  }
}
