import type { UseQueryResult } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import type { Aggregations } from '../../api/types';
import { formatNumber, formatPercent } from '../../lib/format';
import { Skeleton } from '../../components/states';

export function StatsCards({
  aggregations,
}: {
  aggregations: UseQueryResult<Aggregations>;
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
    { label: 'Eventos no período', value: formatNumber(total) },
    { label: 'Erros (ERROR + FATAL)', value: formatNumber(errors) },
    { label: 'Taxa de erro', value: total ? formatPercent(errors / total) : '—' },
    {
      label: 'Serviços com erro',
      value: formatNumber(data?.topErrorServices.length ?? 0),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ label, value }) => (
        <Card key={label} className="py-4">
          <CardContent className="px-4">
            <p className="text-muted-foreground text-xs font-medium">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
