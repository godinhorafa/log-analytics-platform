import type { UseQueryResult } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Upload } from '../../api/types';
import { formatDateTime, formatDuration, formatNumber } from '../../lib/format';
import { EmptyState, ErrorState, Skeleton } from '../../components/states';
import { StatusPill } from './UploadProgress';

export function UploadHistory({
  uploads,
}: {
  uploads: UseQueryResult<Upload[]>;
}) {
  const { data, isLoading, isError, refetch } = uploads;

  if (isLoading) return <Skeleton className="h-40" />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  if (!data?.length) {
    return (
      <EmptyState
        title="Nenhum arquivo importado ainda"
        hint="O histórico de importações aparece aqui."
      />
    );
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <Table className="min-w-180">
        <TableHeader>
          <TableRow>
            <TableHead>Arquivo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Formato</TableHead>
            <TableHead className="text-right">Linhas</TableHead>
            <TableHead className="text-right">Com erro</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Duração</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((upload) => (
            <TableRow key={upload.id}>
              <TableCell className="max-w-56 truncate font-mono text-xs">
                {upload.filename}
              </TableCell>
              <TableCell>
                <StatusPill status={upload.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {upload.detectedFormat ?? '—'}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(upload.parsedLines)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {upload.errorLines > 0 ? (
                  <span className="text-amber-700">
                    {formatNumber(upload.errorLines)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                {formatDateTime(upload.startedAt)}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                {formatDuration(upload.startedAt, upload.finishedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
