import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
export class StorageModule {}
