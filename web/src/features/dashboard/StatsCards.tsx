import type { UseQueryResult } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import type { Aggregations } from '../../api/types';
import { SEVERITY_COLORS } from '../../lib/severity';
import { formatNumber, formatPercent } from '../../lib/format';
import { Skeleton } from '../../components/states';

export function StatsCards({
  aggregations,
  anomalies,
}: {
  aggregations: UseQueryResult<Aggregations>;
  anomalies: number;
}) {
  const { data, isLoading } = aggregations;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const total = data?.timeline.reduce((acc, b) => acc + b.count, 0) ?? 0;
  const errors =
    data?.timeline
      .filter((b) => b.severity === 'ERROR' || b.severity === 'FATAL')
      .reduce((acc, b) => acc + b.count, 0) ?? 0;

  const cards = [
    { label: 'Eventos no período', value: formatNumber(total), alert: false },
    { label: 'Erros (ERROR + FATAL)', value: formatNumber(errors), alert: false },
    {
      label: 'Taxa de erro',
      value: total ? formatPercent(errors / total) : '—',
      alert: false,
    },
    {
      label: 'Janelas anômalas',
      value: formatNumber(anomalies),
      alert: anomalies > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ label, value, alert }) => (
        <Card key={label} className="py-4">
          <CardContent className="px-4">
            <p className="text-muted-foreground text-xs font-medium">{label}</p>
            <p
              className="mt-1 text-2xl font-semibold tabular-nums"
              style={alert ? { color: SEVERITY_COLORS.ERROR } : undefined}
            >
              {value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
