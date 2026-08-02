import { format } from 'date-fns';

const numberFmt = new Intl.NumberFormat('pt-BR');

export function formatNumber(value: number): string {
  return numberFmt.format(value);
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), 'dd/MM HH:mm:ss');
}

export function formatTime(iso: string): string {
  return format(new Date(iso), 'HH:mm');
}

export function formatDuration(fromIso: string, toIso: string | null): string {
  if (!toIso) return '—';
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  if (ms < 1_000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}min ${Math.round((ms % 60_000) / 1_000)}s`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1).replace('.', ',')}%`;
}
