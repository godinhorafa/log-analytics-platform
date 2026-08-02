import type { UseQueryResult } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import type { SearchHit } from '../../api/types';
import { formatDateTime } from '../../lib/format';
import { EmptyState, ErrorState, Skeleton } from '../../components/states';
import { SeverityBadge } from '../logs/SeverityBadge';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Destaca o termo buscado na mensagem — o usuário vê POR QUE o log bateu */
function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(term)})`, 'ig'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <mark
            key={i}
            className="rounded-xs bg-amber-200/80 px-0.5 text-inherit dark:bg-amber-400/30"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function SearchResults({
  query,
  result,
}: {
  query: string;
  result: UseQueryResult<SearchHit[]>;
}) {
  const { data, isLoading, isError, refetch, isFetching } = result;

  if (!query) {
    return (
      <EmptyState
        title="Busque por qualquer termo nas mensagens"
        hint='Ex.: "timeout", "payment declined", "codec error" — relevância via Elasticsearch.'
      />
    );
  }
  if (isLoading || (isFetching && !data)) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  if (!data?.length) {
    return (
      <EmptyState
        title={`Nenhum resultado para "${query}"`}
        hint="Tente outro termo ou amplie o período nos filtros."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {data.map((hit) => (
        <li key={hit.id}>
          <Card data-testid="search-result" className="py-3">
            <CardContent className="px-4">
              <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
                <SeverityBadge severity={hit.severity} />
                <span className="text-primary font-mono">{hit.service}</span>
                <span className="font-mono">{formatDateTime(hit.timestamp)}</span>
                <span className="ml-auto tabular-nums" title="Relevância">
                  score {hit.score.toFixed(2)}
                </span>
              </div>
              <p className="mt-1.5 text-sm">
                <Highlight text={hit.message} term={query} />
              </p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
