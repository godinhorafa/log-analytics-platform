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

async function main() {
  const { createWriteStream, mkdirSync } = await import('node:fs');
  const { dirname } = await import('node:path');

  const arg = (name: string, def: string) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 ? process.argv[i + 1] : def;
  };
  const count = Number(arg('count', '10000'));
  const format = arg('format', 'jsonl') as 'jsonl' | 'nginx' | 'syslog';
  const out = arg('out', `samples/logs.${format === 'nginx' ? 'log' : format}`);

  const serialize = { jsonl: toJsonl, nginx: toNginx, syslog: toSyslog }[format];
  mkdirSync(dirname(out), { recursive: true });
  const ws = createWriteStream(out);

  const now = Date.now();
  // ~2% das linhas de propósito malformadas: testa a resiliência do parser
  for (let i = 0; i < count; i++) {
    if (Math.random() < 0.02) {
      ws.write('linha corrompida sem formato algum\n');
      continue;
    }
    const severity = pickWeighted();
    const templates = TEMPLATES[severity as keyof typeof TEMPLATES];
    const event: LogEvent = {
      timestamp: new Date(now - Math.random() * 24 * 3600_000),   // últimas 24h
      service: SERVICES[Math.floor(Math.random() * SERVICES.length)],
      severity,
      message: fill(templates[Math.floor(Math.random() * templates.length)]),
      traceId: Math.random() < 0.3 ? crypto.randomUUID() : undefined,
    };
    if (!ws.write(serialize(event) + '\n')) {
      await new Promise<void>((resolve) => ws.once('drain', () => resolve()));   // backpressure também no gerador
    }
  }
  ws.end();
  console.log(`${count} linhas → ${out}`);
}

main().catch(console.error);