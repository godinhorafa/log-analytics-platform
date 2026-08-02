export const RANGES = ['1h', '6h', '24h', '7d'] as const;
export type TimeRange = (typeof RANGES)[number];

const RANGE_MS: Record<TimeRange, number> = {
  '1h': 3_600_000,
  '6h': 6 * 3_600_000,
  '24h': 24 * 3_600_000,
  '7d': 7 * 24 * 3_600_000,
};

/**
 * Preset → intervalo from/to ARREDONDADO PRO MINUTO.
 * Sem o arredondamento, cada refetch geraria from/to novos → chave de cache
 * nova no Redis do backend a cada request, e o cache-aside nunca acertaria.
 */
export function rangeToInterval(range: TimeRange): { from: string; to: string } {
  const nowMinute = Math.floor(Date.now() / 60_000) * 60_000;
  return {
    from: new Date(nowMinute - RANGE_MS[range]).toISOString(),
    to: new Date(nowMinute).toISOString(),
  };
}
