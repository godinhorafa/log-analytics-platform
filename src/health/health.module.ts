import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { SearchModule } from '../search/search.module';
import { HealthController } from './health.controller';

@Module({
  imports: [StorageModule, SearchModule],
  controllers: [HealthController],
})
export class HealthModule {}
