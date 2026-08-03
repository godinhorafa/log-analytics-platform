import { test, expect } from '@playwright/test';

test('scroll infinito carrega páginas adicionais', async ({ page }) => {
  await page.goto('/logs');

  const rows = page.getByTestId('log-row');
  await expect(rows.first()).toBeVisible();

  // primeira página: exatamente o limit do backend
  await expect(rows).toHaveCount(50);

  // rolar até a sentinela dispara o fetch da próxima página (keyset cursor)
  await page.getByTestId('scroll-sentinel').scrollIntoViewIfNeeded();
  await expect
    .poll(async () => rows.count(), { timeout: 10_000 })
    .toBeGreaterThan(50);
});
