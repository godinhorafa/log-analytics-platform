// Tipos espelhando as respostas REAIS do backend (validadas nos testes de
// integração de test/integration/pipeline.e2e-spec.ts). Num monorepo de
// produção isso viraria um package compartilhado (@app/contracts).

export type Severity = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

// GET /logs
export interface LogEntry {
  id: string;
  timestamp: string;
  service: string;
  severity: Severity;
  message: string;
  traceId: string | null;
  metadata: Record<string, unknown>;
}

export interface PaginatedLogs {
  items: LogEntry[];
  nextCursor: string | null; // keyset pagination — null = fim
}

// GET /logs/aggregations — um payload alimenta os dois gráficos
export interface Aggregations {
  timeline: { bucket: string; severity: Severity; count: number }[];
  topErrorServices: { service: string; count: number }[];
}

// GET /search — tem score; NÃO tem traceId/metadata
export interface SearchHit {
  id: string;
  timestamp: string;
  service: string;
  severity: Severity;
  message: string;
  score: number;
}

// GET /uploads, GET /uploads/:id
export interface Upload {
  id: string;
  filename: string;
  detectedFormat: 'jsonl' | 'nginx' | 'syslog' | null;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalLines: number;
  parsedLines: number;
  errorLines: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}
