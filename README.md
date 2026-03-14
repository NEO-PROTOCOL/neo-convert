# NΞØ CONVΞRT

NΞØ CONVΞRT e um produto de utilidade transacional construído para transformar tarefas de PDF e imagem em fluxo de valor. O front entrega velocidade e clareza. O backend controla upload temporario, checkout Pix, autorizacao de download e notificacoes. A interface parece uma ferramenta. A arquitetura se comporta como sistema.

## O que este repositorio entrega

- Suite web para operacoes de PDF e imagem com Next.js 16 e App Router
- Checkout Pix integrado a `FlowPay API`, sem expor segredos no cliente
- Upload temporario em `Vercel Blob` para fluxos que exigem persistencia curta
- Emails transacionais via `Mailtrap`
- Camadas de seguranca para validacao, logging, idempotencia e tokens de download
- Base preparada para monetizacao por arquivo e planos recorrentes

## Ferramentas disponiveis

Hoje o catalogo exposto no projeto inclui estas rotas:

- `compress-pdf`
- `merge-pdf`
- `split-pdf`
- `rotate-pdf`
- `delete-pages`
- `sign-pdf`
- `protect-pdf`
- `jpg-to-pdf`
- `word-to-pdf`
- `excel-to-pdf`
- `pdf-to-word`
- `compress-image`
- `ai-summary` (fluxo experimental)

## Stack

| Camada | Tecnologia | Papel no sistema |
| --- | --- | --- |
| Frontend e backend web | `Next.js 16` + `React 19` | App Router, UI, rotas de API e build |
| Manipulacao de PDF | `pdf-lib` | Operacoes client-side sempre que possivel |
| Armazenamento temporario | `@vercel/blob` | Upload e entrega segura de arquivos |
| Pagamentos | `FlowPay API` | Criacao e consulta de cobrancas Pix |
| Email transacional | `Mailtrap` | Comunicacao de checkout e confirmacao |
| Qualidade | `ESLint`, `Vitest`, `Playwright` | Lint, testes unitarios e fluxo E2E |
| Deploy | `Vercel` | Preview e producao |

## Fluxo operacional

1. O usuario seleciona uma ferramenta e envia um arquivo.
2. A aplicacao processa localmente o que puder para reduzir custo e latencia.
3. Quando o fluxo exige persistencia ou entrega protegida, o arquivo vai para `Vercel Blob`.
4. O checkout chama `POST /api/checkout`, que delega a cobranca para a `FlowPay API`.
5. O front faz polling em `GET /api/checkout/status/[chargeId]`.
6. Quando o pagamento confirma, o backend libera acesso por token temporario e dispara notificacao.

O principio aqui e simples: utilidade instantanea no front, controle economico e de risco no backend.

## Requisitos

- `Node.js >= 22`
- `pnpm`
- `make`
- Conta ou credenciais validas para `FlowPay`, `Mailtrap` e `Vercel Blob`

## Setup rapido

```bash
make install
make dev
```

O alvo `make install` instala dependencias e cria `.env.local` a partir de `.env.example` sem sobrescrever arquivo existente.

Aplicacao local:

```text
http://localhost:3000
```

## Variaveis de ambiente criticas

Copie o exemplo:

```bash
cp .env.example .env.local
```

Minimo para o sistema respirar com coerencia:

- `FLOWPAY_API_URL`
- `FLOWPAY_INTERNAL_API_KEY`
- `MAILTRAP_API_TOKEN`
- `MAILTRAP_CHECKOUT_PENDING_TEMPLATE_ID`
- `MAILTRAP_PAYMENT_SUCCESS_TEMPLATE_ID`
- `MAILTRAP_FROM_EMAIL`
- `MAILTRAP_FROM_NAME`
- `NEXT_PUBLIC_APP_URL`
- `BLOB_READ_WRITE_TOKEN`
- `DOWNLOAD_TOKEN_SECRET`
- `CRON_SECRET`

Detalhamento completo: [`docs/ENV.md`](./docs/ENV.md)

## Comandos principais

### Via Makefile

| Comando | Funcao |
| --- | --- |
| `make install` | Instala dependencias e cria `.env.local` |
| `make dev` | Sobe ambiente local |
| `make build` | Build de producao |
| `make start` | Inicia servidor apos build |
| `make lint` | Executa lint |
| `make typecheck` | Verifica tipos TypeScript |
| `make audit` | Executa auditoria de dependencias |
| `make check` | Roda `lint + typecheck + audit` |
| `make deploy-preview` | Deploy de preview na Vercel |
| `make deploy-prod` | Pipeline de verificacao + build + deploy |

### Via pnpm

| Comando | Funcao |
| --- | --- |
| `pnpm dev` | Desenvolvimento local |
| `pnpm build` | Build de producao |
| `pnpm start` | Servidor de producao |
| `pnpm lint` | Lint |
| `pnpm test` | Testes unitarios |
| `pnpm test:watch` | Testes em watch mode |
| `pnpm test:e2e` | Testes E2E com Playwright |

## Estrutura do projeto

```text
app/
  api/                  Endpoints de checkout, upload e status
  tools/                Ferramentas expostas ao usuario
  page.tsx              Landing principal
components/             Blocos de interface
lib/                    Regras de negocio, seguranca e integracoes
docs/                   Documentacao operacional
tests/                  Suite unit, integration e e2e
output/playwright/      Artefatos locais de automacao
```

## Documentacao interna

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md): stack, rotas e desenho geral
- [`docs/ENV.md`](./docs/ENV.md): variaveis e origem das chaves
- [`docs/PAYMENTS.md`](./docs/PAYMENTS.md): contrato com a `FlowPay API`
- [`docs/SECURITY.md`](./docs/SECURITY.md): controles de seguranca e hardening
- [`docs/BEST_PRACTICES.md`](./docs/BEST_PRACTICES.md): padroes de desenvolvimento
- [`docs/AUDIT_SUMMARY.md`](./docs/AUDIT_SUMMARY.md): consolidado da auditoria
- [`docs/MIGRATION.md`](./docs/MIGRATION.md): mudancas estruturais recentes
- [`docs/DEPLOY.md`](./docs/DEPLOY.md): estrategia de deploy e operacao
- [`docs/ROADMAP.md`](./docs/ROADMAP.md): direcao de produto

## Seguranca e operacao

- Segredos ficam apenas no backend ou no provedor de deploy
- Checkout nao expoe chaves da `FlowPay API` no cliente
- Downloads protegidos usam token com TTL
- Fluxos sensiveis incluem validacao de entrada, idempotencia e logs estruturados
- O webhook de pagamento permanece centralizado na stack `FlowPay`, nao neste repositorio

## Leitura rapida para quem entra agora

Se voce precisa entender o projeto sem passear em circulos:

1. Leia [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
2. Configure ambiente com [`docs/ENV.md`](./docs/ENV.md)
3. Entenda cobranca em [`docs/PAYMENTS.md`](./docs/PAYMENTS.md)
4. Revise risco e controles em [`docs/SECURITY.md`](./docs/SECURITY.md)

README bom nao e folder corporativo. E interface de decisao. Este agora cumpre melhor essa funcao.
