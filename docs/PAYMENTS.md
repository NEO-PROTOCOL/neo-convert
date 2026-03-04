# PAYMENTS.md — Integração FlowPay + Pix + Resend

## Visão Geral

O NeoConvert usa a mesma infraestrutura de pagamentos do **FlowPay**:
- **Woovi/OpenPix** → geração de cobranças Pix
- **Resend** → emails transacionais

---

## Planos e Preços

| ID | Nome | Valor (centavos) | Exibição |
|----|------|-----------------|----------|
| `starter` | NeoConvert Starter | `750` | R$ 7,50/mês |
| `pro` | NeoConvert Pro | `2900` | R$ 29/mês |
| `business` | NeoConvert Business | `7900` | R$ 79/mês |

> Definidos em `app/api/checkout/route.ts` no objeto `PLANS`.

---

## Woovi / OpenPix API

### Endpoint usado
```
POST https://api.woovi.com/api/v1/charge
```

### Payload enviado
```json
{
  "correlationID": "neoconvert-{timestamp}-{random}",
  "value": 2900,
  "comment": "NeoConvert Pro",
  "expiresIn": 3600,
  "customer": {
    "name": "Nome do usuário",
    "email": "email@exemplo.com"
  },
  "additionalInfo": [
    { "key": "Plano", "value": "NeoConvert Pro" }
  ]
}
```

### Resposta relevante
```json
{
  "charge": {
    "correlationID": "...",
    "brCode": "00020126...",
    "pixQrCode": {
      "encodedImage": "base64...",
      "payload": "00020126..."
    },
    "expiresAt": "2026-03-04T02:00:00Z"
  }
}
```

---

## Resend Email

### Template de confirmação
Enviado automaticamente após criação da cobrança com:
- QR Code em base64 (se disponível)
- Pix Copia e Cola
- ID da cobrança para referência

### From address
```
NeoConvert <no-reply@neo-convert.com>
```
> Configurar domínio no painel Resend: https://resend.com/domains

---

## TODO — Webhook de confirmação

Quando o Pix for pago, Woovi envia webhook. A implementar:

```typescript
// app/api/webhook/pix/route.ts
export async function POST(req: NextRequest) {
  // 1. Validar assinatura HMAC do Woovi
  // 2. Verificar status: "COMPLETED" | "PAID"
  // 3. Ativar assinatura do usuário no banco
  // 4. Enviar email de boas-vindas via Resend
  // 5. Retornar 200 OK
}
```

---

## Chaves necessárias

Ver [ENV.md](./ENV.md)

---

## Como testar localmente

1. Criar conta em [woovi.com](https://woovi.com) (sandbox disponível)
2. Pegar `App Id` (é a WOOVI_API_KEY)
3. Configurar `.env.local`
4. Usar Pix no modo sandbox para simular pagamento
