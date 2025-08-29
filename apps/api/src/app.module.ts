import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { z } from 'zod'
import { ConfigModule } from '@nestjs/config'
import { BullModule } from '@nestjs/bullmq'
import { AddJobService } from './services/addJobService'
import { resolve } from 'path'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth.module'

const EnvSchema = z.object({
  PORT: z.number().default(3000),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  REDIS_HOST: z.string(),
  REDIS_PORT: z.string(),
  REDIS_PASSWORD: z.string().optional().default(''),
  DATABASE_URL: z.string(),
})

const ROOT_ENV = resolve(process.cwd(), '../../.env')

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [ROOT_ENV],
      validate: (config) => EnvSchema.parse(config),
    }),
    BullModule.registerQueue({
      name: 'SnagWorker',
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
      },
    }),
    PrismaModule,
    AuthModule
  ],
  controllers: [AppController],
  providers: [AppService, AddJobService],
})
export class AppModule {}
