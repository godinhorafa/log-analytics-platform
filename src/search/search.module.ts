import { Module } from '@nestjs/common';
import { SearchEngine } from './search.interface';
import { ElasticsearchSearchService } from './elasticsearch-search.service';
import {
  elasticsearchProvider,
  ELASTICSEARCH_CLIENT,
} from './elasticsearch.provider';
import { SearchController } from './search.controller';

@Module({
  controllers: [SearchController],
  providers: [
    elasticsearchProvider,
    { provide: SearchEngine, useClass: ElasticsearchSearchService },
  ],
  exports: [SearchEngine, elasticsearchProvider, ELASTICSEARCH_CLIENT],
})
export class SearchModule {}
