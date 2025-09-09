import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
import { TestingProcessor } from './processors/testing-processor';
import { NewsProcessor } from './processors/news-processor';
import { ScheduledTasksService } from './tasks/scheduled-tasks.service';
import { NewsSchedulerService } from './tasks/news-scheduler.service';
import { SchedulerController } from './controllers/scheduler.controller';
import { BullBoardController } from './controllers/bull-board.controller';
import { QueueManagementController } from './controllers/queue-management.controller';
import { HackerNewsService } from './sources';
import { NewsStorageService } from './database/news-storage.service';
import { NewsQueueService } from './services/news-queue.service';
import { QueueModule } from './common/modules/queue.module';
import { getWinstonConfig } from './common/config/winston.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    WinstonModule.forRoot(getWinstonConfig()),
    ScheduleModule.forRoot(),
    QueueModule,
    BullModule.registerQueue({
      name: 'SnagWorker',
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
      },
    }),
    BullModule.registerQueue({
      name: 'news-queue',
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
      },
    }),
  ],
  controllers: [
    AppController, 
    SchedulerController, 
    BullBoardController,
    QueueManagementController
  ],
  providers: [
    AppService, 
    TestingProcessor,
    NewsProcessor,
    ScheduledTasksService, 
    NewsSchedulerService, 
    HackerNewsService,
    NewsStorageService,
    NewsQueueService
  ],
})
export class AppModule {}
