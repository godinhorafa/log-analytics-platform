import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import type Redis from 'ioredis';
import { LogEntity } from './entities/log.entity';
import { ServiceEntity } from './entities/service.entity';
import { UploadEntity } from './entities/upload.entity';
import { redisProvider, REDIS_CLIENT } from './redis/redis.provider';
import { UploadsRepository } from './uploads.repository';
import { ServicesRepository } from './services.repository';

@Module({
  imports: [TypeOrmModule.forFeature([LogEntity, ServiceEntity, UploadEntity])],
  providers: [redisProvider, UploadsRepository, ServicesRepository],
  exports: [
    TypeOrmModule,
    redisProvider,
    REDIS_CLIENT,
    UploadsRepository,
    ServicesRepository,
  ],
})
export class StorageModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // Sem isso, a conexão do ioredis mantém o event loop vivo — app.close()
  // nunca encerra (visível nos testes de integração e no SIGTERM do Docker)
  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit();
  }
}
