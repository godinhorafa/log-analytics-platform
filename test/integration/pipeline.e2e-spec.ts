import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { Client as PgClient } from 'pg';
import { AppModule } from '../../src/app.module';

/**
 * Teste de integração do pipeline completo contra PG/ES/Redis REAIS
 * (Testcontainers): upload → detecção de formato → parse em streaming →
 * batch write dual → status consultável → consulta filtrada → busca full-text.
 *
 * É o teste que o mock não substitui: valida schema SQL, mapeamento das
 * entities, mapping do índice ES e o wiring dos módulos de uma vez.
 */
jest.setTimeout(300_000);

describe('Pipeline de ingestão (integração)', () => {
  let postgres: StartedTestContainer;
  let elasticsearch: StartedTestContainer;
  let redis: StartedTestContainer;
  let app: INestApplication<App>;
  let esUrl: string;

  beforeAll(async () => {
    [postgres, elasticsearch, redis] = await Promise.all([
      new GenericContainer('postgres:16-alpine')
        .withEnvironment({
          POSTGRES_USER: 'loguser',
          POSTGRES_PASSWORD: 'logpass',
          POSTGRES_DB: 'logs',
        })
        .withExposedPorts(5432)
        .withWaitStrategy(
          Wait.forLogMessage(/database system is ready to accept connections/, 2),
        )
        .start(),
      new GenericContainer('elasticsearch:8.13.4')
        .withEnvironment({
          'discovery.type': 'single-node',
          'xpack.security.enabled': 'false',
          ES_JAVA_OPTS: '-Xms512m -Xmx512m',
        })
        .withExposedPorts(9200)
        .withWaitStrategy(Wait.forHttp('/_cluster/health', 9200))
        .start(),
      new GenericContainer('redis:7-alpine')
        .withExposedPorts(6379)
        .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
        .start(),
    ]);

    const pgUrl = `postgres://loguser:logpass@${postgres.getHost()}:${postgres.getMappedPort(5432)}/logs`;
    esUrl = `http://${elasticsearch.getHost()}:${elasticsearch.getMappedPort(9200)}`;

    // Mesmo schema versionado que o docker-compose monta no initdb
    const schema = readFileSync(
      join(__dirname, '..', '..', 'db', 'schema.sql'),
      'utf8',
    );
    const pg = new PgClient({ connectionString: pgUrl });
    await pg.connect();
    await pg.query(schema);
    await pg.end();

    process.env.DATABASE_URL = pgUrl;
    process.env.ELASTICSEARCH_URL = esUrl;
    process.env.REDIS_URL = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`;

    // Envs precisam estar setadas ANTES do compile(): é nele que o
    // ConfigModule valida o schema e as factories leem process.env
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await Promise.all([
      postgres?.stop(),
      elasticsearch?.stop(),
      redis?.stop(),
    ]);
  });

  // 40 linhas JSONL válidas (timestamps na partição 2026-07-30) + 4 corrompidas
  // após a janela de amostragem de 20 linhas usada pela detecção de formato
  function buildFile(): { content: string; valid: number; corrupt: number } {
    const lines: string[] = [];
    for (let i = 0; i < 40; i++) {
      lines.push(
        JSON.stringify({
          timestamp: `2026-07-30T12:${String(i).padStart(2, '0')}:00.000Z`,
          level: i % 10 === 0 ? 'ERROR' : 'INFO',
          service: i % 2 === 0 ? 'api-gateway' : 'billing',
          message:
            i % 10 === 0
              ? `Timeout connecting to billing after ${i}ms`
              : `Request completed in ${i}ms`,
        }),
      );
      if (i >= 20 && i % 5 === 0) lines.push('linha corrompida sem formato');
    }
    const corrupt = lines.length - 40;
    return { content: lines.join('\n') + '\n', valid: 40, corrupt };
  }

  let uploadId: string;

  it('processa um upload JSONL de ponta a ponta', async () => {
    const file = buildFile();

    const res = await request(app.getHttpServer())
      .post('/uploads')
      .attach('file', Buffer.from(file.content), 'app.jsonl')
      .expect(201);
    uploadId = (res.body as { uploadId: string }).uploadId;
    expect(uploadId).toBeDefined();

    // Polling do status até concluir (o processamento é assíncrono ao registro)
    let status: Record<string, unknown> = {};
    for (let i = 0; i < 60; i++) {
      const s = await request(app.getHttpServer())
        .get(`/uploads/${uploadId}`)
        .expect(200);
      status = s.body as Record<string, unknown>;
      if (status.status !== 'PROCESSING') break;
      await new Promise((r) => setTimeout(r, 500));
    }

    expect(status.status).toBe('COMPLETED');
    expect(status.detectedFormat).toBe('jsonl');
    expect(status.parsedLines).toBe(file.valid);
    expect(status.errorLines).toBe(file.corrupt);
  });

  it('lista logs com filtro de severidade e paginação por cursor', async () => {
    const first = await request(app.getHttpServer())
      .get('/logs')
      .query({ severity: 'ERROR', limit: 2 })
      .expect(200);

    const page1 = first.body as {
      items: { severity: string; service: string }[];
      nextCursor: string | null;
    };
    // 4 ERRORs no arquivo (i = 0, 10, 20, 30) → 2 na primeira página
    expect(page1.items).toHaveLength(2);
    expect(page1.items.every((l) => l.severity === 'ERROR')).toBe(true);
    expect(page1.nextCursor).not.toBeNull();

    const second = await request(app.getHttpServer())
      .get('/logs')
      .query({ severity: 'ERROR', limit: 2, cursor: page1.nextCursor })
      .expect(200);
    const page2 = second.body as typeof page1;
    expect(page2.items).toHaveLength(2);
    // keyset: nenhuma repetição entre páginas
    const ids1 = new Set(page1.items.map((l) => JSON.stringify(l)));
    for (const item of page2.items) {
      expect(ids1.has(JSON.stringify(item))).toBe(false);
    }
  });

  it('rejeita cursor malformado com 400 (não 500)', async () => {
    await request(app.getHttpServer())
      .get('/logs')
      .query({ cursor: 'nao-e-um-cursor' })
      .expect(400);
  });

  it('retorna agregações consistentes com o arquivo importado', async () => {
    const res = await request(app.getHttpServer())
      .get('/logs/aggregations')
      .query({ from: '2026-07-30T00:00:00Z', to: '2026-07-31T00:00:00Z' })
      .expect(200);

    const body = res.body as {
      timeline: { severity: string; count: number }[];
      topErrorServices: { service: string; count: number }[];
    };
    const total = body.timeline.reduce((acc, b) => acc + b.count, 0);
    expect(total).toBe(40);
    // Os 4 ERRORs (i = 0,10,20,30) caem em api-gateway (i par)
    expect(body.topErrorServices).toEqual([
      { service: 'api-gateway', count: 4 },
    ]);
  });

  it('encontra logs por busca full-text', async () => {
    // bulk do ES não força refresh (custo em produção) — força aqui pro teste
    await fetch(`${esUrl}/logs/_refresh`, { method: 'POST' });

    const res = await request(app.getHttpServer())
      .get('/search')
      .query({ q: 'timeout' })
      .expect(200);

    const hits = res.body as { message: string; severity: string }[];
    expect(hits.length).toBe(4);
    expect(hits.every((h) => /timeout/i.test(h.message))).toBe(true);
  });

  it('aplica filtro de severidade na busca (match exato via .keyword)', async () => {
    const withFilter = await request(app.getHttpServer())
      .get('/search')
      .query({ q: 'timeout', severity: 'ERROR' })
      .expect(200);
    const hits = withFilter.body as { severity: string }[];
    expect(hits.length).toBe(4);
    expect(hits.every((h) => h.severity === 'ERROR')).toBe(true);

    // severidade sem ocorrências do termo → vazio (filtro realmente filtra)
    const none = await request(app.getHttpServer())
      .get('/search')
      .query({ q: 'timeout', severity: 'DEBUG' })
      .expect(200);
    expect(none.body).toEqual([]);
  });

  it('exige o parâmetro q na busca', async () => {
    await request(app.getHttpServer()).get('/search').expect(400);
  });
});
