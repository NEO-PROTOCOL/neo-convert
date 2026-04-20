# ARCHITECTURE.md — Estrutura e Stack Técnica

## Stack

| Camada | Tecnologia | Motivo |
|--------|-----------|--------|
| Framework | **Next.js 16** (App Router) | SSR, API routes, Turbopack |
| Styling | **Vanilla CSS** com variáveis CSS | Zero dependências, controle total |
| Fontes | Space Grotesk + JetBrains Mono | Google Fonts — identidade NEO |
| Payments | **FlowPay API (`api.flowpay.cash`)** | Gateway único da stack NEO |
| Email | **Mailtrap** | Notificações transacionais |
| PDF Engine | **pdf-lib** | Client-side, sem servidor |
| Deploy | **Vercel** | Free tier, edge functions |
| Domínio | neo-convert.site | A confirmar |
| Storage | **Vercel Blob** | Armazenamento seguro de uploads temporários |

---

## Estrutura de Arquivos

```
neo-convert/
├── app/
│   ├── layout.tsx          # Root layout + fontes Google
│   ├── page.tsx            # Landing page principal
│   ├── globals.css         # Design system NEO completo
│   └── api/
│       └── checkout/
│           └── route.ts    # POST /api/checkout → cria cobrança Pix
│
├── components/
│   ├── Navbar.tsx          # Header fixo com blur
│   ├── UploadZone.tsx      # Drag-and-drop de arquivos
│   ├── ToolGrid.tsx        # Grid 12 ferramentas
│   ├── Pricing.tsx         # 3 planos com botão Pix
│   ├── CheckoutPageClient.tsx # Página de checkout (QR Code Pix + CPF)
│   └── Footer.tsx          # Rodapé com links
│
├── lib/                    # Utilitários (a criar)
├── docs/                   # Esta pasta
├── .env.local              # Variáveis de ambiente (não commitar!)
└── package.json
```

---

## Design System NEO

Definido em `app/globals.css` via variáveis CSS:

```css
/* Cores principais */
--bg-base: #0a0a0f;          /* fundo principal */
--bg-surface: #13131a;       /* cards */
--neo-green: #00ff9d;        /* accent primário */
--neo-purple: #a87aff;       /* accent secundário */
--text-primary: #e8e8f0;     /* texto principal */

/* Efeitos */
--neo-green-glow: 0 0 24px rgba(0, 255, 157, 0.3);
--neo-green-dim: rgba(0, 255, 157, 0.12);
--border-accent: rgba(0, 255, 157, 0.3);
```

### Classes utilitárias disponíveis
- `.neo-badge` — badge com ponto pulsante
- `.upload-zone` — área de upload com borda dashed
- `.tool-card` — card de ferramenta com hover
- `.pricing-card` — card de plano (+ `.featured`)
- `.btn-primary` — botão verde sólido
- `.btn-secondary` — botão outline
- `.neo-bg-grid` — grid de fundo sutil
- `.neo-orb` — orbe de luz ambiente
- `.glow-line` — linha verde no topo da página

---

## Fluxo de dados (Pagamento)

```
User → Pricing.tsx
  → CheckoutPageClient.tsx (form: nome + email + CPF)
    → POST /api/checkout
      → FlowPay API → cria charge Pix
      → Mailtrap → envia email QR Code
    → retorna { qrCode, brCode, correlationID }
  → exibe QR Code + Pix Copia e Cola
  → polling GET /api/checkout/status/:chargeId

[Pix pago]
  → webhook central na FlowPay API
  → NeoConvert detecta status pago via proxy local e confirma assinatura no modal
```

---

## Rotas da API

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/checkout` | Cria cobrança Pix via FlowPay API |
| `GET` | `/api/checkout/status/[chargeId]` | Consulta status da cobrança via proxy seguro para FlowPay API |
| `POST` | `/api/webhook/pix` | Legado (não é o fluxo principal) |
| `GET` | `/api/subscription/[id]` | (TODO) Status da assinatura |
| `POST` | `/api/upload-to-cloud` | Upload seguro e temporário para o Vercel Blob |
