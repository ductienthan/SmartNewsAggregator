import { Module } from '@nestjs/common';
import { QueueAdapterService } from '../services/queue-adapter.service';
import { QueueStatsService } from '../services/queue-stats.service';
import { BullBoardService } from '../services/bull-board.service';

@Module({
  providers: [
    QueueAdapterService,
    QueueStatsService,
    BullBoardService,
  ],
  exports: [
    QueueAdapterService,
    QueueStatsService,
    BullBoardService,
  ],
})
export class QueueModule {}
