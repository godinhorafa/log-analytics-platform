import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { SearchModule } from '../search/search.module';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { BatchWriter } from './batch-writer.service';
import { FormatDetector } from './parsers/format-detector';
import { JsonlParser } from './parsers/jsonl.parser';
import { NginxParser } from './parsers/nginx.parser';
import { SyslogParser } from './parsers/syslog.parser';

@Module({
  imports: [StorageModule, SearchModule],
  controllers: [UploadController],
  providers: [
    UploadService,
    BatchWriter,
    FormatDetector,
    JsonlParser,
    NginxParser,
    SyslogParser,
  ],
})
export class IngestionModule {}
