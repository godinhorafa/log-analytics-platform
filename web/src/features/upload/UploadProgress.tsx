import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Upload } from '../../api/types';
import { formatNumber } from '../../lib/format';

const FORMAT_LABELS: Record<string, string> = {
  jsonl: 'JSON Lines',
  nginx: 'Nginx/Apache',
  syslog: 'Syslog',
};

/**
 * Duas fases honestas com o backend: barra de envio (rede, throttled pelo
 * backpressure do processamento) + contadores vivos vindos do polling da
 * lista de uploads (o registro existe desde os primeiros bytes).
 */
export function UploadProgress({
  sendProgress,
  active,
  isSending,
  error,
}: {
  sendProgress: number;
  active: Upload | undefined;
  isSending: boolean;
  error: Error | null;
}) {
  if (error) {
    return (
      <div
        role="alert"
        className="border-destructive/30 bg-destructive/5 rounded-xl border px-4 py-3"
      >
        <p className="text-destructive text-sm font-medium">
          Falha no envio: {error.message}
        </p>
      </div>
    );
  }
  if (!isSending && !active) return null;

  const failed = active?.status === 'FAILED';
  const completed = active?.status === 'COMPLETED';

  return (
    <Card data-testid="upload-progress" className="py-3">
      <CardContent className="flex flex-col gap-3 px-4">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate font-mono text-sm">
            {active?.filename ?? 'enviando…'}
          </p>
          <StatusPill
            status={failed ? 'FAILED' : completed ? 'COMPLETED' : 'PROCESSING'}
          />
        </div>

        {/* Fase 1: envio (o stream avança conforme o servidor consome) */}
        {!completed && !failed && (
          <div>
            <div className="text-muted-foreground mb-1 flex justify-between text-xs">
              <span>Envio do arquivo</span>
              <span className="tabular-nums">{sendProgress}%</span>
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${sendProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Fase 2: contadores vivos do processamento */}
        {active && (
          <dl className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
            {active.detectedFormat && (
              <Metric
                label="Formato detectado"
                value={FORMAT_LABELS[active.detectedFormat] ?? active.detectedFormat}
              />
            )}
            <Metric
              label="Linhas processadas"
              value={formatNumber(active.parsedLines)}
              live={!completed && !failed}
            />
            <Metric label="Linhas com erro" value={formatNumber(active.errorLines)} />
          </dl>
        )}

        {completed && active && (
          <p className="text-sm text-emerald-700">
            {active.filename} · {FORMAT_LABELS[active.detectedFormat ?? ''] ?? '—'}{' '}
            detectado · {formatNumber(active.parsedLines)} linhas processadas ·{' '}
            {formatNumber(active.errorLines)} com erro —{' '}
            <Link to="/dashboard" className="font-medium underline">
              ver no dashboard
            </Link>
          </p>
        )}
        {failed && active && (
          <p role="alert" className="text-destructive text-sm">
            Processamento falhou: {active.errorMessage ?? 'erro desconhecido'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  live = false,
}: {
  label: string;
  value: string;
  live?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-muted-foreground text-xs">{label}:</dt>
      <dd
        className={`font-semibold tabular-nums ${live ? 'text-primary' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}

export function StatusPill({ status }: { status: Upload['status'] }) {
  const styles: Record<Upload['status'], string> = {
    PROCESSING: 'bg-blue-50 text-blue-700',
    COMPLETED: 'bg-emerald-50 text-emerald-700',
    FAILED: 'bg-rose-50 text-rose-700',
  };
  const labels: Record<Upload['status'], string> = {
    PROCESSING: 'Processando…',
    COMPLETED: 'Concluído',
    FAILED: 'Falhou',
  };
  return (
    <Badge variant="outline" className={`border-transparent ${styles[status]}`}>
      {labels[status]}
    </Badge>
  );
}
