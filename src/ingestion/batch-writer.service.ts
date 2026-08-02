import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import type Redis from 'ioredis';
import { LogEntity } from '../storage/entities/log.entity';
import { ServicesRepository } from '../storage/services.repository';
import { REDIS_CLIENT } from '../storage/redis/redis.provider';
import { SearchEngine } from '../search/search.interface';
import { withRetry } from '../common/retry';
import { ParsedLog } from './parsers/parser.interface';

const AGGREGATION_CACHE_PREFIX = 'agg:';

// Recebe um batch de ParsedLog já normalizados e escreve nos dois destinos
// (Postgres + Elasticsearch) em uma única operação em lote por destino (ADR-002/ADR-004).
@Injectable()
export class BatchWriter {
  private readonly logger = new Logger(BatchWriter.name);

  constructor(
    @InjectRepository(LogEntity) private readonly logs: Repository<LogEntity>,
    private readonly services: ServicesRepository,
    private readonly search: SearchEngine,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async flush(uploadId: string, batch: ParsedLog[]): Promise<void> {
    if (!batch.length) return;

    const rows: LogEntity[] = [];
    for (const log of batch) {
      const serviceId = await this.services.resolveId(log.service);
      const row = this.logs.create({
        id: randomUUID(),
        timestamp: log.timestamp,
        uploadId,
        serviceId,
        severity: log.severity,
        message: log.message,
        traceId: log.traceId ?? null,
        metadata: log.metadata ?? {},
      });
      rows.push(row);
    }

    // Ordem deliberada: PG (fonte de verdade) primeiro, ES depois — se o ES
    // falhar permanentemente, a busca fica incompleta mas os dados estão
    // íntegros; o inverso violaria o ADR-004. Retry cobre indisponibilidade
    // transitória de cada destino.
    //
    // multi-row insert: TypeORM gera um único INSERT ... VALUES (..), (..), ...
    // (o utilitário de tipos do TypeORM não infere bem colunas jsonb com index
    // signature — cast explícito em vez de enfraquecer o tipo de LogEntity.metadata)
    await withRetry(
      () => this.logs.insert(rows as QueryDeepPartialEntity<LogEntity>[]),
      {
        onRetry: (err, attempt) =>
          this.logger.warn(
            `INSERT em lote no Postgres falhou (tentativa ${attempt}): ${errMessage(err)}`,
          ),
      },
    );

    await withRetry(
      () =>
        this.search.bulkIndex(
          rows.map((row, i) => ({
            id: row.id,
            timestamp: row.timestamp.toISOString(),
            service: batch[i].service,
            severity: row.severity,
            message: row.message,
            metadata: row.metadata,
          })),
        ),
      {
        onRetry: (err, attempt) =>
          this.logger.warn(
            `Bulk no Elasticsearch falhou (tentativa ${attempt}): ${errMessage(err)}`,
          ),
      },
    );
  }

  async invalidateAggregationCache(): Promise<void> {
    // CONCURRENTLY exige o índice único idx_mv_volume_pk (db/schema.sql) — sem ele
    // o refresh bloquearia leituras da view enquanto os gráficos consultam.
    await this.dataSource.query(
      'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_log_volume_1m',
    );
    const keys = await this.redis.keys(`${AGGREGATION_CACHE_PREFIX}*`);
    if (keys.length) await this.redis.del(...keys);
  }
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
