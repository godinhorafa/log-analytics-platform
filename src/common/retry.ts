export interface RetryOptions {
  /** Total de tentativas (incluindo a primeira). Default: 3 */
  attempts?: number;
  /** Espera antes da 2ª tentativa. Default: 200ms */
  baseDelayMs?: number;
  /** Multiplicador do backoff exponencial. Default: 4 (200ms → 800ms → ...) */
  factor?: number;
  /** Notificação a cada falha que ainda terá retry (log, métricas) */
  onRetry?: (error: unknown, attempt: number) => void;
}

/**
 * Backoff exponencial para escritas em lote (ADR-004): indisponibilidade
 * transitória de PG/ES não pode derrubar um upload inteiro. Falha permanente
 * (todas as tentativas esgotadas) propaga o último erro ao chamador.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 200;
  const factor = options.factor ?? 4;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      options.onRetry?.(error, attempt);
      const delay = baseDelayMs * factor ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
