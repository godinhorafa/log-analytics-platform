import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { RANGES, type TimeRange } from '../lib/time';

export interface LogFilters {
  range: TimeRange;
  services: string[];
  severities: string[];
  /** correlação: mostra todos os logs de um mesmo trace entre serviços */
  trace: string | null;
}

const DEFAULTS: LogFilters = {
  range: '24h',
  services: [],
  severities: [],
  trace: null,
};

function parseRange(raw: string | null): TimeRange {
  return (RANGES as readonly string[]).includes(raw ?? '')
    ? (raw as TimeRange)
    : DEFAULTS.range;
}

/**
 * Estado de filtro vive na URL: dashboard compartilhável por link e F5
 * preserva o estado (comportamento esperado de ferramenta de observabilidade).
 * Uma fonte de verdade, zero prop drilling.
 */
export function useLogFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<LogFilters>(
    () => ({
      range: parseRange(params.get('range')),
      services: params.get('services')?.split(',').filter(Boolean) ?? [],
      severities: params.get('severities')?.split(',').filter(Boolean) ?? [],
      trace: params.get('trace'),
    }),
    [params],
  );

  const setFilters = useCallback(
    (patch: Partial<LogFilters>) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        const merged = { ...filters, ...patch };
        if (merged.range === DEFAULTS.range) next.delete('range');
        else next.set('range', merged.range);
        if (merged.services.length) next.set('services', merged.services.join(','));
        else next.delete('services');
        if (merged.severities.length) next.set('severities', merged.severities.join(','));
        else next.delete('severities');
        if (merged.trace) next.set('trace', merged.trace);
        else next.delete('trace');
        return next;
      });
    },
    [filters, setParams],
  );

  return { filters, setFilters };
}
