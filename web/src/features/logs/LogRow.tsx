import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import type { LogEntry } from '../../api/types';
import { formatDateTime } from '../../lib/format';
import { SeverityBadge } from './SeverityBadge';

export function LogRow({
  log,
  onServiceClick,
}: {
  log: LogEntry;
  onServiceClick: (service: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMetadata = Object.keys(log.metadata ?? {}).length > 0;

  return (
    <>
      <TableRow
        data-testid="log-row"
        onClick={() => setExpanded((e) => !e)}
        className="cursor-pointer"
      >
        <TableCell className="text-muted-foreground font-mono text-xs whitespace-nowrap">
          {formatDateTime(log.timestamp)}
        </TableCell>
        <TableCell>
          <SeverityBadge severity={log.severity} />
        </TableCell>
        <TableCell>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onServiceClick(log.service);
            }}
            title={`Filtrar por ${log.service}`}
            className="text-primary font-mono text-xs hover:underline"
          >
            {log.service}
          </button>
        </TableCell>
        <TableCell className="max-w-0">
          <span className="block truncate text-sm">{log.message}</span>
        </TableCell>
        <TableCell className="text-muted-foreground w-8 text-center">
          {expanded ? (
            <ChevronDown aria-hidden className="size-4" />
          ) : (
            <ChevronRight aria-hidden className="size-4" />
          )}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableCell colSpan={5} className="px-4 py-3">
            <p className="font-mono text-sm whitespace-pre-wrap">{log.message}</p>
            <dl className="mt-2 flex flex-wrap gap-x-8 gap-y-1 text-xs">
              {log.traceId && (
                <div className="flex gap-1.5">
                  <dt className="text-muted-foreground font-medium">trace_id:</dt>
                  <dd>
                    <Link
                      to={`/logs?trace=${encodeURIComponent(log.traceId)}`}
                      className="text-primary font-mono hover:underline"
                      title="Ver todos os logs deste trace (correlação entre serviços)"
                    >
                      {log.traceId}
                    </Link>
                  </dd>
                </div>
              )}
              <div className="flex gap-1.5">
                <dt className="text-muted-foreground font-medium">id:</dt>
                <dd className="font-mono">{log.id}</dd>
              </div>
            </dl>
            {hasMetadata && (
              <pre className="bg-muted mt-2 overflow-x-auto rounded-md p-2 font-mono text-xs">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
