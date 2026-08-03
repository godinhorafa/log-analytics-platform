import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLogFilters } from '../../hooks/useLogFilters';
import { useAggregations } from '../../hooks/useAggregations';
import { rollupTimeline } from '../../lib/timeline';
import { detectAnomalies } from '../../lib/anomaly';
import { FilterBar } from '../filters/FilterBar';
import { StatsCards } from './StatsCards';
import { AnomaliesCard } from './AnomaliesCard';
import { SeverityTimelineChart } from './SeverityTimelineChart';
import { TopErrorsChart } from './TopErrorsChart';
import { SeverityDistribution } from './SeverityDistribution';

export function DashboardPage() {
  const { filters } = useLogFilters();
  const aggregations = useAggregations(filters);

  // rollup + anomalias calculados uma vez, compartilhados por card e gráfico
  const { rows, bucketMs } = useMemo(
    () => rollupTimeline(aggregations.data?.timeline ?? []),
    [aggregations.data],
  );
  const anomalies = useMemo(() => detectAnomalies(rows), [rows]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        {/* agregações cobrem o período inteiro — só o range se aplica aqui */}
        <FilterBar showSeverities={false} />
      </div>

      <StatsCards aggregations={aggregations} anomalies={anomalies.length} />

      <AnomaliesCard anomalies={anomalies} bucketMs={bucketMs} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Volume de eventos por severidade</CardTitle>
        </CardHeader>
        <CardContent>
          <SeverityTimelineChart
            aggregations={aggregations}
            rows={rows}
            anomalies={anomalies}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Serviços com mais erros (ERROR + FATAL)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TopErrorsChart aggregations={aggregations} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Distribuição por severidade</CardTitle>
          </CardHeader>
          <CardContent>
            <SeverityDistribution aggregations={aggregations} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
