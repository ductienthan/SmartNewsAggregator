import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { z } from 'zod'
import { ConfigModule } from '@nestjs/config'
import { BullModule } from '@nestjs/bullmq'
import { AddJobService } from './services/addJobService'

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  REDIS_HOST: z.string(),
  REDIS_PORT: z.string(),
  REDIS_PASSWORD: z.string().optional().default(''),
  DATABASE_URL: z.string(),
})


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
      validate: (config) => EnvSchema.parse(config),
    }),
    BullModule.registerQueue({
      name: 'SnagWorker',
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService, AddJobService],
})
export class AppModule {}
