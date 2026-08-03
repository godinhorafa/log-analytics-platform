# Dashboard — Log Analytics Platform

Frontend React do projeto. As instruções de execução, arquitetura e decisões estão no [README da raiz](../README.md) e no [ARCHITECTURE.md](../ARCHITECTURE.md).

## Scripts

```bash
npm run dev      # dev server com hot reload em :5173 (requer a API em :3000)
npm run build    # type-check + build de produção em dist/
npm run lint     # oxlint
npm run e2e      # testes Playwright (requer a infra no ar: docker compose up -d na raiz)
```

## Organização

- `src/api/` — client HTTP e tipos espelhando as respostas do backend
- `src/hooks/` — filtros sincronizados com a URL, scroll infinito, busca com debounce, upload com progresso vivo, tema
- `src/lib/` — paleta de severidade (validada para daltonismo/contraste nos dois temas), rollup de timeline, detecção de anomalias
- `src/features/` — domínios visuais: `upload`, `dashboard`, `logs`, `search`, `filters`
- `src/components/ui/` — primitives shadcn/ui
- `e2e/` — specs Playwright com seed de dados via API real
