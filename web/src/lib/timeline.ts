import type { Aggregations, Severity } from '../api/types';

export type BucketRow = { bucket: string } & Partial<Record<Severity, number>>;

const BASE_BUCKET_MS = 5 * 60_000; // a API agrega em buckets de 5min
const MAX_BARS = 72;

/**
 * A API sempre entrega buckets de 5min; para períodos longos isso vira
 * centenas de barras de ~2px ilegíveis. O rollup agrupa client-side em
 * múltiplos de 5min até caber em MAX_BARS — a soma é preservada.
 * Compartilhado entre o gráfico e a detecção de anomalias, para que ambos
 * enxerguem exatamente as mesmas janelas.
 */
export function rollupTimeline(timeline: Aggregations['timeline']): {
  rows: BucketRow[];
  bucketMs: number;
} {
  if (!timeline.length) return { rows: [], bucketMs: BASE_BUCKET_MS };
  const times = timeline.map((r) => new Date(r.bucket).getTime());
  const first = Math.min(...times);
  const span = Math.max(...times) - first + BASE_BUCKET_MS;
  const factor = Math.max(1, Math.ceil(span / BASE_BUCKET_MS / MAX_BARS));
  const bucketMs = factor * BASE_BUCKET_MS;

  const byBucket = new Map<string, BucketRow>();
  for (const row of timeline) {
    const t = new Date(row.bucket).getTime();
    const bucket = new Date(
      first + Math.floor((t - first) / bucketMs) * bucketMs,
    ).toISOString();
    const entry = byBucket.get(bucket) ?? { bucket };
    entry[row.severity] = (entry[row.severity] ?? 0) + row.count;
    byBucket.set(bucket, entry);
  }
  const rows = [...byBucket.values()].sort((a, b) =>
    a.bucket.localeCompare(b.bucket),
  );
  return { rows, bucketMs };
}
