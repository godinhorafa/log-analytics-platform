import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { QueryController } from './query.controller';
import { QueryService } from './query.service';

@Module({
  imports: [StorageModule],
  controllers: [QueryController],
  providers: [QueryService],
})
export class QueryModule {}
