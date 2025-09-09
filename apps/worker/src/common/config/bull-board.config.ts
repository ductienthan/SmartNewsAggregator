import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import { Logger } from '@nestjs/common';

export interface BullBoardConfig {
  serverAdapter: ExpressAdapter;
  queues: BullMQAdapter[];
}

export const createBullBoardConfig = (queues: Queue[]): BullBoardConfig => {
  const logger = new Logger('BullBoardConfig');
  
  // Create Express adapter for Bull Board
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  // Create BullMQ adapters for each queue
  const queueAdapters = queues.map(queue => {
    logger.log(`📊 Adding queue to Bull Board: ${queue.name}`);
    return new BullMQAdapter(queue);
  });

  // Create Bull Board with all queue adapters
  createBullBoard({
    queues: queueAdapters,
    serverAdapter: serverAdapter,
  });

  logger.log(`✅ Bull Board configured with ${queues.length} queues`);
  logger.log(`🌐 Bull Board UI available at: http://localhost:3001/admin/queues`);

  return {
    serverAdapter,
    queues: queueAdapters,
  };
};
