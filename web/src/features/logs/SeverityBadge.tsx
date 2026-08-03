import { Badge } from '@/components/ui/badge';
import type { Severity } from '../../api/types';
import { SEVERITY_BG, SEVERITY_COLORS } from '../../lib/severity';

/** Tint suave + ponto colorido: o texto usa token de texto, não a cor da série */
export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge
      data-testid="severity-badge"
      variant="outline"
      className="border-transparent font-semibold"
      style={{ backgroundColor: SEVERITY_BG[severity] }}
    >
      <span
        aria-hidden
        className="size-2 rounded-full"
        style={{ backgroundColor: SEVERITY_COLORS[severity] }}
      />
      {severity}
    </Badge>
  );
}
