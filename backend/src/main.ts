import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function parseCorsOrigins(frontendUrl: string): string | string[] {
  const origins = frontendUrl
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  for (const origin of origins) {
    new URL(origin);
  }

  return origins.length === 1 ? origins[0] : origins;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const frontendUrl = configService.getOrThrow<string>('FRONTEND_URL');
  const port = configService.get<number>('PORT') ?? 3000;

  app.enableCors({
    origin: parseCorsOrigins(frontendUrl),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  await app.listen(port);
}

bootstrap();
