import { test, expect } from '@playwright/test';

test.describe('Filtros do dashboard de logs', () => {
  test('filtrar por severidade atualiza a URL e a tabela', async ({ page }) => {
    await page.goto('/logs');

    await page.getByRole('button', { name: 'ERROR', exact: true }).click();

    // filtro refletido na URL — estado compartilhável por link
    await expect(page).toHaveURL(/severities=ERROR/);

    const badges = page.getByTestId('severity-badge');
    await expect(badges.first()).toBeVisible();
    for (const badge of await badges.all()) {
      await expect(badge).toHaveText('ERROR');
    }
  });

  test('deep link abre com o estado de filtros correto', async ({ page }) => {
    await page.goto('/logs?severities=ERROR,FATAL&range=1h');

    await expect(
      page.getByRole('button', { name: 'ERROR', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('button', { name: 'FATAL', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('button', { name: '1h', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    // não selecionados permanecem off
    await expect(
      page.getByRole('button', { name: 'INFO', exact: true }),
    ).toHaveAttribute('aria-pressed', 'false');
  });
});
