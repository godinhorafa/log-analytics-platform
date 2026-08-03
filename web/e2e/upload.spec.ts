import { test, expect } from '@playwright/test';

test('upload de arquivo: processa, resume e reflete no dashboard', async ({
  page,
}) => {
  await page.goto('/upload');

  const lines: string[] = [];
  const now = Date.now();
  for (let i = 0; i < 30; i++) {
    lines.push(
      JSON.stringify({
        timestamp: new Date(now - i * 1000).toISOString(),
        level: i % 6 === 0 ? 'ERROR' : 'INFO',
        service: 'e2e-upload',
        message: `evento de teste ${i}`,
      }),
    );
  }
  lines.push('linha corrompida de propósito');

  await page.setInputFiles('input[type=file]', {
    name: 'e2e-upload.jsonl',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from(lines.join('\n') + '\n'),
  });

  // resumo final: formato detectado + contagens (30 válidas, 1 com erro)
  const progress = page.getByTestId('upload-progress');
  await expect(progress).toBeVisible();
  await expect(progress.getByText('Concluído')).toBeVisible({ timeout: 20_000 });
  await expect(progress).toContainText('JSON Lines');
  await expect(progress).toContainText('30 linhas processadas');
  await expect(progress).toContainText('1 com erro');

  // histórico registra a importação
  await expect(
    page.getByRole('cell', { name: 'e2e-upload.jsonl' }).first(),
  ).toBeVisible();

  // o dado aparece no restante do app (tabela filtrada pelo serviço)
  await page.goto('/logs?services=e2e-upload');
  await expect(page.getByTestId('log-row').first()).toBeVisible();
  await expect(
    page.getByTestId('log-row').first().getByText('e2e-upload'),
  ).toBeVisible();
});
