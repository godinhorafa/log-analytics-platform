import { useQuery } from '@tanstack/react-query';
import { getAggregations } from '../api/endpoints';
import type { LogFilters } from './useLogFilters';

export function useAggregations(filters: LogFilters) {
  return useQuery({
    queryKey: ['aggregations', filters.range],
    queryFn: () => getAggregations(filters),
    // 30s no client + TTL 60s no Redis = atraso máximo ~1,5min (ADR-005),
    // pensado ponta a ponta e não por camada isolada
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
