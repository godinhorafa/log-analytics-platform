export enum LogSeverity {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

export interface ParsedLog {
  timestamp: Date;
  service: string;
  severity: LogSeverity;
  message: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
}

export interface LogLineParser {
  readonly format: 'jsonl' | 'nginx' | 'syslog';
  /** Retorna null se a linha não for parseável neste formato */
  parse(line: string): ParsedLog | null;
  /** Score 0-1: fração das linhas de amostra que este parser entende */
  confidence(sampleLines: string[]): number;
}
