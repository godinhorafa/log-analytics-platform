import { defineConfig } from '@playwright/test';

/**
 * Pré-requisito: API + infra no ar (docker compose up -d na raiz).
 * O globalSetup semeia dados via POST /uploads — os specs não dependem
 * de estado manual do banco.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:5173' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
