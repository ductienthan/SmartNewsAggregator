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
import { UserController } from './controllers/user.controller'
import { AdminController } from './controllers/admin.controller'
import { MetricsController } from './controllers/metrics.controller'
import { MetricsService } from './common/services/metrics.service'
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor'
import { UserService } from './services/user.service'
import { WinstonModule } from 'nest-winston'
import { getWinstonConfig } from './common/config/winston.config'

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  REDIS_HOST: z.string(),
  REDIS_PORT: z.string(),
  REDIS_PASSWORD: z.string().optional().default(''),
  DATABASE_URL: z.string(),
  LOG_LEVEL: z.string().optional().default('info'),
  LOG_HTTP_URL: z.string().optional(),
  LOG_HTTP_HOST: z.string().optional(),
  LOG_HTTP_PORT: z.string().optional(),
  LOG_HTTP_PATH: z.string().optional(),
})

const ROOT_ENV = resolve(process.cwd(), '../../.env')

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [ROOT_ENV],
      validate: (config) => EnvSchema.parse(config),
    }),
    WinstonModule.forRoot(getWinstonConfig()),
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
  controllers: [AppController, UserController, AdminController, MetricsController],
  providers: [
    AppService, 
    AddJobService, 
    MetricsService,
    UserService,
    {
      provide: 'APP_INTERCEPTOR',
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
