import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLogFilters } from '../../hooks/useLogFilters';
import { useAggregations } from '../../hooks/useAggregations';
import { FilterBar } from '../filters/FilterBar';
import { StatsCards } from './StatsCards';
import { SeverityTimelineChart } from './SeverityTimelineChart';
import { TopErrorsChart } from './TopErrorsChart';

export function DashboardPage() {
  const { filters } = useLogFilters();
  const aggregations = useAggregations(filters);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        {/* agregações cobrem o período inteiro — só o range se aplica aqui */}
        <FilterBar showSeverities={false} />
      </div>

      <StatsCards aggregations={aggregations} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Volume de eventos por severidade</CardTitle>
        </CardHeader>
        <CardContent>
          <SeverityTimelineChart aggregations={aggregations} />
        </CardContent>
      </Card>

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
    </div>
  );
}
