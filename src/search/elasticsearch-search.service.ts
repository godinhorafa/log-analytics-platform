import { Inject, Injectable, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import {
  IndexableLog,
  SearchEngine,
  SearchHit,
  SearchOptions,
} from './search.interface';
import { ELASTICSEARCH_CLIENT, LOGS_INDEX } from './elasticsearch.provider';

// Implementação concreta de SearchEngine (ADR-004). Trocar por um provider
// Postgres full-text (tsvector) é uma questão de reimplementar esta classe
// e mudar o binding em search.module.ts — controllers não mudam.
@Injectable()
export class ElasticsearchSearchService extends SearchEngine {
  private readonly logger = new Logger(ElasticsearchSearchService.name);

  constructor(@Inject(ELASTICSEARCH_CLIENT) private readonly client: Client) {
    super();
  }

  async index(log: IndexableLog): Promise<void> {
    await this.client.index({ index: LOGS_INDEX, id: log.id, document: log });
  }

  async bulkIndex(logs: IndexableLog[]): Promise<void> {
    if (!logs.length) return;
    const operations = logs.flatMap((log) => [
      { index: { _index: LOGS_INDEX, _id: log.id } },
      log,
    ]);
    const result = await this.client.bulk({ operations });
    if (result.errors) {
      const failed = result.items.filter((item) => item.index?.error).length;
      this.logger.warn(
        `Bulk index: ${failed}/${logs.length} documentos falharam`,
      );
    }
  }

  async search(query: string, opts: SearchOptions = {}): Promise<SearchHit[]> {
    const filter: Record<string, unknown>[] = [];
    if (opts.from || opts.to) {
      filter.push({
        range: {
          timestamp: {
            ...(opts.from ? { gte: opts.from } : {}),
            ...(opts.to ? { lte: opts.to } : {}),
          },
        },
      });
    }
    // .keyword: match EXATO. No campo text o analyzer minusculiza os tokens
    // ("ERROR" vira "error") e um terms com "ERROR" nunca bateria.
    if (opts.services?.length)
      filter.push({ terms: { 'service.keyword': opts.services } });
    if (opts.severities?.length)
      filter.push({ terms: { 'severity.keyword': opts.severities } });

    const result = await this.client.search<IndexableLog>({
      index: LOGS_INDEX,
      size: opts.limit ?? 50,
      query: {
        bool: {
          must: [{ match: { message: query } }],
          filter,
        },
      },
    });

    return result.hits.hits.map((hit) => ({
      id: hit._id!,
      timestamp: hit._source!.timestamp,
      service: hit._source!.service,
      severity: hit._source!.severity,
      message: hit._source!.message,
      score: hit._score ?? 0,
    }));
  }
}
