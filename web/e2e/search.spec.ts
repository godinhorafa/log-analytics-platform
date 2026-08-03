import { test, expect } from '@playwright/test';

test('busca textual retorna resultados relevantes', async ({ page }) => {
  await page.goto('/search');
  await page.getByPlaceholder('Buscar nos logs...').fill('timeout');

  const results = page.getByTestId('search-result');
  await expect(results.first()).toBeVisible({ timeout: 10_000 });
  await expect(results.first()).toContainText(/timeout/i);
});

test('busca exige pelo menos 3 caracteres', async ({ page }) => {
  await page.goto('/search');
  await page.getByPlaceholder('Buscar nos logs...').fill('ti');
  await expect(page.getByText('pelo menos 3 caracteres')).toBeVisible();
  await expect(page.getByTestId('search-result')).toHaveCount(0);
});
