import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { LogsPage } from './features/logs/LogsPage';
import { SearchPage } from './features/search/SearchPage';
import { UploadPage } from './features/upload/UploadPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/logs', label: 'Logs' },
  { to: '/search', label: 'Busca' },
  { to: '/upload', label: 'Importar' },
];

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-6">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/logs" element={<LogsPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/upload" element={<UploadPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
