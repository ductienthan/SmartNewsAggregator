import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable versioning for /v1/* routes
  app.enableVersioning({
    type: VersioningType.URI,
  });
  
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
