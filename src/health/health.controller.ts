import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Client } from '@elastic/elasticsearch';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../storage/redis/redis.provider';
import { ELASTICSEARCH_CLIENT } from '../search/elasticsearch.provider';

type DependencyStatus = 'up' | 'down';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(ELASTICSEARCH_CLIENT) private readonly elasticsearch: Client,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  async check() {
    const [postgres, elasticsearch, redis] = await Promise.all([
      this.checkPostgres(),
      this.checkElasticsearch(),
      this.checkRedis(),
    ]);

    const dependencies = { postgres, elasticsearch, redis };
    const healthy = Object.values(dependencies).every(
      (status) => status === 'up',
    );

    if (!healthy)
      throw new ServiceUnavailableException({ status: 'error', dependencies });
    return { status: 'ok', dependencies };
  }

  private async checkPostgres(): Promise<DependencyStatus> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkElasticsearch(): Promise<DependencyStatus> {
    try {
      await this.elasticsearch.ping();
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }
}
