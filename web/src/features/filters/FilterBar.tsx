import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLogFilters } from '../../hooks/useLogFilters';
import { SEVERITY_COLORS, SEVERITY_ORDER } from '../../lib/severity';
import { RANGES } from '../../lib/time';

/**
 * Filtros sincronizados com a URL: cada botão reflete e altera query params.
 * aria-pressed dá o estado a leitores de tela e aos testes E2E de deep link.
 */
export function FilterBar({ showSeverities = true }: { showSeverities?: boolean }) {
  const { filters, setFilters } = useLogFilters();

  const toggleSeverity = (sev: string) =>
    setFilters({
      severities: filters.severities.includes(sev)
        ? filters.severities.filter((s) => s !== sev)
        : [...filters.severities, sev],
    });

  const removeService = (service: string) =>
    setFilters({ services: filters.services.filter((s) => s !== service) });

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div
        className="bg-background inline-flex gap-0.5 rounded-lg border p-0.5"
        role="group"
        aria-label="Período"
      >
        {RANGES.map((range) => (
          <Button
            key={range}
            size="sm"
            variant={filters.range === range ? 'default' : 'ghost'}
            aria-pressed={filters.range === range}
            onClick={() => setFilters({ range })}
            className="h-7 px-2.5"
          >
            {range}
          </Button>
        ))}
      </div>

      {showSeverities && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Severidade">
          {SEVERITY_ORDER.map((sev) => {
            const active = filters.severities.includes(sev);
            return (
              <Button
                key={sev}
                size="sm"
                variant={active ? 'secondary' : 'outline'}
                aria-pressed={active}
                onClick={() => toggleSeverity(sev)}
                className={`h-7 rounded-full px-2.5 text-xs font-semibold ${
                  active ? 'ring-ring ring-1' : ''
                }`}
              >
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: SEVERITY_COLORS[sev] }}
                />
                {sev}
              </Button>
            );
          })}
        </div>
      )}

      {filters.services.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground text-xs">Serviço:</span>
          {filters.services.map((service) => (
            <Badge
              key={service}
              variant="secondary"
              className="cursor-pointer font-mono"
              onClick={() => removeService(service)}
              title="Remover filtro"
            >
              {service}
              <span aria-hidden>×</span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
