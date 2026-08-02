import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import type { Aggregations, Severity } from '../../api/types';
import { SEVERITY_COLORS, SEVERITY_ORDER } from '../../lib/severity';
import { formatDateTime, formatNumber, formatTime } from '../../lib/format';
import { EmptyState, ErrorState, Skeleton } from '../../components/states';

type BucketRow = { bucket: string } & Partial<Record<Severity, number>>;

function SeverityLegend() {
  return (
    <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1">
      {SEVERITY_ORDER.map((sev) => (
        <span key={sev} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
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

const BASE_BUCKET_MS = 5 * 60_000; // a API agrega em buckets de 5min
const MAX_BARS = 72;

/**
 * A API sempre entrega buckets de 5min; para períodos longos isso vira
 * centenas de barras de ~2px ilegíveis. O rollup agrupa client-side em
 * múltiplos de 5min até caber em MAX_BARS — a soma é preservada.
 */
function rollup(timeline: Aggregations['timeline']): BucketRow[] {
  if (!timeline.length) return [];
  const times = timeline.map((r) => new Date(r.bucket).getTime());
  const first = Math.min(...times);
  const span = Math.max(...times) - first + BASE_BUCKET_MS;
  const factor = Math.max(1, Math.ceil(span / BASE_BUCKET_MS / MAX_BARS));
  const size = factor * BASE_BUCKET_MS;

  const byBucket = new Map<string, BucketRow>();
  for (const row of timeline) {
    const t = new Date(row.bucket).getTime();
    const bucket = new Date(first + Math.floor((t - first) / size) * size).toISOString();
    const entry = byBucket.get(bucket) ?? { bucket };
    entry[row.severity] = (entry[row.severity] ?? 0) + row.count;
    byBucket.set(bucket, entry);
  }
  return [...byBucket.values()].sort((a, b) => a.bucket.localeCompare(b.bucket));
}

/**
 * Barras empilhadas: composição + magnitude no tempo, sem interpolar entre
 * buckets vazios (área/linha mentiria em dados esparsos). A API só retorna
 * dados agregados — nunca plota logs crus (ADR-006).
 */
export function SeverityTimelineChart({
  aggregations,
}: {
  aggregations: UseQueryResult<Aggregations>;
}) {
  const { data, isLoading, isError, refetch } = aggregations;

  if (isLoading) return <Skeleton className="h-80" />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const timeline = data?.timeline ?? [];
  if (!timeline.length) {
    return (
      <EmptyState
        title="Nenhum log no período"
        hint="Importe um arquivo de log para ver os gráficos."
        action={
          <Link
            to="/upload"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Importar arquivo
          </Link>
        }
      />
    );
  }

  const chartData = rollup(timeline);

  return (
    <div data-testid="severity-timeline">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} barCategoryGap="20%">
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="bucket"
            tickFormatter={formatTime}
            fontSize={12}
            stroke="#64748b"
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
            minTickGap={40}
          />
          <YAxis
            fontSize={12}
            stroke="#64748b"
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => formatNumber(v)}
          />
          <Tooltip
            labelFormatter={(v) => formatDateTime(String(v))}
            formatter={(value, name) => [formatNumber(Number(value ?? 0)), name]}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: 12,
            }}
          />
          {/* legenda custom: Recharts reordena o payload — a ordem de
              severidade tem que bater com a ordem do empilhamento */}
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
