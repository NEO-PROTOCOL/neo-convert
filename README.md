# NΞØ CONVΞRT

Ferramenta serverless de autoria, compressão e edição de PDFs focada em utilidade premium, monetização via Pix (FlowPay) e estética NEO.

## Stack Técnica

- **Framework**: Next.js 16 (App Router)
- **Engine PDF**: `pdf-lib` (Client-side fast rendering)
- **Armazenamento**: Vercel Blob (Seguro e temporário)
- **Notificações**: Mailtrap (Emails transacionais)
- **Checkout / Pix**: FlowPay API
- **Estilização**: CSS Modules Vanilla + Globals (Design System NEO)

## Como Iniciar

### 1. Requisitos

- Node.js >= 22.0.0
- `pnpm` gerenciador de pacotes

### 2. Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz baseado no `.env.example` e na documentação em `docs/ENV.md`:

```bash
cp .env.example .env.local
```

### 3. Instalação e Execução

```bash
make install
make dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

## Documentação

Toda documentação está localizada em `/docs`:

- **`ARCHITECTURE.md`**: Detalhes de serviços externos e roteamento
- **`SECURITY.md`**: Modelo de ameaças, controles de segurança e procedimentos ⚡ NEW
- **`BEST_PRACTICES.md`**: Guia de desenvolvimento e padrões de código ⚡ NEW
- **`AUDIT_SUMMARY.md`**: Resumo da auditoria de segurança realizada ⚡ NEW
- **`MIGRATION.md`**: Guia de migração para melhorias de segurança ⚡ NEW
- **`DEPLOY.md`**: Estratégias e Vercel CI
- **`ENV.md`**: Todas as variáveis e onde conseguir as chaves
- **`PAYMENTS.md`**: Arquitetura do módulo checkout
- **`ROADMAP.md`**: Ferramentas sendo planejadas e futuro do projeto

### 🔒 Segurança

O projeto passou por uma auditoria completa de segurança. Principais destaques:

- ✅ **Zero vulnerabilidades** em dependências npm
- ✅ **Validação de entrada** abrangente em todos os endpoints
- ✅ **Proteção CSRF** em operações de mudança de estado
- ✅ **Rate limiting** por IP e endpoint
- ✅ **Logs estruturados** com redação automática de PII
- ✅ **Tokens HMAC** com TTL de 1 hora
- ✅ **Suporte a idempotência** para prevenir duplicação

Veja `docs/SECURITY.md` para detalhes completos.

