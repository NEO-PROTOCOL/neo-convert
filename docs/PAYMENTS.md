# PAYMENTS.md — Integração NeoConvert -> FlowPay API

## Visão Geral

O NeoConvert usa a infraestrutura central de pagamentos da stack NEO:

- **FlowPay API Edge** (`https://api.flowpay.cash`)
- O provedor Pix (Woovi/OpenPix) fica encapsulado na FlowPay API
- O NeoConvert não cria webhook Woovi próprio

---

## Oferta e Cobrança

| ID         | Nome                | Valor (centavos) | Exibição            |
| ---------- | ------------------- | ---------------- | ------------------- |
| `starter`  | NeoConvert Unitário | `750`            | R$ 7,50 por arquivo |
| `pro`      | NeoConvert Pro      | `2900`           | R$ 29/mês (reserva) |
| `business` | NeoConvert Business | `7900`           | R$ 79/mês (reserva) |

> Definidos em `app/api/checkout/route.ts` no objeto `PLANS`.

### Estratégia atual de conversão (urgência no download)

- O fluxo principal é: **upload -> processamento -> preview -> paywall -> checkout Pix -> liberação imediata do download**.
- O foco atual é o plano `starter` (unitário) para capturar intenção quente no momento do clique de download.
- O pagamento aprovado libera o download via cookie HttpOnly de autorização e sessão protegida.
- `pro` e `business` permanecem mapeados para evolução comercial futura.

---

## FlowPay API (contrato canônico)

### Endpoint usado

```link
POST https://api.flowpay.cash/api/create-charge
```

### Payload enviado

```json
{
  "wallet": "neo-convert",
  "valor": 29,
  "moeda": "BRL",
  "id_transacao": "neoconvert-{uuid}",
  "product_id": "starter",
  "customer_name": "Nome do usuário",
  "customer_email": "email@exemplo.com"
}
```

### Mapeamento de `product_id`

- Por padrão, o NeoConvert envia `starter`, `pro` ou `business`.
- Se necessário, você pode mapear por ambiente para IDs reais da FlowPay (por exemplo `btn_...`) usando:
  - `FLOWPAY_PRODUCT_ID_STARTER`
  - `FLOWPAY_PRODUCT_ID_PRO`
  - `FLOWPAY_PRODUCT_ID_BUSINESS`

### Resposta relevante

```json
{
  "success": true,
  "pix_data": {
    "correlation_id": "...",
    "br_code": "00020126...",
    "qr_code": "base64...",
    "expires_at": "2026-03-04T02:00:00Z"
  }
}
```

---

## Email transacional (Mailtrap)

### Gatilhos de e-mail

- `checkout criado` (`POST /api/checkout`): envia e-mail de cobrança pendente com QR/Pix.
- `pagamento confirmado` (`GET /api/checkout/status/:chargeId` quando `paid=true`): envia confirmação final.

### Conteúdo padrão da cobrança pendente

Enviado automaticamente após criação da cobrança com:

- QR Code em base64 (se disponível)
- Pix Copia e Cola
- ID da cobrança para referência

### From address

`NeoConvert <no-reply@neo-convert.com>`

---

## Webhook e confirmação de pagamento

- O webhook de pagamento fica centralizado na FlowPay API.
- Não criar novo webhook Woovi no `neo-convert`.
- Para UX em tempo real no front, usar polling via `GET /api/checkout/status/:chargeId` no NeoConvert.
- Essa rota proxy consulta `GET /api/charge/:id` na FlowPay API com `x-api-key` no backend (sem expor segredo no cliente).

---

## Chaves necessárias

Ver [ENV.md](./ENV.md)

---

## Como testar localmente

1. Configurar `FLOWPAY_API_URL` e `FLOWPAY_INTERNAL_API_KEY` no ambiente
2. Chamar o checkout no front (`/api/checkout`)
3. Validar resposta com `brCode`, `qrCode` e `correlationID`
4. Simular confirmação e validar transição automática para status pago e liberação de download via `/api/checkout/status/:chargeId`
