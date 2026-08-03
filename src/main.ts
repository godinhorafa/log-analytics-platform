import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  // Aberto de propósito: sem auth/cookies no escopo (ADR-008); produção restringiria origens
  app.enableCors();
  app.enableShutdownHooks(); // SIGTERM do Docker → fecha PG/ES/Redis limpo
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
