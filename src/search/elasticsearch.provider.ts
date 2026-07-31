import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

export const ELASTICSEARCH_CLIENT = Symbol('ELASTICSEARCH_CLIENT');
export const LOGS_INDEX = 'logs';

export const elasticsearchProvider: Provider = {
  provide: ELASTICSEARCH_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    new Client({ node: config.get<string>('elasticsearchUrl') }),
};
