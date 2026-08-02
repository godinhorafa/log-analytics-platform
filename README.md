# Log Analytics Platform

Plataforma de análise de logs: importação de arquivos em streaming, classificação automática de formato, armazenamento dual (PostgreSQL + Elasticsearch), consulta com filtros, busca full-text e agregações para dashboard.

> As decisões técnicas e trade-offs estão documentados em [ARCHITECTURE.md](ARCHITECTURE.md) (ADRs).

## Stack

- **API**: Node.js 20 · TypeScript · NestJS
- **Dados**: PostgreSQL 16 (fonte de verdade, particionado por data) · Elasticsearch 8 (busca full-text) · Redis 7 (cache de agregações)
- **Testes**: Jest (unitários) · Supertest + Testcontainers (integração)

## Como rodar

Pré-requisitos: Docker + Node 20+.

```bash
cp .env.example .env

# Infra (Postgres com schema, Elasticsearch, Redis)
docker compose up -d postgres elasticsearch redis

npm install
npm run start:dev
```

Ou o stack completo (API containerizada junto):

```bash
docker compose up -d --build
```

A API sobe em `http://localhost:3000`. As envs são validadas no boot (Joi) — faltou variável, o processo não sobe.

## Testando com dados sintéticos

O gerador produz arquivos nos 3 formatos suportados (com ~2% de linhas corrompidas de propósito, para demonstrar a resiliência do parser):

```bash
npx ts-node scripts/generate-logs.ts --format jsonl  --count 50000  --out samples/app.jsonl
npx ts-node scripts/generate-logs.ts --format nginx  --count 50000  --out samples/access.log
npx ts-node scripts/generate-logs.ts --format syslog --count 50000  --out samples/system.log

# Upload (o formato é detectado automaticamente)
curl -F "file=@samples/app.jsonl" http://localhost:3000/uploads
# → {"uploadId":"..."}

# Progresso/resultado do processamento
curl http://localhost:3000/uploads/<uploadId>
```

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/uploads` | Upload multipart em streaming (JSON Lines, Nginx/Apache, syslog — detecção automática) |
| `GET` | `/uploads` | Histórico de uploads |
| `GET` | `/uploads/:id` | Status: formato detectado, linhas totais/parseadas/com erro |
| `GET` | `/logs` | Lista com filtros (`severity`, `service`, `from`, `to`) e paginação por cursor keyset (`cursor`, `limit`, `order`) |
| `GET` | `/logs/aggregations` | Timeline por severidade (buckets 5min) + top serviços com erro — cache Redis 60s, invalidado ao fim de cada upload |
| `GET` | `/search?q=...` | Busca full-text nas mensagens (Elasticsearch), com os mesmos filtros |
| `GET` | `/health` | Checa PG, ES e Redis |

Exemplos:

```bash
curl "http://localhost:3000/logs?severity=ERROR,FATAL&limit=50"
curl "http://localhost:3000/logs/aggregations?from=2026-07-30T00:00:00Z&to=2026-07-31T00:00:00Z"
curl "http://localhost:3000/search?q=timeout&severity=ERROR"
```

## Testes

```bash
npm test          # unitários (parsers, detector de formato, retry)
npm run test:e2e  # integração com Testcontainers (requer Docker): pipeline completo
```

Os testes de integração sobem Postgres/Elasticsearch/Redis reais, aplicam o schema versionado e exercitam upload → status → consulta → busca de ponta a ponta.

## Estrutura

```
src/
├── ingestion/   # upload em streaming, detecção de formato, parsers, batch writer
├── query/       # listagem com keyset pagination + agregações com cache
├── search/      # busca full-text (abstração SearchEngine → Elasticsearch)
├── storage/     # entities, repositórios, providers de Redis
├── health/      # health check das 3 dependências
├── common/      # paginação por cursor, retry com backoff, exception filter
└── config/      # envs tipadas e validadas no boot
db/schema.sql    # schema versionado (particionamento, índices, materialized view)
scripts/         # gerador de logs sintéticos
```

O schema não é gerado pelo ORM (`synchronize: false`) — é versionado em SQL e montado no initdb do container. Em produção, viraria migration.
