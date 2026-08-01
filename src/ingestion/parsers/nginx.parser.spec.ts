import { NginxParser } from './nginx.parser';
import { LogSeverity } from './parser.interface';

describe('NginxParser', () => {
  let parser: NginxParser;

  beforeEach(() => {
    parser = new NginxParser();
  });

  const line = (status: number) =>
    `127.0.0.1 - - [30/Jul/2026:10:15:32 -0300] "GET /api/videos HTTP/1.1" ${status} 157 "-" "curl/8.0"`;

  it('parses a valid combined log line', () => {
    const log = parser.parse(line(200));
    expect(log).not.toBeNull();
    expect(log!.service).toBe('nginx');
    expect(log!.message).toBe('GET /api/videos → 200');
    expect(log!.metadata).toEqual({
      ip: '127.0.0.1',
      method: 'GET',
      path: '/api/videos',
      status: 200,
    });
  });

  it('converts the timezone offset to the correct UTC instant', () => {
    const log = parser.parse(line(200));
    // 10:15:32 -0300 === 13:15:32 UTC
    expect(log!.timestamp.toISOString()).toBe('2026-07-30T13:15:32.000Z');
  });

  it.each([
    [500, LogSeverity.ERROR],
    [502, LogSeverity.ERROR],
    [503, LogSeverity.ERROR],
    [400, LogSeverity.WARN],
    [404, LogSeverity.WARN],
    [429, LogSeverity.WARN],
    [200, LogSeverity.INFO],
    [301, LogSeverity.INFO],
  ])('derives severity from HTTP status %i → %s', (status, severity) => {
    expect(parser.parse(line(status))!.severity).toBe(severity);
  });

  it('returns null for a malformed line', () => {
    expect(parser.parse('linha corrompida sem formato algum')).toBeNull();
    expect(parser.parse('')).toBeNull();
    expect(
      parser.parse('{"timestamp":"2026-07-30T10:00:00Z","message":"json"}'),
    ).toBeNull();
  });

  it('returns null when the bracketed date is unparseable (never Invalid Date)', () => {
    const bad =
      '127.0.0.1 - - [99/Xyz/2026:99:99:99 -0300] "GET / HTTP/1.1" 200 1 "-" "-"';
    expect(parser.parse(bad)).toBeNull();
  });

  describe('confidence', () => {
    it('is 1 for a pure nginx sample and 0 for garbage', () => {
      expect(parser.confidence([line(200), line(404), line(502)])).toBe(1);
      expect(parser.confidence(['foo', 'bar'])).toBe(0);
    });

    it('is the parseable fraction for mixed samples and 0 for empty input', () => {
      expect(parser.confidence([line(200), 'garbage', line(500), 'x'])).toBe(
        0.5,
      );
      expect(parser.confidence([])).toBe(0);
      expect(parser.confidence(['', '   '])).toBe(0);
    });
  });
});
