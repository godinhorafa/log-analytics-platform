import { Injectable } from '@nestjs/common';
import { LogLineParser, LogSeverity, ParsedLog } from './parser.interface';

// 2026-07-30T10:15:32.000Z ERROR [video-encoder] Timeout connecting to billing after 1200ms
const SYSLOG_RE =
  /^(\S+)\s+(DEBUG|TRACE|INFO|WARN|WARNING|ERROR|ERR|FATAL|CRITICAL)\s+\[([^\]]+)\]\s+(.+)$/;

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

@Injectable()
export class SyslogParser implements LogLineParser {
  readonly format = 'syslog' as const;

  parse(line: string): ParsedLog | null {
    const m = SYSLOG_RE.exec(line);
    if (!m) return null;
    const [, ts, severity, service, message] = m;

    const timestamp = new Date(ts);
    if (Number.isNaN(timestamp.getTime())) return null;

    return {
      timestamp,
      service,
      severity: SEVERITY_ALIASES[severity.toUpperCase()] ?? LogSeverity.INFO,
      message,
    };
  }

  confidence(sample: string[]): number {
    const nonEmpty = sample.filter((l) => l.trim());
    if (!nonEmpty.length) return 0;
    return (
      nonEmpty.filter((l) => this.parse(l) !== null).length / nonEmpty.length
    );
  }
}
