import { SyslogParser } from './syslog.parser';
import { LogSeverity } from './parser.interface';

describe('SyslogParser', () => {
  let parser: SyslogParser;

  beforeEach(() => {
    parser = new SyslogParser();
  });

  it('parses a valid line', () => {
    const log = parser.parse(
      '2026-07-30T10:15:32.000Z ERROR [video-encoder] Timeout connecting to billing after 1200ms',
    );
    expect(log).toEqual({
      timestamp: new Date('2026-07-30T10:15:32.000Z'),
      severity: LogSeverity.ERROR,
      service: 'video-encoder',
      message: 'Timeout connecting to billing after 1200ms',
    });
  });

  it('parses timestamps with timezone offset preserving the UTC instant', () => {
    const log = parser.parse(
      '2026-07-30T10:15:32-03:00 INFO [api-gateway] Request completed in 12ms',
    );
    expect(log!.timestamp.toISOString()).toBe('2026-07-30T13:15:32.000Z');
  });

  it.each([
    ['WARNING', LogSeverity.WARN],
    ['ERR', LogSeverity.ERROR],
    ['CRITICAL', LogSeverity.FATAL],
    ['TRACE', LogSeverity.DEBUG],
  ])('normalizes severity alias %s → %s', (alias, expected) => {
    const log = parser.parse(`2026-07-30T10:00:00Z ${alias} [svc] mensagem`);
    expect(log!.severity).toBe(expected);
  });

  it('returns null for malformed lines', () => {
    expect(parser.parse('linha corrompida sem formato algum')).toBeNull();
    // sem [service]
    expect(
      parser.parse('2026-07-30T10:00:00Z INFO mensagem sem serviço'),
    ).toBeNull();
    // severidade desconhecida não bate na regex
    expect(parser.parse('2026-07-30T10:00:00Z VERBOSE [svc] msg')).toBeNull();
    expect(parser.parse('')).toBeNull();
  });

  it('returns null when the timestamp is unparseable', () => {
    expect(parser.parse('ontem INFO [svc] mensagem')).toBeNull();
  });

  describe('confidence', () => {
    const valid = '2026-07-30T10:00:00Z INFO [api-gateway] ok';

    it('scores the parseable fraction of the sample', () => {
      expect(parser.confidence([valid, valid, valid])).toBe(1);
      expect(parser.confidence([valid, 'garbage'])).toBe(0.5);
      expect(parser.confidence([])).toBe(0);
      expect(parser.confidence(['  ', ''])).toBe(0);
    });
  });
});
