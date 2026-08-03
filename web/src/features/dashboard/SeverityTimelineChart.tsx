import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { UseQueryResult } from '@tanstack/react-query';
import type { Aggregations } from '../../api/types';
import type { AnomalyWindow } from '../../lib/anomaly';
import type { BucketRow } from '../../lib/timeline';
import { chartChrome, SEVERITY_COLORS, SEVERITY_ORDER } from '../../lib/severity';
import { formatDateTime, formatNumber, formatTime } from '../../lib/format';
import { EmptyState, ErrorState, Skeleton } from '../../components/states';
import { useTheme } from '../../hooks/useTheme';

function SeverityLegend() {
  return (
    <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1">
      {SEVERITY_ORDER.map((sev) => (
        <span
          key={sev}
          className="text-muted-foreground inline-flex items-center gap-1.5 text-xs"
        >
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ backgroundColor: SEVERITY_COLORS[sev] }}
          />
          {sev}
        </span>
      ))}
    </div>
  );
}

/**
 * Barras empilhadas: composição + magnitude no tempo, sem interpolar entre
 * buckets vazios (área/linha mentiria em dados esparsos). Janelas anômalas
 * (lib/anomaly) ganham fundo destacado — mesmo bucket do rollup do gráfico.
 */
export function SeverityTimelineChart({
  aggregations,
  rows,
  anomalies,
}: {
  aggregations: UseQueryResult<Aggregations>;
  rows: BucketRow[];
  anomalies: AnomalyWindow[];
}) {
  const { isLoading, isError, refetch } = aggregations;
  const { theme } = useTheme();
  const chrome = chartChrome(theme === 'dark');

  if (isLoading) return <Skeleton className="h-80" />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  if (!rows.length) {
    return (
      <EmptyState
        title="Nenhum log no período"
        hint="Importe um arquivo de log para ver os gráficos."
        action={
          <Button asChild size="sm">
            <Link to="/upload">Importar arquivo</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div data-testid="severity-timeline">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={rows} barCategoryGap="20%">
          <CartesianGrid vertical={false} stroke={chrome.grid} />
          <XAxis
            dataKey="bucket"
            tickFormatter={formatTime}
            fontSize={12}
            stroke={chrome.axis}
            tickLine={false}
            axisLine={{ stroke: chrome.axisLine }}
            minTickGap={40}
          />
          <YAxis
            fontSize={12}
            stroke={chrome.axis}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => formatNumber(v)}
          />
          {anomalies.map((w) => (
            <ReferenceArea
              key={w.from}
              x1={w.from}
              x2={w.to}
              fill={SEVERITY_COLORS.ERROR}
              fillOpacity={0.07}
              stroke={SEVERITY_COLORS.ERROR}
              strokeOpacity={0.35}
              strokeDasharray="4 3"
            />
          ))}
          <Tooltip
            labelFormatter={(v) => formatDateTime(String(v))}
            formatter={(value, name) => [formatNumber(Number(value ?? 0)), name]}
            contentStyle={chrome.tooltip}
            cursor={{ fill: chrome.grid, opacity: 0.4 }}
          />
          <Legend content={<SeverityLegend />} />
          {SEVERITY_ORDER.map((sev) => (
            <Bar
              key={sev}
              dataKey={sev}
              stackId="volume"
              fill={SEVERITY_COLORS[sev]}
              maxBarSize={28}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
