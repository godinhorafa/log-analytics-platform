import { FilterBar } from '../filters/FilterBar';
import { LogsTable } from './LogsTable';

export function LogsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Logs</h1>
        <FilterBar />
      </div>
      <LogsTable />
    </div>
  );
}
