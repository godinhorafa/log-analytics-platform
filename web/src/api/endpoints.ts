import { api } from './client';
import { rangeToInterval } from '../lib/time';
import type { Aggregations, PaginatedLogs, SearchHit, Upload } from './types';
import type { LogFilters } from '../hooks/useLogFilters';

// URL usa nomes plurais amigáveis (severities=...); a API usa singular com CSV
function serializeFilters(filters: LogFilters) {
  const { from, to } = rangeToInterval(filters.range);
  return {
    from,
    to,
    service: filters.services.join(',') || undefined,
    severity: filters.severities.join(',') || undefined,
    traceId: filters.trace ?? undefined,
  };
}

export async function getAggregations(filters: LogFilters): Promise<Aggregations> {
  // o endpoint agrega o período inteiro (from/to) — filtros de serviço e
  // severidade são aplicados nos gráficos, não na query
  const { from, to } = rangeToInterval(filters.range);
  const { data } = await api.get<Aggregations>('/logs/aggregations', {
    params: { from, to },
  });
  return data;
}

export async function getLogs(
  filters: LogFilters,
  cursor: string | null,
): Promise<PaginatedLogs> {
  const { data } = await api.get<PaginatedLogs>('/logs', {
    params: {
      ...serializeFilters(filters),
      cursor: cursor ?? undefined,
      limit: 50,
    },
  });
  return data;
}

export async function searchLogs(
  q: string,
  filters: LogFilters,
): Promise<SearchHit[]> {
  const { data } = await api.get<SearchHit[]>('/search', {
    params: { q, ...serializeFilters(filters) },
  });
  return data;
}

export async function listUploads(): Promise<Upload[]> {
  const { data } = await api.get<Upload[]>('/uploads');
  return data;
}
