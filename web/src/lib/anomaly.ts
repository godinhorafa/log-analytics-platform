import type { BucketRow } from './timeline';

export interface AnomalyWindow {
  /** início do primeiro bucket anômalo (ISO) */
  from: string;
  /** início do último bucket anômalo (ISO) — janela cobre até to + bucketMs */
  to: string;
  errorCount: number;
  /** quantas vezes acima da média de erros por bucket */
  factor: number;
  buckets: string[];
}

const MIN_ERRORS = 10; // ruído: poucos erros absolutos nunca são "anomalia"

/**
 * Detecção simples e explicável ("comportamentos anômalos" do enunciado):
 * um bucket é anômalo quando seus erros (ERROR+FATAL) excedem média + 2
 * desvios-padrão do período visível. Buckets contíguos viram uma janela só.
 * Roda sobre os MESMOS buckets do gráfico — o destaque bate com as barras.
 */
export function detectAnomalies(rows: BucketRow[]): AnomalyWindow[] {
  if (rows.length < 4) return []; // sem base estatística
  const errors = rows.map((r) => (r.ERROR ?? 0) + (r.FATAL ?? 0));
  const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
  const variance =
    errors.reduce((acc, e) => acc + (e - mean) ** 2, 0) / errors.length;
  const threshold = mean + 2 * Math.sqrt(variance);

  const windows: AnomalyWindow[] = [];
  let current: AnomalyWindow | null = null;
  rows.forEach((row, i) => {
    const count = errors[i];
    const anomalous = count > threshold && count >= MIN_ERRORS;
    if (anomalous) {
      if (current) {
        current.to = row.bucket;
        current.errorCount += count;
        current.buckets.push(row.bucket);
      } else {
        current = {
          from: row.bucket,
          to: row.bucket,
          errorCount: count,
          factor: 0,
          buckets: [row.bucket],
        };
      }
    } else if (current) {
      windows.push(current);
      current = null;
    }
  });
  if (current) windows.push(current);

  for (const w of windows) {
    const perBucket = w.errorCount / w.buckets.length;
    w.factor = mean > 0 ? perBucket / mean : Infinity;
  }
  return windows.sort((a, b) => b.errorCount - a.errorCount);
}
