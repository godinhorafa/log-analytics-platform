import type { ReactNode } from 'react';
import { Skeleton as UiSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export function Skeleton({ className = '' }: { className?: string }) {
  return <UiSkeleton data-testid="skeleton" className={className} />;
}

export function ErrorState({
  message = 'Erro ao carregar os dados',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="border-destructive/30 bg-destructive/5 flex flex-col items-center gap-3 rounded-lg border px-6 py-8 text-center"
    >
      <p className="text-destructive text-sm font-medium">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-border flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center">
      <p className="text-foreground font-medium">{title}</p>
      {hint && <p className="text-muted-foreground text-sm">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
