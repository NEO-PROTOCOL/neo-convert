# ROADMAP.md — Produto #1 de 10

## 🎯 Estratégia: Portfólio de 10 Micro-SaaS

**Objetivo:** 10 produtos com renda recorrente anual que somem R$15k-30k/mês até final de 2026.  
**Modelo:** Assinatura Pix mensal · zero cartão · freemium

---

## Produto #1 — NeoConvert ← VOCÊ ESTÁ AQUI

**Status:** 🟡 Em desenvolvimento  
**Meta:** 50 assinantes Pro em 90 dias = R$1.450/mês passivo

### Sprint 1 — MVP (concluído ✅)

- [x] Landing page NEO completa
- [x] Grid de 12 ferramentas (UI)
- [x] Upload zone integrando Vercel Blob
- [x] Pricing 3 planos (R$7,50 / R$29 / R$79)
- [x] Checkout com Pix (página dedicada `CheckoutPageClient`)
- [x] API `/api/checkout` → FlowPay API
- [x] Email de confirmação via Mailtrap (Infra pronta)
- [x] Motor de OCR Scanner integrado (RapidAPI)
- [x] Retenção inteligente de arquivos (24h mobile / 1h desktop)
- [x] Documentação (`docs/`)

### Sprint 2 — Core Features (próximo)

- [ ] Conectar IA ao OCR (Resumo inteligente real)
- [ ] Ferramenta real: comprimir PDF (pdf-lib client-side)
- [ ] Ferramenta real: mesclar PDFs
- [ ] Webhook Pix → ativar assinatura automático
- [ ] Autenticação (magic link via Resend ou Mailtrap)
- [ ] Painel do usuário (histórico, downloads)
- [ ] Rate limiting por plano

### Sprint 3 — Growth

- [ ] Blog com SEO (posts sobre PDF tools)
- [ ] Google Search Console
- [ ] Pixel FB/Google Ads
- [ ] Programa de afiliados

---

## Os 10 Produtos — Master Roadmap

| #   | Produto                           | Stack base          | Status       | Meta mensal |
| --- | --------------------------------- | ------------------- | ------------ | ----------- |
| 1   | **NeoConvert** — PDF tools        | Next.js + pdf-lib   | 🟡 Em build  | R$1.5k      |
| 2   | **NeoLink** — Bio link NEO        | Next.js             | ⬜ Planejado | R$1k        |
| 3   | **NeoQR** — QR Pro analytics      | Next.js             | ⬜ Planejado | R$1.5k      |
| 4   | **NeoInvoice** — NF/Orçamento MEI | Next.js             | ⬜ Planejado | R$2k        |
| 5   | **NeoSign** — Assinatura digital  | Next.js             | ⬜ Planejado | R$3k        |
| 6   | **NeoZap** — WhatsApp scheduler   | Next.js + WA API    | ⬜ Planejado | R$5k        |
| 7   | **NeoForm** — Form builder        | Next.js             | ⬜ Planejado | R$2k        |
| 8   | **NeoResumo** — IA docs           | Next.js + AI SDK    | ⬜ Planejado | R$4k        |
| 9   | **NeoThumb** — Thumbnail AI       | Next.js + Replicate | ⬜ Planejado | R$1.5k      |
| 10  | **NeoDash** — Analytics dashboard | Next.js + charts    | ⬜ Planejado | R$5k        |

**Total potencial (50 users cada):** ~R$27k/mês

---

## Regra de ouro

> Um produto por vez. Só avançar para o #2 quando o #1 tiver
> pelo menos **10 assinantes pagantes**.

---

## Cronograma estimado

```
Mar/2026: NeoConvert MVP → primeiros usuários
Abr/2026: NeoConvert funcional + NeoLink iniciado
Mai/2026: NeoLink + NeoQR
Jun-Jul:  NeoInvoice + NeoSign (maior ticket)
Ago-Set:  NeoZap (maior potencial BR)
Out-Dez:  NeoForm + NeoResumo + NeoThumb + NeoDash
```
