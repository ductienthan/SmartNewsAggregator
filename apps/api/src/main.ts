import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { VersioningType } from '@nestjs/common'
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  })
  app.enableCors()
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  })
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    //make class-validator error concise
    exceptionFactory: (errors) => {
      const message = errors.map(e => (
        {
          field: e.property,
          constraints: e.constraints
        }
      ))
      return new BadRequestException(JSON.stringify(message))
    },
  }))

  const config = new DocumentBuilder()
    .setTitle('Snag API')
    .setDescription('Snag API description')
    .setVersion('1.0')
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, document)

  const configService = app.get(ConfigService)
  const port = configService.get<number>('PORT') ?? 3000
  // Winston logger will handle request logging through the MetricsInterceptor
  app.useGlobalFilters(
    new PrismaClientExceptionFilter(),
    new AllExceptionsFilter()
  )
  await app.listen(port, '0.0.0.0')
}
bootstrap()
