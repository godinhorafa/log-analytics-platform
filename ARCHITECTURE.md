# Plataforma de Análise de Logs — Arquitetura

> Documento de decisões técnicas (ADRs). Registra **o que** foi decidido, **por que**, e **quais trade-offs** foram aceitos — simulando como eu documentaria um projeto real em produção.

---

## Premissas (interpretação do enunciado)

O enunciado pede: importar arquivos de log, processar/classificar, armazenar, consultar com filtros e busca, visualizar em dashboard, lidando com grandes volumes.

| Termo do enunciado | Interpretação adotada |
|---|---|
| "Importação de arquivos" | Upload via interface web (drag-and-drop), processado em **streaming** no backend |
| "Classificação automática" | **Auto-detecção de formato** do arquivo (JSON Lines, Nginx/Apache access log, syslog genérico) + extração de severidade, timestamp, serviço e mensagem |
| "Grandes volumes" | Parse linha a linha sem carregar o arquivo em memória; inserts em batch; paginação keyset; scroll infinito no frontend |
| "Comportamentos anômalos / tendências" | Série temporal por severidade, top serviços com erro, distribuição por nível |
| Fora do escopo (consciente) | Autenticação, multi-tenancy, ingestão contínua via agentes (Filebeat/Fluentd) — ver ADR-007 |

---

## Visão geral

```
  Usuário ──► Upload (.log/.jsonl/.txt) ──► POST /uploads (multipart, streaming)
                                              │
                                              ▼
                                   ┌─────────────────────┐
                                   │  API (NestJS + TS)  │
                                   │                     │
                                   │  1. Detector de     │
                                   │     formato         │
                                   │  2. Parser em       │
                                   │     streaming       │
                                   │     (linha a linha) │
                                   │  3. Batch writer ───┼──► PostgreSQL (fonte de verdade,
                                   │                     │        agregações do dashboard)
                                   │                 └───┼──► Elasticsearch (busca full-text)
                                   │                     │
  Dashboard (React) ◄── REST ──────┤  Consulta           │
   • gráficos                      │   └─► Redis (cache) │
   • tabela c/ scroll infinito     └─────────────────────┘
   • busca textual
   • status do processamento (GET /uploads/:id)
```

**Fluxo:** arquivo entra por upload multipart → formato é detectado nas primeiras linhas → parser processa em streaming, normalizando cada registro → escrita em batches no Postgres + Elasticsearch → o upload tem status consultável (linhas processadas, linhas com erro) → dashboard consome agregações e busca.

---

## ADR-001 — Backend em Node.js + TypeScript + NestJS

**Contexto:** o desafio permite Python ou Node.js. Preciso de camadas bem separadas, DI e testabilidade — e streams de arquivo eficientes.

**Decisão:** NestJS com TypeScript estrito.

**Justificativa:**
- Node é naturalmente forte em I/O com streams — exatamente o perfil desta aplicação (ler arquivo grande, transformar, gravar em lote).
- Arquitetura modular do Nest (modules/services) força separação de responsabilidades e facilita testes com mocks via DI.
- TypeScript de ponta a ponta (backend + frontend em React) reduz erros de contrato.
- É o framework que uso profissionalmente — o tempo do desafio vai para decisões de produto, não aprendizado de ferramenta.

**Trade-offs aceitos:** mais boilerplate que Express puro; aceito em troca de estrutura clara e avaliável.

---

## ADR-002 — Ingestão por upload com parsing em STREAMING

**Contexto:** o enunciado exige "lidar com grandes volumes". Um arquivo de log de produção pode ter centenas de MB. Carregar o arquivo inteiro em memória (`multer` com buffer, `fs.readFile`) derrubaria a API.

**Decisão:** upload multipart processado com **Busboy** (stream do request) encadeado em `readline` — o arquivo nunca existe inteiro na memória, apenas a linha corrente e o batch em montagem.

**Justificativa:**
- Memória constante independente do tamanho do arquivo: 10MB ou 2GB consomem o mesmo.
- Backpressure natural dos streams do Node: se o banco desacelera, a leitura desacelera junto.
- Inserts em **batches de 1.000 registros** (multi-row insert no PG, bulk no ES) — ordens de magnitude mais rápido que inserir linha a linha.

**Trade-offs aceitos:**
- Processamento síncrono ao request: como o parser consome o stream do próprio request com backpressure, a conexão do upload fica aberta durante todo o processamento — a resposta com `uploadId` só chega quando o corpo termina de ser consumido (medido: ~4,5 min para 500k linhas/66MB, throughput ~1.900 linhas/s). O registro do upload, porém, existe desde os primeiros bytes: **o progresso é consultável em paralelo via `GET /uploads/:id` por outra conexão** (é o que o dashboard usa). Alternativa de responder de imediato exigiria bufferizar o arquivo em disco antes de parsear — trocaria latência de resposta por I/O dobrado e disco como limite. Em produção, viraria fila + workers (ADR-007).
- Linhas malformadas **não abortam o arquivo**: são contadas em `error_lines` e reportadas no status. Um arquivo 99% válido gera 99% de valor.

---

## ADR-003 — Classificação automática: detecção de formato

**Contexto:** o enunciado pede "processamento e classificação automática". Logs reais chegam em formatos variados.

**Decisão:** detector que amostra as primeiras N linhas e escolhe o parser adequado. Formatos suportados:

| Formato | Detecção | Extração |
|---|---|---|
| **JSON Lines** | Linha parseia como JSON com campos conhecidos | Campos diretos (`level`, `timestamp`, `service`, `message`) com mapeamento flexível de nomes |
| **Nginx/Apache access log** | Regex do combined log format | Status HTTP → severidade derivada (5xx=ERROR, 4xx=WARN, 2xx/3xx=INFO) |
| **Syslog genérico / app log** | Regex `TIMESTAMP LEVEL [service] message` | Grupos da regex |

**Justificativa:**
- "Classificação automática" ganha significado concreto e demonstrável: o usuário sobe qualquer um dos 3 formatos e o sistema entende sozinho.
- Cada parser implementa a mesma interface `LogLineParser` — adicionar um formato novo é adicionar uma classe, sem tocar no pipeline (Open/Closed).
- Severidade derivada de status HTTP mostra raciocínio de domínio, não só parsing mecânico.

**Trade-offs aceitos:** detecção por amostragem pode errar em arquivos mistos; o formato detectado é registrado no upload e reportado na UI, e linhas incompatíveis caem em `error_lines`.

---

## ADR-004 — Persistência dual: PostgreSQL + Elasticsearch

**Contexto:** dois padrões de acesso muito diferentes: (a) agregações estruturadas (volume por severidade/tempo, top serviços com erro) e (b) busca textual livre na mensagem.

**Decisão:** PostgreSQL como fonte de verdade + Elasticsearch para busca full-text.

**Justificativa:**
- **Postgres:** agregações com índices compostos e particionamento por data atendem os gráficos com queries previsíveis.
- **Elasticsearch:** busca textual com relevância e tolerância a variações — melhor que `LIKE`/`tsvector` em escala.
- O desafio não exige NoSQL, mas a **vaga** pede SQL e NoSQL — aqui o requisito é coberto com motivação técnica real, não decorativa.

**Trade-offs aceitos:**
- Dupla escrita → risco de inconsistência. Mitigação no escopo: escrita em batch com retry; produção usaria fila/CDC (ADR-007).
- **Fallback planejado:** a interface `SearchEngine` abstrai a engine. Se o tempo apertar, troca-se por Postgres full-text (`tsvector`) alterando um provider — o enunciado não exige busca distribuída, então o fallback é 100% legítimo.

---

## ADR-005 — Redis como cache de agregações

**Contexto:** os gráficos disparam as mesmas queries de agregação repetidamente.

**Decisão:** cache-aside no Redis com TTL de 60s nos endpoints de agregação, **invalidado ao concluir um upload** (novo dado relevante chegou).

**Justificativa:** dashboards toleram ~1 min de atraso; o ganho de latência compensa. Invalidação no fim do upload garante que o usuário vê o resultado do próprio arquivo imediatamente — detalhe de UX que o TTL sozinho não daria.

**Trade-offs aceitos:** cache não se aplica à busca textual (alta cardinalidade → hit rate baixo).

---

## ADR-006 — Frontend: React + scroll infinito

**Contexto:** o desafio exige ReactJS, tabela responsiva, filtros, busca, "scroll infinito ou paginação otimizada", e UX/UI é critério explícito de avaliação.

**Decisão:** React + TypeScript + Vite, TanStack Query (`useInfiniteQuery` para scroll infinito), Recharts, TailwindCSS, filtros sincronizados com a URL.

**Justificativa:**
- `useInfiniteQuery` + keyset pagination do backend = scroll infinito com custo de implementação baixo e performance constante (sem OFFSET).
- Filtros na URL → dashboard compartilhável por link (comportamento esperado de ferramenta de observabilidade, estilo Grafana/Kibana).
- UX como critério: skeletons de loading, empty states, feedback de progresso do upload (drag-and-drop com status do processamento), estados de erro em todo fetch.

**Trade-offs aceitos:** Recharts sofre com dezenas de milhares de pontos → a API sempre retorna dados agregados por bucket de tempo; o frontend nunca plota logs crus.

---

## ADR-007 — Evoluções para produção (fora do escopo, mas pensadas)

Explicitando o que é limite de escopo vs. limite de conhecimento:

1. **Ingestão assíncrona real:** fila (SQS/RabbitMQ) + workers dedicados de parsing — desacopla uploads grandes da API e resolve a dupla escrita via consumo idempotente.
2. **Ingestão contínua:** agentes (Filebeat/Fluentd) enviando para endpoint de streaming, além do upload manual.
3. **Retenção:** drop de partições no Postgres + ILM no Elasticsearch.
4. **Autenticação/RBAC:** JWT + roles.
5. **Observabilidade da própria plataforma:** Prometheus + OpenTelemetry.
6. **IaC:** Terraform para AWS (ECS Fargate, RDS, OpenSearch, ElastiCache).

---

## ADR-008 — Monorepo para a entrega (backend + frontend)

**Contexto:** o desafio pede uma aplicação única ("uma plataforma web") com código no GitHub, avaliando organização do projeto e instruções de execução. Repos separados são o padrão quando há times distintos, deploys independentes e ownership separado — nenhum dos três existe aqui.

**Decisão:** monorepo — frontend React em `web/`, backend na raiz, um `docker compose up` que sobe o stack completo.

**Justificativa:**
- Experiência de avaliação: um clone, um comando, tudo roda. Cada passo extra de setup é um ponto onde a avaliação pode falhar.
- Precedente direto no domínio: Grafana — a ferramenta de observabilidade de referência — é um monorepo com backend e frontend juntos.
- Os dois lados permanecem **separáveis**: `web/` tem `package.json`, `Dockerfile`, testes e build próprios; o único acoplamento é o `docker-compose.yml` da raiz. Extrair para dois repos seria mecânico.

**Trade-offs aceitos:** em produção com times separados, avaliaria repos por domínio (ciclo de release e permissões independentes). Mesma lógica do ADR-007: limite de escopo consciente, não limite de conhecimento.

**Nota (CORS):** a API habilita CORS aberto (`app.enableCors()`) — aceitável porque não há autenticação nem cookies no escopo (ADR-007); em produção, a lista de origens seria restrita à do dashboard.

---

## Estratégia de testes

| Camada | Ferramenta | Foco |
|---|---|---|
| Unitário | Jest | **Parsers e detector de formato** (caminho crítico: formatos válidos, linhas malformadas, timezones, arquivos mistos) |
| Integração | Supertest + Testcontainers | Upload completo de arquivo pequeno contra PG/ES reais; endpoints de consulta |
| E2E | Playwright | Upload → processamento → dado aparece no dashboard; filtrar; buscar |

O parser é onde bug corrompe dados silenciosamente — maior densidade de testes ali.

---

## Uso de IA no desenvolvimento

Conforme incentivado no desafio, usei IA como aceleração:

- **Gerado com IA (revisado por mim):** boilerplate de módulos NestJS, componentes React repetitivos, casos de teste a partir de specs que escrevi, docker-compose inicial.
- **Decisões minhas:** toda a arquitetura deste documento, modelagem de dados, estratégia de streaming e batching, detecção de formatos, trade-offs.

É o mesmo uso que faço profissionalmente: delegar o repetitivo, manter propriedade das decisões.
