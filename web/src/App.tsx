import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { Skeleton } from './components/states';
import { ThemeProvider, useTheme } from './hooks/useTheme';

// Code-split por rota: o Recharts (maior dependência) só é baixado
// quando o dashboard é aberto — as demais páginas ficam leves
const DashboardPage = lazy(() =>
  import('./features/dashboard/DashboardPage').then((m) => ({
    default: m.DashboardPage,
  })),
);
const LogsPage = lazy(() =>
  import('./features/logs/LogsPage').then((m) => ({ default: m.LogsPage })),
);
const SearchPage = lazy(() =>
  import('./features/search/SearchPage').then((m) => ({ default: m.SearchPage })),
);
const UploadPage = lazy(() =>
  import('./features/upload/UploadPage').then((m) => ({ default: m.UploadPage })),
);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/logs', label: 'Logs' },
  { to: '/search', label: 'Busca' },
  { to: '/upload', label: 'Importar' },
];

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      className="ml-auto"
    >
      {theme === 'dark' ? (
        <Sun aria-hidden className="size-4" />
      ) : (
        <Moon aria-hidden className="size-4" />
      )}
    </Button>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <div className="bg-muted/40 min-h-screen">
            <header className="bg-background border-b">
              <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 px-4">
                <span className="py-3 text-lg font-semibold tracking-tight">
                  Log<span className="text-primary">Analytics</span>
                </span>
                <nav className="flex gap-1" aria-label="Navegação principal">
                  {NAV.map(({ to, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        `border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                          isActive
                            ? 'border-primary text-foreground'
                            : 'text-muted-foreground hover:text-foreground border-transparent'
                        }`
                      }
                    >
                      {label}
                    </NavLink>
                  ))}
                </nav>
                <ThemeToggle />
              </div>
            </header>
            <main className="mx-auto max-w-6xl px-4 py-6">
              <Suspense fallback={<PageSkeleton />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/logs" element={<LogsPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/upload" element={<UploadPage />} />
                </Routes>
              </Suspense>
            </main>
            <Toaster position="top-right" />
          </div>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
