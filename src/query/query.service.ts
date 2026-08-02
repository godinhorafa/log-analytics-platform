import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type Redis from 'ioredis';
import { LogEntity } from '../storage/entities/log.entity';
import { REDIS_CLIENT } from '../storage/redis/redis.provider';
import {
  Cursor,
  decodeCursor,
  encodeCursor,
  Page,
} from '../common/dto/pagination.dto';
import { AggregationsQueryDto, LogFiltersDto } from './dto/log-filters.dto';

export interface LogRow {
  id: string;
  timestamp: string;
  service: string;
  severity: string;
  message: string;
  traceId: string | null;
}

export interface Aggregations {
  timeline: { bucket: string; severity: string; count: number }[];
  topErrorServices: { service: string; count: number }[];
}

const CACHE_PREFIX = 'agg:';

@Injectable()
export class QueryService {
  constructor(
    @InjectRepository(LogEntity) private readonly logs: Repository<LogEntity>,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  async listLogs(filters: LogFiltersDto): Promise<Page<LogRow>> {
    const limit = filters.limit ?? 50;
    const order = filters.order ?? 'DESC';

    const qb = this.logs
      .createQueryBuilder('l')
      .innerJoin('services', 's', 's.id = l.service_id')
      .select([
        'l.id AS id',
        'l.timestamp AS timestamp',
        's.name AS service',
        'l.severity AS severity',
        'l.message AS message',
        'l.trace_id AS "traceId"',
      ])
      .orderBy('l.timestamp', order)
      .addOrderBy('l.id', order)
      .limit(limit + 1);

    if (filters.service?.length)
      qb.andWhere('s.name IN (:...services)', { services: filters.service });
    if (filters.severity?.length)
      qb.andWhere('l.severity IN (:...severities)', {
        severities: filters.severity,
      });
    if (filters.from)
      qb.andWhere('l.timestamp >= :from', { from: filters.from });
    if (filters.to) qb.andWhere('l.timestamp <= :to', { to: filters.to });

    if (filters.cursor) {
      // Cursor vem do client: malformado é erro de request (400), não bug do servidor
      let cursor: Cursor;
      try {
        cursor = decodeCursor(filters.cursor);
      } catch {
        throw new BadRequestException('Cursor de paginação inválido');
      }
      const op = order === 'DESC' ? '<' : '>';
      qb.andWhere(`(l.timestamp, l.id) ${op} (:cursorTs, :cursorId)`, {
        cursorTs: cursor.timestamp,
        cursorId: cursor.id,
      });
    }

    const rows = await qb.getRawMany<LogRow>();
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const last = items[items.length - 1];
    const nextCursor =
      hasMore && last ? encodeCursor(this.toCursor(last)) : null;

    return { items, nextCursor };
  }

  private toCursor(row: LogRow): Cursor {
    return { timestamp: new Date(row.timestamp).toISOString(), id: row.id };
  }

  async aggregations(query: AggregationsQueryDto): Promise<Aggregations> {
    const from =
      query.from ?? new Date(Date.now() - 24 * 3600_000).toISOString();
    const to = query.to ?? new Date().toISOString();
    const cacheKey = `${CACHE_PREFIX}${from}:${to}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as Aggregations;

    const [timeline, topErrorServices] = await Promise.all([
      this.timelineQuery(from, to),
      this.topErrorServicesQuery(from, to),
    ]);

    const result: Aggregations = { timeline, topErrorServices };
    await this.redis.set(
      cacheKey,
      JSON.stringify(result),
      'EX',
      this.config.get<number>('cacheTtlSeconds')!,
    );
    return result;
  }

  // Bucket de 5min a partir da materialized view mv_log_volume_1m (db/schema.sql)
  private timelineQuery(from: string, to: string) {
    return this.dataSource
      .query<{ bucket: string; severity: string; count: string }[]>(
        `SELECT date_trunc('hour', bucket) + (extract(minute from bucket)::int / 5) * interval '5 min' AS bucket,
              severity, sum(log_count) AS count
       FROM mv_log_volume_1m
       WHERE bucket >= $1 AND bucket <= $2
       GROUP BY 1, 2
       ORDER BY 1`,
        [from, to],
      )
      .then((rows) => rows.map((r) => ({ ...r, count: Number(r.count) })));
  }

  private topErrorServicesQuery(from: string, to: string) {
    return this.dataSource
      .query<{ service: string; count: string }[]>(
        `SELECT s.name AS service, count(*) AS count
       FROM logs l JOIN services s ON s.id = l.service_id
       WHERE l.severity IN ('ERROR', 'FATAL')
         AND l.timestamp >= $1 AND l.timestamp <= $2
       GROUP BY s.name
       ORDER BY 2 DESC
       LIMIT 10`,
        [from, to],
      )
      .then((rows) => rows.map((r) => ({ ...r, count: Number(r.count) })));
  }
}
