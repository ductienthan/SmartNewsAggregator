import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueAdapterService } from '../services/queue-adapter.service';
import { QueueStatsService } from '../services/queue-stats.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'news-queue',
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
      },
    }),
  ],
  providers: [
    QueueAdapterService,
    QueueStatsService,
  ],
  exports: [
    BullModule, // Export the BullModule to make queues available to other modules
    QueueAdapterService,
    QueueStatsService,
  ],
})
export class QueueModule {}
