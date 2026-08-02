import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { searchLogs } from '../api/endpoints';
import type { LogFilters } from './useLogFilters';

export function useDebounced<T>(value: T, ms = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function useLogSearch(rawQuery: string, filters: LogFilters) {
  const q = useDebounced(rawQuery.trim());
  return useQuery({
    queryKey: ['search', q, filters],
    queryFn: () => searchLogs(q, filters),
    enabled: q.length >= 3, // não busca com 1-2 chars
    staleTime: 30_000,
  });
}
