import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { UseQueryResult } from '@tanstack/react-query';
import type { Aggregations } from '../../api/types';
import { chartChrome, SEVERITY_COLORS } from '../../lib/severity';
import { formatNumber } from '../../lib/format';
import { ErrorState, Skeleton } from '../../components/states';
import { useTheme } from '../../hooks/useTheme';

/**
 * Ranking de uma única medida → UMA cor (a de ERROR) + labels diretos.
 * Cor por barra aqui seria ruído: a identidade já está no eixo.
 */
export function TopErrorsChart({
  aggregations,
}: {
  aggregations: UseQueryResult<Aggregations>;
}) {
  const { data, isLoading, isError, refetch } = aggregations;
  const { theme } = useTheme();
  const chrome = chartChrome(theme === 'dark');

  if (isLoading) return <Skeleton className="h-48" />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const top = data?.topErrorServices ?? [];
  if (!top.length) {
    return (
      <p className="px-2 py-8 text-center text-sm text-slate-500">
        Nenhum erro no período — tudo saudável.
      </p>
    );
  }

  return (
    <div data-testid="top-errors">
      <ResponsiveContainer width="100%" height={Math.max(top.length * 40 + 16, 96)}>
        <BarChart
          data={top}
          layout="vertical"
          margin={{ left: 8, right: 48, top: 4, bottom: 4 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="service"
            width={140}
            fontSize={12}
            stroke={chrome.axis}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value) => [formatNumber(Number(value ?? 0)), 'erros']}
            contentStyle={chrome.tooltip}
            cursor={{ fill: chrome.grid, opacity: 0.4 }}
          />
          <Bar
            dataKey="count"
            fill={SEVERITY_COLORS.ERROR}
            radius={[0, 4, 4, 0]}
            maxBarSize={18}
          >
            <LabelList
              dataKey="count"
              position="right"
              fontSize={12}
              fill={chrome.label}
              formatter={(v) => formatNumber(Number(v ?? 0))}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
