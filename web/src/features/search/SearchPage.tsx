import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useLogFilters } from '../../hooks/useLogFilters';
import { useLogSearch } from '../../hooks/useLogSearch';
import { FilterBar } from '../filters/FilterBar';
import { SearchResults } from './SearchResults';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const { filters } = useLogFilters();
  const result = useLogSearch(query, filters);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Busca textual</h1>
        <FilterBar />
      </div>

      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar nos logs..."
        autoFocus
        className="bg-background h-11 px-4"
      />

      {query.trim().length > 0 && query.trim().length < 3 ? (
        <p className="text-muted-foreground text-sm">
          Digite pelo menos 3 caracteres para buscar.
        </p>
      ) : (
        <SearchResults query={query.trim()} result={result} />
      )}
    </div>
  );
}
