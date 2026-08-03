import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
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
export class SearchModule implements OnApplicationShutdown {
  constructor(
    @Inject(ELASTICSEARCH_CLIENT) private readonly client: Client,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await this.client.close();
  }
}
