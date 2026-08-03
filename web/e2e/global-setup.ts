import { request } from '@playwright/test';

const API = process.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Semeia o backend com um arquivo pequeno via upload real: os specs assumem
 * que existem logs recentes (últimas horas) com ERRORs contendo "timeout".
 * 120 linhas garantem mais de 2 páginas na tabela (limit 50) p/ scroll infinito.
 */
export default async function globalSetup() {
  const ctx = await request.newContext();

  const health = await ctx.get(`${API}/health`).catch(() => null);
  if (!health?.ok()) {
    throw new Error(
      `API indisponível em ${API} — suba a infra com "docker compose up -d" na raiz`,
    );
  }

  const now = Date.now();
  const lines: string[] = [];
  for (let i = 0; i < 120; i++) {
    const isError = i % 8 === 0;
    lines.push(
      JSON.stringify({
        timestamp: new Date(now - i * 45_000).toISOString(), // últimos ~90min
        level: isError ? 'ERROR' : i % 3 === 0 ? 'WARN' : 'INFO',
        service: i % 2 === 0 ? 'api-gateway' : 'billing',
        message: isError
          ? `Timeout connecting to billing after ${100 + i}ms`
          : `Request completed in ${i}ms`,
      }),
    );
  }

  const res = await ctx.post(`${API}/uploads`, {
    multipart: {
      file: {
        name: 'e2e-seed.jsonl',
        mimeType: 'application/octet-stream',
        buffer: Buffer.from(lines.join('\n') + '\n'),
      },
    },
  });
  if (!res.ok()) throw new Error(`Seed falhou: HTTP ${res.status()}`);
  const { uploadId } = (await res.json()) as { uploadId: string };

  for (let i = 0; i < 40; i++) {
    const status = (await (await ctx.get(`${API}/uploads/${uploadId}`)).json()) as {
      status: string;
    };
    if (status.status === 'COMPLETED') break;
    if (status.status === 'FAILED') throw new Error('Seed: upload falhou');
    await new Promise((r) => setTimeout(r, 500));
  }

  // bulk do ES não força refresh — garante que a busca enxerga o seed
  await ctx.post(`${API.replace(':3000', ':9200')}/logs/_refresh`).catch(() => {});
  await ctx.dispose();
}
