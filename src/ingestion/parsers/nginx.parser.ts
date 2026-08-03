import { Injectable } from '@nestjs/common';
import { LogLineParser, LogSeverity, ParsedLog } from './parser.interface';

// 127.0.0.1 - - [30/Jul/2026:10:15:32 -0300] "GET /api/videos HTTP/1.1" 502 157 "-" "curl/8.0"
const NGINX_RE =
  /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+)[^"]*" (\d{3}) (\d+|-)/;

const MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

@Injectable()
export class NginxParser implements LogLineParser {
  readonly format = 'nginx' as const;

  parse(line: string): ParsedLog | null {
    const m = NGINX_RE.exec(line);
    if (!m) return null;
    const [, ip, ts, method, path, statusStr] = m;
    const status = Number(statusStr);
    const timestamp = this.parseNginxDate(ts);
    // Data inválida → linha inteira é tratada como malformada (error_lines),
    // igual aos demais parsers — nunca propaga Invalid Date pro pipeline.
    if (Number.isNaN(timestamp.getTime())) return null;
    return {
      timestamp,
      service: 'nginx',
      severity: this.severityFromStatus(status), // ← raciocínio de domínio
      message: `${method} ${path} → ${status}`,
      metadata: { ip, method, path, status },
    };
  }

  /** 5xx = ERROR (falha do servidor), 4xx = WARN (erro do cliente), resto = INFO */
  private severityFromStatus(status: number): LogSeverity {
    if (status >= 500) return LogSeverity.ERROR;
    if (status >= 400) return LogSeverity.WARN;
    return LogSeverity.INFO;
  }

  private parseNginxDate(ts: string): Date {
    // 30/Jul/2026:10:15:32 -0300
    const m =
      /^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})$/.exec(
        ts,
      );
    if (!m) return new Date(NaN);
    const [, d, mon, y, h, min, s, tz] = m;
    return new Date(
      `${y}-${String(MONTHS[mon] + 1).padStart(2, '0')}-${d}T${h}:${min}:${s}${tz.slice(0, 3)}:${tz.slice(3)}`,
    );
  }

  confidence(sample: string[]): number {
    const nonEmpty = sample.filter((l) => l.trim());
    if (!nonEmpty.length) return 0;
    return (
      nonEmpty.filter((l) => this.parse(l) !== null).length / nonEmpty.length
    );
  }
}
