/**
 * Gera arquivos de log sintéticos simulando uma plataforma de streaming.
 *
 * Uso:
 *   npx ts-node scripts/generate-logs.ts --format jsonl  --count 50000 --out samples/app.jsonl
 *   npx ts-node scripts/generate-logs.ts --format nginx  --count 50000 --out samples/access.log
 *   npx ts-node scripts/generate-logs.ts --format syslog --count 50000 --out samples/system.log
 *
 * Gere um arquivo GRANDE (500k+ linhas) pra demonstrar o streaming:
 *   npx ts-node scripts/generate-logs.ts --format jsonl --count 500000 --out samples/big.jsonl
 *
 * Cenário de INCIDENTE (demo de anomalia): pane no billing ~7h atrás com
 * timeouts em cascata no api-gateway (trace_id compartilhado) e recuperação:
 *   npx ts-node scripts/generate-logs.ts --scenario incident --count 60000 --out samples/incident.jsonl
 */
const SERVICES = ['api-gateway', 'auth-service', 'video-encoder', 'cdn-edge', 'billing', 'recommendations'];

const TEMPLATES = {
  INFO:  ['Request completed in {ms}ms', 'User {uid} started playback of asset {aid}', 'Cache hit for key {key}'],
  WARN:  ['Slow query took {ms}ms', 'Retry {n}/3 for upstream {svc}', 'Token expiring soon for user {uid}'],
  ERROR: ['Timeout connecting to {svc} after {ms}ms', 'Failed to encode segment {seg}: codec error', 'Payment declined for user {uid}'],
  FATAL: ['Connection pool exhausted', 'Out of memory in worker {n}'],
  DEBUG: ['Entering handler {fn}', 'Payload validated in {ms}ms'],
};

// Distribuição plausível: maioria INFO, cauda de erros
const SEVERITY_WEIGHTS: [string, number][] = [
  ['DEBUG', 0.15], ['INFO', 0.65], ['WARN', 0.12], ['ERROR', 0.07], ['FATAL', 0.01],
];

function pickWeighted(): string {
  const r = Math.random();
  let acc = 0;
  for (const [sev, w] of SEVERITY_WEIGHTS) {
    acc += w;
    if (r <= acc) return sev;
  }
  return 'INFO';
}

function fill(template: string): string {
  return template
    .replace('{ms}', String(Math.floor(Math.random() * 3000)))
    .replace('{uid}', `u${Math.floor(Math.random() * 9999)}`)
    .replace('{aid}', `asset-${Math.floor(Math.random() * 500)}`)
    .replace('{key}', `cache:${Math.random().toString(36).slice(2, 8)}`)
    .replace('{svc}', SERVICES[Math.floor(Math.random() * SERVICES.length)])
    .replace('{seg}', `seg-${Math.floor(Math.random() * 100)}`)
    .replace('{n}', String(1 + Math.floor(Math.random() * 3)))
    .replace('{fn}', 'processRequest');
}

// --- serialização por formato ---

function toJsonl(e: LogEvent): string {
  return JSON.stringify({
    timestamp: e.timestamp.toISOString(),
    level: e.severity,                       // 'level' de propósito: testa o mapeamento flexível
    service: e.service,
    message: e.message,
    trace_id: e.traceId,
  });
}

const HTTP_PATHS = ['/api/videos', '/api/auth/login', '/api/billing/charge', '/health', '/api/recommendations'];
function toNginx(e: LogEvent): string {
  // severidade → status coerente (ERROR gera 5xx, WARN gera 4xx)
  const status = e.severity === 'ERROR' || e.severity === 'FATAL'
    ? [500, 502, 503][Math.floor(Math.random() * 3)]
    : e.severity === 'WARN'
      ? [400, 401, 404, 429][Math.floor(Math.random() * 4)]
      : 200;
  const d = e.timestamp;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${pad(d.getDate())}/${months[d.getMonth()]}/${d.getFullYear()}:${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} -0300`;
  const path = HTTP_PATHS[Math.floor(Math.random() * HTTP_PATHS.length)];
  return `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)} - - [${ts}] "GET ${path} HTTP/1.1" ${status} ${Math.floor(Math.random() * 5000)} "-" "Mozilla/5.0"`;
}

function toSyslog(e: LogEvent): string {
  return `${e.timestamp.toISOString()} ${e.severity} [${e.service}] ${e.message}`;
}

interface LogEvent {
  timestamp: Date;
  service: string;
  severity: string;
  message: string;
  traceId?: string;
}

// --- cenário de incidente -----------------------------------------------
// História: pool de conexões do billing esgota → erros/fatais no billing,
// timeouts em cascata no api-gateway (mesmo trace_id, correlacionável na UI),
// retries elevados nos vizinhos, depois recuperação gradual.

const INCIDENT_DURATION_MS = 40 * 60_000;
const RECOVERY_DURATION_MS = 20 * 60_000;

function normalEvent(ts: Date): LogEvent {
  const severity = pickWeighted();
  const templates = TEMPLATES[severity as keyof typeof TEMPLATES];
  return {
    timestamp: ts,
    service: SERVICES[Math.floor(Math.random() * SERVICES.length)],
    severity,
    message: fill(templates[Math.floor(Math.random() * templates.length)]),
    traceId: Math.random() < 0.3 ? crypto.randomUUID() : undefined,
  };
}

/** Retorna 1..2 eventos (a cascata gera par com trace compartilhado) */
function incidentEvents(now: number): LogEvent[] {
  const incidentStart = now - 7 * 3600_000;
  const incidentEnd = incidentStart + INCIDENT_DURATION_MS;

  // Concentra volume na janela do incidente: sistemas em pane LOGAM MAIS
  const r = Math.random();
  let ts: Date;
  let phase: 'normal' | 'incident' | 'recovery';
  if (r < 0.68) {
    ts = new Date(now - Math.random() * 24 * 3600_000);
    phase =
      ts.getTime() >= incidentStart && ts.getTime() < incidentEnd
        ? 'incident'
        : ts.getTime() >= incidentEnd &&
            ts.getTime() < incidentEnd + RECOVERY_DURATION_MS
          ? 'recovery'
          : 'normal';
  } else if (r < 0.9) {
    ts = new Date(incidentStart + Math.random() * INCIDENT_DURATION_MS);
    phase = 'incident';
  } else {
    ts = new Date(incidentEnd + Math.random() * RECOVERY_DURATION_MS);
    phase = 'recovery';
  }

  if (phase === 'incident') {
    const kind = Math.random();
    if (kind < 0.35) {
      // falha primária no billing
      return [
        Math.random() < 0.25
          ? { timestamp: ts, service: 'billing', severity: 'FATAL', message: 'Connection pool exhausted' }
          : {
              timestamp: ts,
              service: 'billing',
              severity: 'ERROR',
              message: `Database connection timed out after ${1000 + Math.floor(Math.random() * 4000)}ms`,
              traceId: Math.random() < 0.5 ? crypto.randomUUID() : undefined,
            },
      ];
    }
    if (kind < 0.7) {
      // cascata: gateway e billing falham no MESMO trace (correlação na UI)
      const traceId = crypto.randomUUID();
      const ms = 3000 + Math.floor(Math.random() * 2000);
      return [
        {
          timestamp: ts,
          service: 'billing',
          severity: 'ERROR',
          message: `Database connection timed out after ${ms - 12}ms`,
          traceId,
        },
        {
          timestamp: new Date(ts.getTime() + 15),
          service: 'api-gateway',
          severity: 'ERROR',
          message: `Timeout connecting to billing after ${ms}ms`,
          traceId,
        },
      ];
    }
    if (kind < 0.85) {
      return [
        {
          timestamp: ts,
          service: ['recommendations', 'auth-service'][Math.floor(Math.random() * 2)],
          severity: 'WARN',
          message: `Retry ${1 + Math.floor(Math.random() * 3)}/3 for upstream billing`,
        },
      ];
    }
    return [normalEvent(ts)];
  }

  if (phase === 'recovery') {
    const kind = Math.random();
    if (kind < 0.4) {
      return [
        {
          timestamp: ts,
          service: 'billing',
          severity: 'WARN',
          message: `Slow query took ${800 + Math.floor(Math.random() * 1500)}ms`,
        },
      ];
    }
    if (kind < 0.5) {
      return [
        {
          timestamp: ts,
          service: 'api-gateway',
          severity: 'ERROR',
          message: `Timeout connecting to billing after ${2000 + Math.floor(Math.random() * 1000)}ms`,
        },
      ];
    }
    return [normalEvent(ts)];
  }

  return [normalEvent(ts)];
}

async function main() {
  const { createWriteStream, mkdirSync } = await import('node:fs');
  const { dirname } = await import('node:path');

  const arg = (name: string, def: string) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 ? process.argv[i + 1] : def;
  };
  const count = Number(arg('count', '10000'));
  const format = arg('format', 'jsonl') as 'jsonl' | 'nginx' | 'syslog';
  const scenario = arg('scenario', 'random') as 'random' | 'incident';
  const out = arg(
    'out',
    scenario === 'incident'
      ? 'samples/incident.jsonl'
      : `samples/logs.${format === 'nginx' ? 'log' : format}`,
  );

  const serialize = { jsonl: toJsonl, nginx: toNginx, syslog: toSyslog }[format];
  mkdirSync(dirname(out), { recursive: true });
  const ws = createWriteStream(out);

  const now = Date.now();
  let written = 0;
  // ~2% das linhas de propósito malformadas: testa a resiliência do parser
  while (written < count) {
    if (Math.random() < 0.02) {
      ws.write('linha corrompida sem formato algum\n');
      written++;
      continue;
    }
    const events =
      scenario === 'incident'
        ? incidentEvents(now)
        : [normalEvent(new Date(now - Math.random() * 24 * 3600_000))];
    for (const event of events) {
      if (!ws.write(serialize(event) + '\n')) {
        await new Promise<void>((resolve) => ws.once('drain', () => resolve())); // backpressure também no gerador
      }
      written++;
    }
  }
  ws.end();
  console.log(`${written} linhas → ${out}`);
}

main().catch(console.error);