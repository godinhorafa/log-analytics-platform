import { FormatDetector } from './format-detector';
import { JsonlParser } from './jsonl.parser';
import { NginxParser } from './nginx.parser';
import { SyslogParser } from './syslog.parser';

describe('FormatDetector', () => {
  let detector: FormatDetector;

  beforeEach(() => {
    detector = new FormatDetector(
      new JsonlParser(),
      new NginxParser(),
      new SyslogParser(),
    );
  });

  const jsonl = (i: number) =>
    JSON.stringify({
      timestamp: '2026-07-30T10:00:00Z',
      level: 'INFO',
      service: 'api-gateway',
      message: `evento ${i}`,
    });
  const nginx = (i: number) =>
    `10.0.0.${i} - - [30/Jul/2026:10:15:32 -0300] "GET /api/videos HTTP/1.1" 200 157 "-" "curl/8.0"`;
  const syslog = (i: number) =>
    `2026-07-30T10:00:0${i % 10}Z INFO [billing] evento ${i}`;

  const sampleOf = (fn: (i: number) => string, n = 10) =>
    Array.from({ length: n }, (_, i) => fn(i));

  it.each([
    ['jsonl', jsonl],
    ['nginx', nginx],
    ['syslog', syslog],
  ] as const)('detects a pure %s sample', (format, fn) => {
    const parser = detector.detect(sampleOf(fn));
    expect(parser).not.toBeNull();
    expect(parser!.format).toBe(format);
  });

  it('detects the majority format when a few lines are corrupted', () => {
    const sample = [...sampleOf(syslog, 8), 'linha corrompida', '###'];
    expect(detector.detect(sample)!.format).toBe('syslog');
  });

  it('returns null when no parser reaches 50% confidence', () => {
    expect(detector.detect(sampleOf(() => 'lixo aleatório'))).toBeNull();
    // mistura 40/30/30: nenhum formato domina
    const mixed = [
      ...sampleOf(jsonl, 4),
      ...sampleOf(nginx, 3),
      ...sampleOf(syslog, 3),
    ];
    expect(detector.detect(mixed)).toBeNull();
  });

  it('returns null for an empty sample', () => {
    expect(detector.detect([])).toBeNull();
    expect(detector.detect(['', '   '])).toBeNull();
  });

  it('detects with a sample smaller than the nominal window (arquivo pequeno)', () => {
    expect(detector.detect([jsonl(1)])!.format).toBe('jsonl');
  });
});
