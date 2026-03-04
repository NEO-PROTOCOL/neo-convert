# NeoConvert — Documentação do Projeto

> Stack NEO · FlowPay Payments · Micro-SaaS #1 do portfólio

---

## 📁 Índice

| Arquivo | Conteúdo |
|---------|----------|
| [README.md](./README.md) | Este arquivo — visão geral |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Estrutura de arquivos e stack técnica |
| [PAYMENTS.md](./PAYMENTS.md) | Integração FlowPay + Pix + Resend |
| [ROADMAP.md](./ROADMAP.md) | Roadmap de features e os 10 produtos |
| [DEPLOY.md](./DEPLOY.md) | Deploy em produção (Vercel + domínio) |
| [ENV.md](./ENV.md) | Variáveis de ambiente necessárias |

---

## 🎯 O Produto

**NeoConvert** é um SaaS de ferramentas PDF com:
- 12+ ferramentas (comprimir, mesclar, dividir, assinar, converter...)
- Design NEO (dark mode, glassmorphism, verde neon)
- Pagamentos via **Pix** usando a infraestrutura FlowPay/Woovi
- Email transacional via **Resend**
- Planos: Starter R$7,50 · Pro R$29 · Business R$79

---

## 🚀 Quick Start

```bash
# Clonar / abrir o projeto
cd ~/neomello/neo-convert

# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.local.example .env.local
# Editar .env.local com as chaves reais

# Rodar localmente
pnpm dev
# → http://localhost:3000
```

---

## 💡 Contexto de Criação

Projeto iniciado em **2026-03-04** como **produto #1** de um portfólio de 10 micro-SaaS.  
Objetivo: gerar renda passiva recorrente via assinaturas mensais Pix.

Referência visual: `pdfguru.com` (scrapeado para estudo de UX/features).  
Stack própria e código 100% original.
