import type { UseQueryResult } from '@tanstack/react-query';
import type { Aggregations, Severity } from '../../api/types';
import { SEVERITY_COLORS, SEVERITY_ORDER } from '../../lib/severity';
import { formatNumber, formatPercent } from '../../lib/format';
import { ErrorState, Skeleton } from '../../components/states';

/**
 * "Distribuição dos eventos registrados" (enunciado): contagem e fração por
 * severidade no período. Barras horizontais proporcionais — sem lib de
 * gráfico, é só proporção.
 */
export function SeverityDistribution({
  aggregations,
}: {
  aggregations: UseQueryResult<Aggregations>;
}) {
  const { data, isLoading, isError, refetch } = aggregations;

  if (isLoading) return <Skeleton className="h-48" />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const totals = new Map<Severity, number>();
  for (const row of data?.timeline ?? []) {
    totals.set(row.severity, (totals.get(row.severity) ?? 0) + row.count);
  }
  const total = [...totals.values()].reduce((a, b) => a + b, 0);

  if (!total) {
    return (
      <p className="text-muted-foreground px-2 py-8 text-center text-sm">
        Nenhum evento no período.
      </p>
    );
  }

  const max = Math.max(...totals.values());

  return (
    <div data-testid="severity-distribution" className="flex flex-col gap-2.5">
      {SEVERITY_ORDER.map((sev) => {
        const count = totals.get(sev) ?? 0;
        return (
          <div key={sev} className="grid grid-cols-[64px_1fr_120px] items-center gap-3">
            <span className="text-muted-foreground text-xs font-semibold">{sev}</span>
            <div className="bg-muted h-4 overflow-hidden rounded-sm">
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${max ? Math.max((count / max) * 100, count > 0 ? 1 : 0) : 0}%`,
                  backgroundColor: SEVERITY_COLORS[sev],
                }}
              />
            </div>
            <span className="text-right text-xs tabular-nums">
              <span className="font-semibold">{formatNumber(count)}</span>{' '}
              <span className="text-muted-foreground">
                ({formatPercent(count / total)})
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
