import { Injectable } from '@nestjs/common';
import { LogLineParser } from './parser.interface';
import { JsonlParser } from './jsonl.parser';
import { NginxParser } from './nginx.parser';
import { SyslogParser } from './syslog.parser';

@Injectable()
export class FormatDetector {
  constructor(
    private readonly jsonl: JsonlParser,
    private readonly nginx: NginxParser,
    private readonly syslog: SyslogParser,
  ) {}

  /** Escolhe o parser com maior confiança sobre a amostra. Null se nenhum passa de 50%. */
  detect(sampleLines: string[]): LogLineParser | null {
    const parsers: LogLineParser[] = [this.jsonl, this.nginx, this.syslog];
    const scored = parsers
      .map((p) => ({ p, score: p.confidence(sampleLines) }))
      .sort((a, b) => b.score - a.score);
    return scored[0].score >= 0.5 ? scored[0].p : null;
  }
}
