import { Injectable } from '@nestjs/common';
import { LogLineParser, LogSeverity, ParsedLog } from './parser.interface';

const SEVERITY_FIELDS = ['level', 'severity', 'lvl'];
const TIMESTAMP_FIELDS = ['timestamp', 'time', 'ts'];
const MESSAGE_FIELDS = ['message', 'msg'];
const SERVICE_FIELDS = ['service', 'svc', 'component'];
const TRACE_FIELDS = ['trace_id', 'traceId', 'trace'];

const KNOWN_FIELDS = new Set([
  ...SEVERITY_FIELDS,
  ...TIMESTAMP_FIELDS,
  ...MESSAGE_FIELDS,
  ...SERVICE_FIELDS,
  ...TRACE_FIELDS,
]);

const SEVERITY_ALIASES: Record<string, LogSeverity> = {
  DEBUG: LogSeverity.DEBUG,
  TRACE: LogSeverity.DEBUG,
  INFO: LogSeverity.INFO,
  WARN: LogSeverity.WARN,
  WARNING: LogSeverity.WARN,
  ERROR: LogSeverity.ERROR,
  ERR: LogSeverity.ERROR,
  FATAL: LogSeverity.FATAL,
  CRITICAL: LogSeverity.FATAL,
};

function firstDefined(obj: Record<string, unknown>, fields: string[]): unknown {
  for (const field of fields) {
    if (obj[field] !== undefined && obj[field] !== null) return obj[field];
  }
  return undefined;
}

@Injectable()
export class JsonlParser implements LogLineParser {
  readonly format = 'jsonl' as const;

  // Logs reais não são padronizados: aceita variações de nome de campo
  // em vez de exigir um schema fixo (ADR-003).
  parse(line: string): ParsedLog | null {
    let obj: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(line);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      )
        return null;
      obj = parsed as Record<string, unknown>;
    } catch {
      return null;
    }

    const rawSeverity = firstDefined(obj, SEVERITY_FIELDS);
    const rawTimestamp = firstDefined(obj, TIMESTAMP_FIELDS);
    const rawMessage = firstDefined(obj, MESSAGE_FIELDS);
    if (rawTimestamp === undefined || rawMessage === undefined) return null;

    const timestamp = new Date(rawTimestamp as string | number);
    if (Number.isNaN(timestamp.getTime())) return null;

    const severity = this.normalizeSeverity(rawSeverity);
    const service = (firstDefined(obj, SERVICE_FIELDS) as string) ?? 'unknown';
    const traceId = firstDefined(obj, TRACE_FIELDS) as string | undefined;

    const metadata = Object.fromEntries(
      Object.entries(obj).filter(([key]) => !KNOWN_FIELDS.has(key)),
    );

    return {
      timestamp,
      service,
      severity,
      message:
        typeof rawMessage === 'string'
          ? rawMessage
          : JSON.stringify(rawMessage),
      traceId,
      metadata: Object.keys(metadata).length ? metadata : undefined,
    };
  }

  private normalizeSeverity(raw: unknown): LogSeverity {
    if (typeof raw !== 'string') return LogSeverity.INFO;
    return SEVERITY_ALIASES[raw.toUpperCase()] ?? LogSeverity.INFO;
  }

  confidence(sample: string[]): number {
    const nonEmpty = sample.filter((l) => l.trim());
    if (!nonEmpty.length) return 0;
    return (
      nonEmpty.filter((l) => this.parse(l) !== null).length / nonEmpty.length
    );
  }
}
