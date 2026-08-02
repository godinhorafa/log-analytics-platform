import { Link } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { AnomalyWindow } from '../../lib/anomaly';
import { formatNumber } from '../../lib/format';
import { formatTime } from '../../lib/format';

/**
 * Resposta direta ao "identificar comportamentos anômalos" do enunciado:
 * janelas onde a taxa de erro foge do padrão do período, com link direto
 * para investigar os logs de erro.
 */
export function AnomaliesCard({
  anomalies,
  bucketMs,
}: {
  anomalies: AnomalyWindow[];
  bucketMs: number;
}) {
  if (!anomalies.length) return null;

  return (
    <Card
      data-testid="anomalies-card"
      className="border-l-4 py-3"
      style={{ borderLeftColor: '#be123c' }}
    >
      <CardContent className="flex flex-col gap-2 px-4">
        <div className="flex items-center gap-2">
          <TriangleAlert aria-hidden className="size-4" style={{ color: '#be123c' }} />
          <p className="text-sm font-semibold">
            {anomalies.length === 1
              ? 'Comportamento anômalo detectado'
              : `${anomalies.length} janelas anômalas detectadas`}
          </p>
          <Button asChild size="sm" variant="outline" className="ml-auto h-7">
            <Link to="/logs?severities=ERROR,FATAL">Investigar logs de erro</Link>
          </Button>
        </div>
        <ul className="flex flex-col gap-1">
          {anomalies.slice(0, 3).map((w) => (
            <li key={w.from} className="text-muted-foreground text-sm">
              <span className="text-foreground font-mono font-medium">
                {formatTime(w.from)}–
                {formatTime(new Date(new Date(w.to).getTime() + bucketMs).toISOString())}
              </span>{' '}
              · {formatNumber(w.errorCount)} erros ·{' '}
              {w.factor === Infinity ? '∞' : w.factor.toFixed(1).replace('.', ',')}×
              acima da média do período
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
