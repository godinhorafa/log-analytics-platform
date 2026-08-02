import { withRetry } from './retry';

describe('withRetry', () => {
  const fast = { baseDelayMs: 1, factor: 1 };

  it('returns the result on first success without retrying', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const onRetry = jest.fn();
    await expect(withRetry(fn, { ...fast, onRetry })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('recovers after transient failures', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockRejectedValueOnce(new Error('still down'))
      .mockResolvedValue('ok');
    await expect(withRetry(fn, fast)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws the last error after exhausting attempts', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('permanent'));
    await expect(withRetry(fn, { ...fast, attempts: 3 })).rejects.toThrow(
      'permanent',
    );
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('notifies onRetry for every failure that will be retried', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('down'));
    const onRetry = jest.fn();
    await expect(
      withRetry(fn, { ...fast, attempts: 3, onRetry }),
    ).rejects.toThrow();
    // 3 tentativas → 2 retries notificados (a última falha não tem retry)
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 2);
  });
});
