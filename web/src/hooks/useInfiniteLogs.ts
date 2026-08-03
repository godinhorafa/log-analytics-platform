import { useInfiniteQuery } from '@tanstack/react-query';
import { getLogs } from '../api/endpoints';
import type { LogFilters } from './useLogFilters';

/**
 * Scroll infinito sobre a keyset pagination do backend: custo constante por
 * página independente da profundidade (OFFSET degradaria linearmente).
 */
export function useInfiniteLogs(filters: LogFilters) {
  return useInfiniteQuery({
    queryKey: ['logs', filters],
    queryFn: ({ pageParam }) => getLogs(filters, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor, // null = fim
  });
}
