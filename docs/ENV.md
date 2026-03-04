# ENV.md — Variáveis de Ambiente

## .env.local (desenvolvimento)

```bash
# ─── WOOVI / OPENPIX (Pix) ───────────────────────────────
# App Id do painel Woovi: https://app.woovi.com/home/applications
WOOVI_API_KEY=SUA_APP_ID_AQUI
WOOVI_API_URL=https://api.woovi.com

# Webhook secret para validar callbacks
WOOVI_WEBHOOK_SECRET=SUA_WEBHOOK_SECRET_AQUI

# ─── RESEND (Email) ──────────────────────────────────────
# Chave em: https://resend.com/api-keys
RESEND_API_KEY=re_XXXXXXXX
RESEND_FROM=NeoConvert <no-reply@neo-convert.com>

# ─── APP ─────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## .env.production (Vercel)

Configurar em: **Vercel Dashboard → Project → Settings → Environment Variables**

```bash
WOOVI_API_KEY=PROD_APP_ID
WOOVI_API_URL=https://api.woovi.com
WOOVI_WEBHOOK_SECRET=PROD_WEBHOOK_SECRET
RESEND_API_KEY=re_PROD_KEY
RESEND_FROM=NeoConvert <no-reply@neo-convert.com>
NEXT_PUBLIC_APP_URL=https://neo-convert.com
```

---

## Como obter cada chave

### Woovi (Pix)
1. Criar conta em [woovi.com](https://woovi.com)
2. Ir em **Configurações → Aplicações**
3. Criar nova aplicação → copiar `App Id`
4. Para webhook: **Configurações → Webhooks → Criar** com a URL `https://neo-convert.com/api/webhook/pix`

### Resend (Email)
1. Criar conta em [resend.com](https://resend.com)
2. Ir em **API Keys → Create API Key**
3. Adicionar domínio `neo-convert.com` em **Domains** (para produção)
4. Para teste local, usar `onboarding@resend.dev` como `from`

---

## ⚠️ Segurança

- **Nunca commitar** `.env.local` no git (já está no `.gitignore`)
- Rotacionar chaves se comprometidas
- `WOOVI_WEBHOOK_SECRET` deve ser string longa e aleatória
