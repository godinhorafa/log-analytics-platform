-- ============================================================
-- Plataforma de Análise de Logs — Schema PostgreSQL
-- Fonte de verdade dos logs normalizados + agregações do dashboard
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- Enum de severidade (padrão syslog simplificado)
-- ------------------------------------------------------------
CREATE TYPE log_severity AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');

-- ------------------------------------------------------------
-- Uploads — rastreio de cada arquivo importado
-- Dá ao usuário visibilidade do processamento (status, progresso,
-- linhas com erro) e permite auditar/remover dados por origem
-- ------------------------------------------------------------
CREATE TYPE upload_status AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE uploads (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename         TEXT NOT NULL,
    detected_format  TEXT,                    -- 'jsonl' | 'nginx' | 'syslog' (null se falhou)
    status           upload_status NOT NULL DEFAULT 'PROCESSING',
    total_lines      INTEGER NOT NULL DEFAULT 0,
    parsed_lines     INTEGER NOT NULL DEFAULT 0,
    error_lines      INTEGER NOT NULL DEFAULT 0,
    error_message    TEXT,                    -- motivo se status = FAILED
    started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at      TIMESTAMPTZ
);

-- ------------------------------------------------------------
-- Serviços monitorados (dimensão)
-- ------------------------------------------------------------
CREATE TABLE services (
    id          SMALLSERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,          -- ex: 'api-gateway', 'video-encoder'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Tabela fato de logs — PARTICIONADA por range de timestamp
-- Particionar por dia mantém índices pequenos, e retenção vira
-- DROP de partição (instantâneo) em vez de DELETE (caro)
-- ------------------------------------------------------------
CREATE TABLE logs (
    id           UUID NOT NULL DEFAULT gen_random_uuid(),
    "timestamp"  TIMESTAMPTZ NOT NULL,          -- momento do evento (não da ingestão)
    upload_id    UUID NOT NULL REFERENCES uploads(id),
    service_id   SMALLINT NOT NULL REFERENCES services(id),
    severity     log_severity NOT NULL,
    message      TEXT NOT NULL,
    trace_id     TEXT,
    metadata     JSONB NOT NULL DEFAULT '{}',   -- campos extras do formato original
    PRIMARY KEY (id, "timestamp")               -- timestamp na PK (exigência da partição)
) PARTITION BY RANGE ("timestamp");

-- Partições exemplo (em produção: job diário / pg_partman).
-- Como logs importados podem ter datas variadas, o UploadService
-- cria partições sob demanda para os dias presentes no arquivo.
CREATE TABLE logs_2026_07_30 PARTITION OF logs
    FOR VALUES FROM ('2026-07-30') TO ('2026-07-31');
CREATE TABLE logs_2026_07_31 PARTITION OF logs
    FOR VALUES FROM ('2026-07-31') TO ('2026-08-01');
CREATE TABLE logs_2026_08_01 PARTITION OF logs
    FOR VALUES FROM ('2026-08-01') TO ('2026-08-02');

-- Partição default: linhas de datas sem partição dedicada não são perdidas
CREATE TABLE logs_default PARTITION OF logs DEFAULT;

-- ------------------------------------------------------------
-- Índices — desenhados a partir das queries do dashboard
-- ------------------------------------------------------------

-- Query principal: volume por severidade num intervalo, filtrado por serviço
CREATE INDEX idx_logs_service_severity_ts
    ON logs (service_id, severity, "timestamp");

-- Linha do tempo geral
CREATE INDEX idx_logs_ts
    ON logs ("timestamp");

-- Logs de um upload específico (tela de detalhe do upload)
CREATE INDEX idx_logs_upload
    ON logs (upload_id);

-- Correlação de trace entre serviços (parcial: só quem tem trace)
CREATE INDEX idx_logs_trace
    ON logs (trace_id)
    WHERE trace_id IS NOT NULL;

-- Filtros por campo do metadata (ex: metadata->>'status_code')
CREATE INDEX idx_logs_metadata
    ON logs USING GIN (metadata jsonb_path_ops);

-- ------------------------------------------------------------
-- View materializada para o gráfico principal
-- Buckets de 1 minuto por serviço/severidade.
-- Refresh disparado ao concluir upload + job periódico
-- ------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_log_volume_1m AS
SELECT
    date_trunc('minute', "timestamp") AS bucket,
    service_id,
    severity,
    count(*)                          AS log_count
FROM logs
GROUP BY 1, 2, 3
WITH DATA;

CREATE UNIQUE INDEX idx_mv_volume_pk
    ON mv_log_volume_1m (bucket, service_id, severity);
-- índice UNIQUE permite REFRESH MATERIALIZED VIEW CONCURRENTLY

-- ============================================================
-- Queries de referência do dashboard (documentação viva)
-- ============================================================

-- 1) Série temporal: volume por severidade, últimas 24h, bucket 5min
-- SELECT date_trunc('hour', bucket) + (extract(minute from bucket)::int / 5) * interval '5 min' AS b,
--        severity, sum(log_count)
-- FROM mv_log_volume_1m
-- WHERE bucket >= now() - interval '24 hours'
-- GROUP BY 1, 2 ORDER BY 1;

-- 2) Top serviços com ERROR/FATAL no período
-- SELECT s.name, count(*)
-- FROM logs l JOIN services s ON s.id = l.service_id
-- WHERE l.severity IN ('ERROR','FATAL')
--   AND l."timestamp" >= now() - interval '24 hours'
-- GROUP BY s.name ORDER BY 2 DESC LIMIT 10;

-- 3) Tabela com scroll infinito (keyset pagination — nunca OFFSET)
-- SELECT id, "timestamp", severity, message
-- FROM logs
-- WHERE service_id = $1 AND severity = $2
--   AND ("timestamp", id) < ($cursor_ts, $cursor_id)
-- ORDER BY "timestamp" DESC, id DESC LIMIT 50;

-- 4) Progresso de um upload
-- SELECT status, detected_format, total_lines, parsed_lines, error_lines
-- FROM uploads WHERE id = $1;