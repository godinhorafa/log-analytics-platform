import { JsonlParser } from './jsonl.parser';
import { LogSeverity } from './parser.interface';

describe('JsonlParser', () => {
  let parser: JsonlParser;

  beforeEach(() => {
    parser = new JsonlParser();
  });

  it('parses a line with canonical field names', () => {
    const log = parser.parse(
      JSON.stringify({
        timestamp: '2026-07-30T10:15:32.000Z',
        level: 'ERROR',
        service: 'video-encoder',
        message: 'Failed to encode segment seg-42',
        trace_id: 'abc-123',
      }),
    );
    expect(log).toEqual({
      timestamp: new Date('2026-07-30T10:15:32.000Z'),
      severity: LogSeverity.ERROR,
      service: 'video-encoder',
      message: 'Failed to encode segment seg-42',
      traceId: 'abc-123',
      metadata: undefined,
    });
  });

  it('accepts alternative field names (lvl/ts/msg/svc) — logs reais não são padronizados', () => {
    const log = parser.parse(
      JSON.stringify({
        ts: '2026-07-30T10:15:32Z',
        lvl: 'warn',
        svc: 'billing',
        msg: 'Slow query took 900ms',
      }),
    );
    expect(log).not.toBeNull();
    expect(log!.severity).toBe(LogSeverity.WARN);
    expect(log!.service).toBe('billing');
    expect(log!.message).toBe('Slow query took 900ms');
  });

  it.each([
    ['WARNING', LogSeverity.WARN],
    ['err', LogSeverity.ERROR],
    ['CRITICAL', LogSeverity.FATAL],
    ['trace', LogSeverity.DEBUG],
  ])('normalizes severity alias %s → %s', (alias, expected) => {
    const log = parser.parse(
      JSON.stringify({
        timestamp: '2026-07-30T10:00:00Z',
        level: alias,
        message: 'm',
      }),
    );
    expect(log!.severity).toBe(expected);
  });

  it('defaults to INFO when severity is missing or unknown', () => {
    const noLevel = parser.parse(
      JSON.stringify({ timestamp: '2026-07-30T10:00:00Z', message: 'm' }),
    );
    const weirdLevel = parser.parse(
      JSON.stringify({
        timestamp: '2026-07-30T10:00:00Z',
        level: 'VERBOSE',
        message: 'm',
      }),
    );
    expect(noLevel!.severity).toBe(LogSeverity.INFO);
    expect(weirdLevel!.severity).toBe(LogSeverity.INFO);
  });

  it('defaults service to "unknown" when absent', () => {
    const log = parser.parse(
      JSON.stringify({ timestamp: '2026-07-30T10:00:00Z', message: 'm' }),
    );
    expect(log!.service).toBe('unknown');
  });

  it('accepts epoch-millisecond timestamps', () => {
    const epoch = Date.parse('2026-07-30T10:15:32.000Z');
    const log = parser.parse(
      JSON.stringify({ timestamp: epoch, message: 'm' }),
    );
    expect(log!.timestamp.toISOString()).toBe('2026-07-30T10:15:32.000Z');
  });

  it('collects unmapped fields into metadata', () => {
    const log = parser.parse(
      JSON.stringify({
        timestamp: '2026-07-30T10:00:00Z',
        message: 'm',
        user_id: 'u123',
        region: 'sa-east-1',
      }),
    );
    expect(log!.metadata).toEqual({ user_id: 'u123', region: 'sa-east-1' });
  });

  it('returns null for malformed or non-object JSON', () => {
    expect(parser.parse('not json at all')).toBeNull();
    expect(parser.parse('{"broken": ')).toBeNull();
    expect(parser.parse('[1,2,3]')).toBeNull();
    expect(parser.parse('42')).toBeNull();
    expect(parser.parse('null')).toBeNull();
  });

  it('returns null when timestamp or message is missing or unparseable', () => {
    expect(parser.parse(JSON.stringify({ message: 'm' }))).toBeNull();
    expect(
      parser.parse(JSON.stringify({ timestamp: '2026-07-30T10:00:00Z' })),
    ).toBeNull();
    expect(
      parser.parse(
        JSON.stringify({ timestamp: 'ontem de manhã', message: 'm' }),
      ),
    ).toBeNull();
  });

  describe('confidence', () => {
    const valid = JSON.stringify({
      timestamp: '2026-07-30T10:00:00Z',
      level: 'INFO',
      message: 'ok',
    });

    it('scores the parseable fraction of the sample', () => {
      expect(parser.confidence([valid, valid])).toBe(1);
      expect(parser.confidence([valid, 'garbage'])).toBe(0.5);
      expect(parser.confidence(['garbage'])).toBe(0);
      expect(parser.confidence([])).toBe(0);
    });
  });
});
