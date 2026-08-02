import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useInfiniteLogs } from '../../hooks/useInfiniteLogs';
import { useLogFilters } from '../../hooks/useLogFilters';
import { formatNumber } from '../../lib/format';
import { EmptyState, ErrorState, Skeleton } from '../../components/states';
import { LogRow } from './LogRow';

export function LogsTable() {
  const { filters, setFilters } = useLogFilters();
  const {
    data,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteLogs(filters);

  // Sentinela: pré-carrega a próxima página 300px antes do fim
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const logs = data?.pages.flatMap((page) => page.items) ?? [];
  if (!logs.length) {
    return (
      <EmptyState
        title="Nenhum log encontrado"
        hint="Ajuste os filtros ou importe um arquivo de log."
        action={
          <Button asChild size="sm">
            <Link to="/upload">Importar arquivo</Link>
          </Button>
        }
      />
    );
  }

  const addServiceFilter = (service: string) => {
    if (!filters.services.includes(service)) {
      setFilters({ services: [...filters.services, service] });
    }
  };

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <Table className="min-w-160 table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-36">Data/hora</TableHead>
            <TableHead className="w-28">Severidade</TableHead>
            <TableHead className="w-40">Serviço</TableHead>
            <TableHead>Mensagem</TableHead>
            <TableHead className="w-8" aria-label="Expandir" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <LogRow key={log.id} log={log} onServiceClick={addServiceFilter} />
          ))}
        </TableBody>
      </Table>

      <div ref={sentinelRef} data-testid="scroll-sentinel" />

      <div className="text-muted-foreground border-t px-3 py-2.5 text-center text-xs">
        {isFetchingNextPage
          ? 'Carregando mais…'
          : hasNextPage
            ? `${formatNumber(logs.length)} logs carregados — role para carregar mais`
            : `Fim dos resultados · ${formatNumber(logs.length)} logs`}
      </div>
    </Card>
  );
}
