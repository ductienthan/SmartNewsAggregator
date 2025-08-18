import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BullModule } from '@nestjs/bullmq';
import { TestingProcessor } from './processors/testing-processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'SnagWorker',
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService, TestingProcessor],
})
export class AppModule {}
